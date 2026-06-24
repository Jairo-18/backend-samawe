import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { FactusAuthService } from './services/factus-auth.service';
import { FactusApiError } from './errors/factus-api.error';

@Injectable()
export class FactusClient implements OnModuleInit {
  private readonly logger = new Logger(FactusClient.name);
  private client: AxiosInstance;

  // Límites para el manejo de 429 (rate limit): máximo de reintentos y tope al
  // backoff para no bloquear el request 60s+ ni reintentar indefinidamente.
  private static readonly MAX_429_RETRIES = 3;
  private static readonly MAX_429_BACKOFF_SECONDS = 30;

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: FactusAuthService,
  ) {}

  onModuleInit() {
    // Validación temprana de configuración: si falta una env crítica preferimos
    // fallar al arrancar (fail-fast) y no en mitad de una emisión a la DIAN.
    const required = [
      'FACTUS_BASE_URL',
      'FACTUS_CLIENT_ID',
      'FACTUS_CLIENT_SECRET',
      'FACTUS_USERNAME',
      'FACTUS_PASSWORD',
    ];
    const missing = required.filter((key) => !this.configService.get<string>(key));
    if (missing.length) {
      throw new Error(
        `Configuración Factus incompleta. Faltan variables de entorno: ${missing.join(', ')}`,
      );
    }

    const baseURL = this.configService.get<string>('FACTUS_BASE_URL');

    this.client = axios.create({
      baseURL,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      timeout: 30_000,
    });

    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await this.authService.getValidToken();
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const remaining = response.headers['x-ratelimit-remaining'];
        if (remaining !== undefined && Number(remaining) < 5) {
          this.logger.warn(`Factus rate limit low: ${remaining} requests remaining`);
        }
        return response;
      },
      async (error) => {
        const originalRequest: AxiosRequestConfig & { _retry?: boolean } = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          this.logger.warn('Received 401 — attempting token refresh and retry');
          try {
            const tokenData = this.authService.getStoredTokenData();
            if (tokenData) {
              await this.authService.refreshToken(tokenData.refresh_token);
            } else {
              await this.authService.getToken();
            }
            const newToken = await this.authService.getValidToken();
            (originalRequest as any).headers = {
              ...(originalRequest as any).headers,
              Authorization: `Bearer ${newToken}`,
            };
            return this.client.request(originalRequest);
          } catch (refreshError) {
            this.logger.error('Token refresh failed on 401 retry');
            return Promise.reject(refreshError);
          }
        }

        if (error.response?.status === 429) {
          const req = originalRequest as AxiosRequestConfig & { _retryCount?: number };
          req._retryCount = (req._retryCount ?? 0) + 1;

          if (req._retryCount > FactusClient.MAX_429_RETRIES) {
            this.logger.error(
              `Rate limit (429) persistente tras ${FactusClient.MAX_429_RETRIES} reintentos — abortando`,
            );
            const status = error.response?.status;
            const data = error.response?.data;
            const message = (data as any)?.message ?? error.message;
            throw new FactusApiError(status, data, `Factus API error ${status}: ${message}`);
          }

          const retryAfter = Number(error.response.headers['retry-after']);
          const requested = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 5;
          // Tope al backoff para no bloquear el request indefinidamente.
          const waitSeconds = Math.min(requested, FactusClient.MAX_429_BACKOFF_SECONDS);
          this.logger.warn(
            `Rate limit (429). Retry-After: ${retryAfter || 'n/a'}s — esperando ${waitSeconds}s ` +
              `(intento ${req._retryCount}/${FactusClient.MAX_429_RETRIES})`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
          return this.client.request(originalRequest);
        }

        const status = error.response?.status;
        const data = error.response?.data;
        const message = (data as any)?.message ?? error.message;
        this.logger.error(`Factus API error: ${status} — ${JSON.stringify(data)}`);
        throw new FactusApiError(status, data, `Factus API error ${status}: ${message}`);
      },
    );
  }

  getAxiosInstance(): AxiosInstance {
    return this.client;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }
}
