import { MailsService } from './../../shared/services/mails.service';
import { MailTemplateService } from './../../shared/services/mail-template.service';
import { NOT_FOUND_RESPONSE } from './../../shared/constants/response.constant';
import { RecoveryPasswordBodyDto, RefreshTokenBodyDto } from '../dtos/auth.dto';
import {
  TokenPayloadModel,
  UserAuthModel,
} from '../models/authentication.model';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/services/user.service';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { AccessSessionsService } from './accessSessions.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly _userService: UserService,
    private readonly _jwtService: JwtService,
    private readonly _configService: ConfigService,
    private readonly _accessSessionsService: AccessSessionsService,
    private readonly _mailService: MailsService,
    private readonly _mailTemplateService: MailTemplateService,
  ) {}

  async signIn(credentials: Partial<UserAuthModel>) {
    const user = await this._userService.findByParams({
      email: credentials.email,
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatch = await bcrypt.compare(
      credentials.password,
      user.password,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { email: user.email, sub: user.userId, id: user.userId };

    const tokens = this.generateTokens(payload);

    if (!user.roleType) {
      throw new UnauthorizedException('El usuario no tiene un rol asignado');
    }

    const accessSessionId = await this._accessSessionsService.generateSession({
      userId: user.userId,
      accessToken: tokens.accessToken,
      id: uuidv4(),
    });

    return {
      tokens: { ...tokens },
      user: {
        userId: user.userId,
        roleType: {
          roleTypeId: user.roleType.roleTypeId,
          name: user.roleType.name,
        },
      },
      session: {
        accessSessionId,
      },
    };
  }

  async validateSession({ userId, token }: { userId: string; token: string }) {
    const user = await this._userService.findOne(userId);
    let payload;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      payload = this._jwtService.verify(token, {
        secret: this._configService.get<string>('jwt.secret'),
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      throw new UnauthorizedException('No autorizado');
    }

    if (!user) {
      throw new UnauthorizedException('No autorizado');
    }

    return user;
  }

  generateTokens(payload: TokenPayloadModel): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = this._jwtService.sign(payload, {
      expiresIn: this._configService.get('jwt.expiresIn'),
      secret: this._configService.get<string>('jwt.secret'),
    });

    const refreshToken = this._jwtService.sign(payload, {
      expiresIn: this._configService.get('jwt.refreshTokenExpiresIn'),
      secret: this._configService.get<string>('jwt.secret'),
    });

    return { accessToken, refreshToken };
  }

  async refreshToken(body: RefreshTokenBodyDto) {
    let payload;

    try {
      payload = this._jwtService.verify(body.refreshToken, {
        secret: this._configService.get<string>('jwt.secret'),
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      throw new UnauthorizedException('No autorizado');
    }

    const user = await this.validateSession({
      userId: payload.sub,
      token: body.refreshToken,
    });

    if (!user) {
      throw new UnauthorizedException('No autorizado');
    }

    const tokens = this.generateTokens({
      email: user.email,
      id: user.userId,
      sub: user.userId,
    });

    return {
      tokens: { ...tokens },
      user: {
        userId: user.userId,
        role: {
          roleId: user.roleType.roleTypeId,
          name: user.roleType.name,
        },
      },
    };
  }

  async signOut({
    userId,
    accessToken,
    accessSessionId,
  }: {
    userId: string;
    accessToken: string;
    accessSessionId: string;
  }): Promise<void> {
    const sessionExists = await this._accessSessionsService.findOneByParams({
      userId,
      accessToken,
      id: accessSessionId,
    });

    if (!sessionExists) {
      throw new NotFoundException(NOT_FOUND_RESPONSE);
    }
    await this._accessSessionsService.delete(sessionExists.id, userId);
  }

  async recoveryPassword(body: RecoveryPasswordBodyDto) {
    const user = await this._userService.findOneByParams(
      {
        where: { email: body.email },
      },
      false,
      false,
    );

    if (!user) {
      return;
    }
    const token: string = await this._userService.generateResetToken(
      user.userId,
    );
    if (user) {
      await this._mailService.sendEmail({
        to: user.email,
        subject: 'Recuperación de contraseña',
        body: this._mailTemplateService.recoveryPasswordTemplate(
          `https://samawe.netlify.app/auth/${user.userId}/change-password`,
          user.firstName,
          token,
        ),
      });
    }
  }
}
