import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

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

  private sanitizeSensitiveData(body: any): any {
    if (!body) return null;
    const sanitizedBody = { ...body };
    if (sanitizedBody.newPassword) sanitizedBody.newPassword = '***';
    if (sanitizedBody.confirmNewPassword)
      sanitizedBody.confirmNewPassword = '***';
    return sanitizedBody;
  }
}
