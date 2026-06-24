import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp ms
  token_type: string;
  expires_in: number;
}

@Injectable()
export class FactusAuthService {
  private readonly logger = new Logger(FactusAuthService.name);

  // NOTA: el token vive solo en memoria de esta instancia. Se pierde en cada
  // reinicio/redeploy (el primer request post-reinicio siempre re-autentica) y
  // NO se comparte entre instancias. Es aceptable para un despliegue
  // single-instance; si se escala horizontalmente hay que persistirlo en un
  // almacén compartido (Redis/BD) para evitar re-autenticaciones y carreras de refresh.
  private tokenData: TokenData | null = null;

  // Promesa "en vuelo" para deduplicar refresh/obtención concurrente de token.
  // Sin esto, N requests simultáneos tras un reinicio o cerca de la expiración
  // dispararían N grants password/refresh a la vez — con refresh_token rotativo
  // eso causa carreras y 401 en cascada.
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

  constructor(private readonly configService: ConfigService) {}

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
      this.tokenData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        expires_at: Date.now() + data.expires_in * 1000,
      };

      this.logger.log('Factus token obtained successfully');
      return this.tokenData;
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
      this.tokenData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? refreshToken,
        token_type: data.token_type,
        expires_in: data.expires_in,
        expires_at: Date.now() + data.expires_in * 1000,
      };

      this.logger.log('Factus token refreshed successfully');
      return this.tokenData;
    } catch (error) {
      const status = error.response?.status;
      const body = error.response?.data;
      this.logger.error(`Failed to refresh Factus token. Status: ${status}`);
      this.logger.error(`Response body: ${JSON.stringify(body)}`);
      throw new Error(`Factus token refresh failed: ${status} - ${JSON.stringify(body)}`);
    }
  }

  async getValidToken(): Promise<string> {
    const EXPIRY_BUFFER_MS = 60_000; // refresh if <60s remaining

    // Token vigente: devolución inmediata sin tocar la red.
    if (this.tokenData && this.tokenData.expires_at - Date.now() >= EXPIRY_BUFFER_MS) {
      return this.tokenData.access_token;
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

  private async acquireToken(): Promise<string> {
    if (!this.tokenData) {
      this.logger.log('No token in memory — fetching new token');
      await this.getToken();
      return this.tokenData.access_token;
    }

    const timeUntilExpiry = this.tokenData.expires_at - Date.now();
    this.logger.log(`Token expiring in ${Math.round(timeUntilExpiry / 1000)}s — refreshing`);
    try {
      await this.refreshToken(this.tokenData.refresh_token);
    } catch {
      this.logger.warn('Refresh failed — fetching new token via password grant');
      await this.getToken();
    }

    return this.tokenData.access_token;
  }

  getStoredTokenData(): TokenData | null {
    return this.tokenData;
  }
}
