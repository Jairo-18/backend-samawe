import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SKIP_API_KEY } from '../decorators/skip-api-key.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_API_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) return true;

    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest();

    // Swagger, archivos estáticos y WebSocket no requieren API key
    const path: string = request.path || '';
    if (
      path.startsWith('/docs') ||
      path.startsWith('/uploads') ||
      path.startsWith('/socket.io')
    ) return true;
    const clientKey = request.headers['x-client-key'];
    const expectedKey = this.configService.get<string>('app.clientApiKey');

    if (!clientKey || clientKey !== expectedKey) {
      throw new UnauthorizedException('API key inválida o ausente');
    }

    return true;
  }
}
