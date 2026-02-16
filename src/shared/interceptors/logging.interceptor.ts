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

        return throwError(() => error);
      }),
    );
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
