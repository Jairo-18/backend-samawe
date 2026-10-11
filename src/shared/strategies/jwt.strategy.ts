import { TokenPayloadModel } from './../../auth/models/authentication.model';
import { AuthService } from '../../auth/services/auth.service';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { UNAUTHORIZED_MESSAGE } from '../constants/messages.constant';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('jwt.secret'),
      passReqToCallback: true,
    });
  }

  async validate(req, payload: TokenPayloadModel): Promise<any> {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    const user = await this.authService.validateSession({
      userId: payload.sub,
      token,
    });

    if (!user) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    // El usuario y el token tienen que ser del hotel del host (403 si no).
    this.authService.assertSessionTenant(user, payload.orgId);

    // Super administrador con otra organización elegida: la petición opera en
    // ella (no cambia nada para el resto de usuarios).
    return this.authService.applyEffectiveOrganization(user, payload.orgId);
  }
}
