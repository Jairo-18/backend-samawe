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
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { AccessSessionsService } from './accessSessions.service';
import { v4 as uuidv4 } from 'uuid';
import { UNAUTHORIZED_MESSAGE } from '../../shared/constants/messages.constant';
import { INVALID_ACCESS_DATA_MESSAGE } from '../constants/messages.constants';
import { TenantContext } from '../../tenant/tenant-context.service';
import {
  checkSessionTenant,
  effectiveOrganizationalId,
  isPlatformManager,
  SessionUserLike,
  tokenOrgIdFor,
  userOrganizationalId,
} from '../../tenant/session-tenant';
import { OrganizationalRepository } from '../../shared/repositories/organizational.repository';

/** No revela si la cuenta existe en otro hotel. */
const SESSION_OTHER_TENANT_MESSAGE = 'La sesión no corresponde a este hotel.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly _userService: UserService,
    private readonly _jwtService: JwtService,
    private readonly _configService: ConfigService,
    private readonly _accessSessionsService: AccessSessionsService,
    private readonly _mailService: MailsService,
    private readonly _mailTemplateService: MailTemplateService,
    private readonly _tenant: TenantContext,
    private readonly _organizationalRepository: OrganizationalRepository,
  ) {}

  /**
   * Para administradores de plataforma: la petición opera en la organización
   * elegida con el selector (la del token). Se fija como hotel de la petición y
   * se refleja en `req.user.organizationalId`, que es lo que leen los módulos
   * que ya filtran por el usuario (ganancias, etc.). La propia queda en
   * `homeOrganizationalId`. Para cualquier otro usuario no cambia nada.
   */
  applyEffectiveOrganization<T extends SessionUserLike>(
    user: T,
    tokenOrgId?: string | null,
  ): T & { homeOrganizationalId?: string | null; isActingOrganization?: boolean } {
    const out = user as T & {
      homeOrganizationalId?: string | null;
      isActingOrganization?: boolean;
    };
    if (!isPlatformManager(user)) return out;

    const home = userOrganizationalId(user);
    const effective = effectiveOrganizationalId(user, tokenOrgId, this._tenant.tenant);
    if (!effective) return out;

    this._tenant.actAs(effective);
    out.homeOrganizationalId = home;
    out.isActingOrganization = effective !== home;
    out.organizationalId = effective;
    return out;
  }

  /**
   * Selector "Cambiar de organización" (solo administradores de plataforma):
   * emite un token nuevo que opera en `organizationalId`. Volver a la propia es
   * lo mismo con su id.
   */
  async switchOrganization(
    user: SessionUserLike & { userId: string; email?: string },
    currentAccessToken: string,
    organizationalId: string,
  ) {
    if (!isPlatformManager(user)) {
      throw new ForbiddenException('Solo un super administrador puede cambiar de organización.');
    }
    const org = await this._organizationalRepository.findOne({
      where: { organizationalId },
    });
    if (!org) {
      throw new NotFoundException('Organización no encontrada');
    }

    const homeOrganizationalId =
      (user as { homeOrganizationalId?: string | null }).homeOrganizationalId ??
      userOrganizationalId(user);
    const tokens = this.generateTokens({
      email: user.email,
      sub: user.userId,
      id: user.userId,
      orgId: org.organizationalId,
    });
    await this._accessSessionsService.replaceAccessToken(
      user.userId,
      currentAccessToken,
      tokens.accessToken,
    );
    // Queda en el log quién entró a qué organización.
    this.logger.warn(
      `Cambio de organización: usuario ${user.userId} → ${org.slug} (${org.organizationalId}).`,
    );

    return {
      tokens,
      organization: {
        organizationalId: org.organizationalId,
        name: org.name,
        slug: org.slug,
      },
      homeOrganizationalId,
      isActingOrganization: org.organizationalId !== homeOrganizationalId,
    };
  }

  /** ¿Pertenece el usuario al hotel de esta petición? (login, Google). */
  private _belongsToTenant(user: SessionUserLike): boolean {
    const check = checkSessionTenant(user, undefined, this._tenant.tenant);
    if (!check.ok) {
      this.logger.warn(`Acceso rechazado por hotel (${check.reason}).`);
    }
    return check.ok;
  }

  /**
   * La sesión (usuario + token) tiene que ser del hotel del host. Se usa en la
   * estrategia JWT y en el refresh: un token del hotel A no abre el hotel B.
   */
  assertSessionTenant(user: SessionUserLike, tokenOrgId?: string | null): void {
    const check = checkSessionTenant(user, tokenOrgId, this._tenant.tenant);
    if (!check.ok) {
      this.logger.warn(`Sesión rechazada por hotel (${check.reason}).`);
      throw new ForbiddenException(SESSION_OTHER_TENANT_MESSAGE);
    }
  }

  async signIn(credentials: Partial<UserAuthModel>) {
    const user = await this._userService.findByParams({
      email: credentials.email,
    });

    if (!user) {
      throw new UnauthorizedException(INVALID_ACCESS_DATA_MESSAGE);
    }

    const passwordMatch = await bcrypt.compare(
      credentials.password,
      user.password,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException(INVALID_ACCESS_DATA_MESSAGE);
    }

    // Una cuenta de otro hotel no existe para este: mismo mensaje que una
    // contraseña mala, para no revelar que el correo está registrado en otro.
    if (!this._belongsToTenant(user)) {
      throw new UnauthorizedException(INVALID_ACCESS_DATA_MESSAGE);
    }

    if (user.isBanned) {
      throw new UnauthorizedException(
        'Tu cuenta ha sido suspendida. Contacta al administrador.',
      );
    }

    if (!user.isEmailVerified) {
      const tokenExpired =
        !user.emailVerificationTokenExpiry ||
        user.emailVerificationTokenExpiry < new Date();
      throw new UnauthorizedException(
        tokenExpired
          ? 'Tu enlace de verificación expiró. Vuelve a registrarte.'
          : 'Debes verificar tu correo electrónico antes de iniciar sesión.',
      );
    }

    const payload = {
      email: user.email,
      sub: user.userId,
      id: user.userId,
      orgId: tokenOrgIdFor(user),
    };

    const tokens = this.generateTokens(payload);

    if (!user.roleType) {
      throw new UnauthorizedException('El usuario no tiene un rol asignado');
    }

    const accessSessionId = await this._accessSessionsService.generateSession({
      userId: user.userId,
      accessToken: tokens.accessToken,
      id: uuidv4(),
      organizationalId: user.organizational?.organizationalId ?? undefined,
    });

    return {
      tokens: { ...tokens },
      user: {
        userId: user.userId,
        roleType: {
          roleTypeId: user.roleType.roleTypeId,
          name: user.roleType.name,
          code: user.roleType.code,
        },
        organizationalId: user.organizational?.organizationalId ?? null,
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
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    if (!user) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
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
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    const user = await this.validateSession({
      userId: payload.sub,
      token: body.refreshToken,
    });

    if (!user) {
      throw new UnauthorizedException(UNAUTHORIZED_MESSAGE);
    }

    this.assertSessionTenant(user, payload.orgId);

    // Un administrador de plataforma "dentro" de otra organización sigue en
    // ella al refrescar; cualquier otro, en la suya.
    const tokens = this.generateTokens({
      email: user.email,
      id: user.userId,
      sub: user.userId,
      orgId:
        isPlatformManager(user) && payload.orgId
          ? payload.orgId
          : tokenOrgIdFor(user),
    });

    return {
      tokens: { ...tokens },
      user: {
        userId: user.userId,
        role: {
          roleId: user.roleType.roleTypeId,
          name: user.roleType.name,
        },
        organizationalId: user.organizationalId ?? null,
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
        relations: ['organizational', 'organizational.medias', 'organizational.medias.mediaType'],
      },
      false,
      false,
    );

    if (!user) {
      return;
    }
    // Igual que si no existiera: no se manda correo a una cuenta de otro hotel.
    if (!this._belongsToTenant(user)) {
      return;
    }
    const token: string = await this._userService.generateResetToken(
      user.userId,
    );
    const frontendUrl =
      this._configService.get<string>('APP_FRONTEND_URL') ||
      'https://samawe.netlify.app';

    if (user) {
      await this._mailService.sendEmail({
        to: user.email,
        subject: 'Recuperación de contraseña',
        body: this._mailTemplateService.recoveryPasswordTemplate(
          `${frontendUrl}/auth/${user.userId}/change-password`,
          user.firstName,
          user.lastName,
          token,
          user.organizational?.name,
          user.organizational?.primaryColor || undefined,
          user.organizational?.medias?.find((m) => m.mediaType?.code === 'LOGO')?.url || undefined,
          user.organizational?.bgSecondaryColor || undefined,
        ),
      });
    }
  }

  async googleSignIn(user: any) {
    if (!user) {
      throw new UnauthorizedException('No se pudo autenticar con Google');
    }

    if (user.isBanned) {
      throw new UnauthorizedException(
        'Tu cuenta ha sido suspendida. Contacta al administrador.',
      );
    }

    if (!this._belongsToTenant(user)) {
      throw new UnauthorizedException(SESSION_OTHER_TENANT_MESSAGE);
    }

    const payload = {
      email: user.email,
      sub: user.userId,
      id: user.userId,
      orgId: tokenOrgIdFor(user),
    };

    const tokens = this.generateTokens(payload);

    const accessSessionId = await this._accessSessionsService.generateSession({
      userId: user.userId,
      accessToken: tokens.accessToken,
      id: uuidv4(),
      organizationalId: user.organizational?.organizationalId ?? undefined,
    });

    return {
      tokens,
      user: {
        userId: user.userId,
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email ?? '',
        isNewUser: user.identificationNumber?.startsWith('GOOGLE-') ?? false,
        roleType: {
          roleTypeId: user.roleType?.roleTypeId,
          name: user.roleType?.name,
          code: user.roleType?.code,
        },
        organizationalId: user.organizational?.organizationalId ?? null,
        avatarUrl: user.avatarUrl ?? null,
      },
      session: { accessSessionId },
    };
  }
}
