import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/** Claves que nunca se escriben en el log (password, newPassword, refreshToken, secret…). */
const SENSITIVE_KEY = /pass(word)?|token|secret|api[-_]?key|authorization/i;

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    const requestDetails = {
      method,
      url,
      body: this.sanitizeSensitiveData(request.body),
      params: request.params,
      query: request.query,
    };

    return next.handle().pipe(
      catchError((error) => {
        this.logger.error(
          `Error in request: ${method} ${url}`,
          `Details: ${JSON.stringify(requestDetails)}`,
        );

        this.logger.error(`Error message: ${error.message}`);

        // `error.message` de un 400 de `class-validator` es siempre el genérico
        // "Bad Request Exception": el detalle por campo vive en la respuesta de
        // la excepción. Sin esto hay que ir a deducir qué falló leyendo el DTO.
        const validationDetails = this.extractValidationDetails(error);
        if (validationDetails) {
          this.logger.error(`Validation details: ${validationDetails}`);
        }

        return throwError(() => error);
      }),
    );
  }

  /**
   * Saca el detalle de validación de una `HttpException`. El `ValidationPipe`
   * de Nest responde `{ statusCode, error, message: string[] }` con un mensaje
   * por campo; otras excepciones traen un string. Devuelve `null` cuando no
   * aporta nada nuevo sobre `error.message`.
   */
  private extractValidationDetails(error: any): string | null {
    const response =
      typeof error?.getResponse === 'function'
        ? error.getResponse()
        : error?.response;

    if (!response || typeof response !== 'object') return null;

    const message = (response as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join(' · ');
    if (typeof message === 'string' && message !== error?.message) {
      return message;
    }
    return null;
  }

  /**
   * Tapa contraseñas, tokens y secretos, a cualquier profundidad. Antes solo
   * tapaba `newPassword`/`confirmNewPassword`: un login fallido dejaba la
   * contraseña tal cual en el log (`password`).
   */
  private sanitizeSensitiveData(body: any, depth = 0): any {
    if (!body || typeof body !== 'object') return body ?? null;
    if (depth > 5) return '[…]';
    if (Array.isArray(body)) {
      return body.map((v) => this.sanitizeSensitiveData(v, depth + 1));
    }
    const sanitizedBody: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      sanitizedBody[key] = SENSITIVE_KEY.test(key)
        ? '***'
        : this.sanitizeSensitiveData(value, depth + 1);
    }
    return sanitizedBody;
  }
}
