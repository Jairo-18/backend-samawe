import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';
import { REDIS_CLIENT, RedisOrNull } from '../../redis/redis.module';
import { DocumentLockService } from '../../shared/services/documentLock.service';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp ms
  token_type: string;
  expires_in: number;
}

/** Clave del token compartido en Redis. */
const TOKEN_KEY = 'samawe:factus:token';

@Injectable()
export class FactusAuthService {
  private readonly logger = new Logger(FactusAuthService.name);

  // Copia local del token. Con Redis es solo una CACHÉ de lo que está en
  // Redis: evita una ida y vuelta por cada request mientras el token siga
  // vigente. Sin Redis es la única fuente, como antes.
  private tokenData: TokenData | null = null;

  // Promesa "en vuelo" para deduplicar refresh/obtención concurrente de token.
  // Sin esto, N requests simultáneos tras un reinicio o cerca de la expiración
  // dispararían N grants password/refresh a la vez — con refresh_token rotativo
  // eso causa carreras y 401 en cascada.
  //
  // Solo cubre ESTA instancia; entre instancias lo cubre el lock de abajo.
  private inflightToken: Promise<string> | null = null;

  private get baseUrl(): string {
    return this.configService.get<string>('FACTUS_BASE_URL');
  }
  private get clientId(): string {
    return this.configService.get<string>('FACTUS_CLIENT_ID');
  }
  private get clientSecret(): string {
    return this.configService.get<string>('FACTUS_CLIENT_SECRET');
  }
  private get username(): string {
    return this.configService.get<string>('FACTUS_USERNAME');
  }
  private get password(): string {
    return this.configService.get<string>('FACTUS_PASSWORD');
  }

  constructor(
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: RedisOrNull,
    private readonly documentLock: DocumentLockService,
  ) {}

  /**
   * Guarda el token donde puedan verlo todas las instancias.
   *
   * ⚠️ **Esta es la razón de fondo para tener Redis.** El `refresh_token` de
   * Factus es **rotativo**: cada refresh invalida el anterior. Con dos
   * instancias, cada una con su copia en memoria, la segunda que refresque usa
   * un `refresh_token` que la primera ya quemó → 401 en cascada y ninguna puede
   * emitir. No es un problema de rendimiento: es que la facturación deja de
   * funcionar.
   *
   * El TTL acompaña al vencimiento del propio token, así que Redis nunca sirve
   * uno caducado.
   */
  private async storeToken(data: TokenData): Promise<TokenData> {
    this.tokenData = data;
    if (!this.redis) return data;
    try {
      const ttlMs = Math.max(data.expires_at - Date.now(), 1_000);
      await this.redis.set(TOKEN_KEY, JSON.stringify(data), 'PX', ttlMs);
    } catch (error) {
      // No se relanza: el token es válido y esta instancia puede seguir
      // usándolo desde memoria. Solo se pierde el compartirlo.
      this.logger.error(
        `No se pudo guardar el token de Factus en Redis: ${(error as Error).message}`,
      );
    }
    return data;
  }

  /** Lee el token compartido. `null` si no hay Redis o no hay nada guardado. */
  private async loadSharedToken(): Promise<TokenData | null> {
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(TOKEN_KEY);
      return raw ? (JSON.parse(raw) as TokenData) : null;
    } catch (error) {
      this.logger.error(
        `No se pudo leer el token de Factus de Redis: ${(error as Error).message}`,
      );
      return null;
    }
  }

  async getToken(): Promise<TokenData> {
    const form = new FormData();
    form.append('grant_type', 'password');
    form.append('client_id', this.clientId);
    form.append('client_secret', this.clientSecret);
    form.append('username', this.username);
    form.append('password', this.password);

    try {
      const response = await axios.post(`${this.baseUrl}/oauth/token`, form, {
        headers: {
          ...form.getHeaders(),
          Accept: 'application/json',
        },
      });

      const data = response.data;
      const stored = await this.storeToken({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        expires_at: Date.now() + data.expires_in * 1000,
      });

      this.logger.log('Factus token obtained successfully');
      return stored;
    } catch (error) {
      const status = error.response?.status;
      const body = error.response?.data;
      this.logger.error(`Failed to obtain Factus token. Status: ${status}`);
      this.logger.error(`Response body: ${JSON.stringify(body)}`);
      throw new Error(`Factus authentication failed: ${status} - ${JSON.stringify(body)}`);
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenData> {
    const form = new FormData();
    form.append('grant_type', 'refresh_token');
    form.append('client_id', this.clientId);
    form.append('client_secret', this.clientSecret);
    form.append('refresh_token', refreshToken);

    try {
      const response = await axios.post(`${this.baseUrl}/oauth/token`, form, {
        headers: {
          ...form.getHeaders(),
          Accept: 'application/json',
        },
      });

      const data = response.data;
      const stored = await this.storeToken({
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? refreshToken,
        token_type: data.token_type,
        expires_in: data.expires_in,
        expires_at: Date.now() + data.expires_in * 1000,
      });

      this.logger.log('Factus token refreshed successfully');
      return stored;
    } catch (error) {
      const status = error.response?.status;
      const body = error.response?.data;
      this.logger.error(`Failed to refresh Factus token. Status: ${status}`);
      this.logger.error(`Response body: ${JSON.stringify(body)}`);
      throw new Error(`Factus token refresh failed: ${status} - ${JSON.stringify(body)}`);
    }
  }

  async getValidToken(): Promise<string> {
    // Token vigente en memoria: devolución inmediata sin tocar la red.
    const cached = this.tokenData;
    if (cached && this.isFresh(cached)) {
      return cached.access_token;
    }

    // Si ya hay una obtención/refresh en curso, todos los requests concurrentes
    // esperan la MISMA promesa en vez de disparar grants en paralelo.
    if (this.inflightToken) {
      return this.inflightToken;
    }

    this.inflightToken = this.acquireToken().finally(() => {
      this.inflightToken = null;
    });
    return this.inflightToken;
  }

  /**
   * Vigente con margen: se renueva si le quedan menos de 60 s.
   *
   * Devuelve `boolean` y NO un type guard (`data is TokenData`) a propósito:
   * con el guard, la rama negativa estrechaba la variable a `null` para todo el
   * resto del bloque y TypeScript dejaba de ver sus campos, aunque más abajo se
   * usara solo como portadora del `refresh_token`.
   */
  private isFresh(data: TokenData): boolean {
    const EXPIRY_BUFFER_MS = 60_000;
    return data.expires_at - Date.now() >= EXPIRY_BUFFER_MS;
  }

  /**
   * Obtiene o renueva el token, serializado **entre instancias**.
   *
   * El lock es lo que hace que esto sea seguro con más de un backend: el
   * `refresh_token` de Factus es rotativo, así que dos instancias refrescando a
   * la vez se invalidan la una a la otra. Con el lock, la segunda espera, y al
   * entrar se encuentra el token nuevo ya en Redis y **ni siquiera llama a
   * Factus** — por eso se relee dentro del lock.
   */
  private async acquireToken(): Promise<string> {
    return this.documentLock.withLock('invoice', 'factus-token', async () => {
      // Doble comprobación dentro del lock: mientras esperábamos, otra
      // instancia (o este mismo proceso) pudo dejarlo renovado.
      const shared = await this.loadSharedToken();
      if (shared && this.isFresh(shared)) {
        this.tokenData = shared;
        return shared.access_token;
      }

      const local = this.tokenData;
      if (local && this.isFresh(local)) {
        return local.access_token;
      }

      // El `refresh_token` bueno es el compartido, no el que tenga esta
      // instancia en memoria: si otra ya refrescó, el nuestro está quemado.
      const current = shared ?? local;

      if (!current) {
        this.logger.log('Sin token disponible — pidiendo uno nuevo');
        const fresh = await this.getToken();
        return fresh.access_token;
      }

      const timeUntilExpiry = current.expires_at - Date.now();
      this.logger.log(
        `Token expira en ${Math.round(timeUntilExpiry / 1000)}s — renovando`,
      );
      try {
        const refreshed = await this.refreshToken(current.refresh_token);
        return refreshed.access_token;
      } catch {
        this.logger.warn(
          'El refresh falló — pidiendo token nuevo con password grant',
        );
        const fresh = await this.getToken();
        return fresh.access_token;
      }
    });
  }

  getStoredTokenData(): TokenData | null {
    return this.tokenData;
  }
}
