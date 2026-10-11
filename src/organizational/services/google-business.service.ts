import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Organizational } from '../../shared/entities/organizational.entity';
import { UserRepository } from '../../shared/repositories/user.repository';
import { RolesUser } from '../../shared/roles/RolesUser.enum';
import {
  createSignedState,
  verifySignedState,
} from '../../shared/utils/signed-state';

/** Propósito de la firma: un `state` de este flujo no sirve para ningún otro. */
const STATE_PURPOSE = 'google-business-oauth';
/** Lo que tarda de sobra alguien en aceptar el consentimiento de Google. */
const STATE_TTL_MS = 10 * 60 * 1000;
/** Los mismos roles que el controller deja iniciar el flujo. */
const ALLOWED_ROLES: string[] = [
  RolesUser.SUPERADMIN,
  RolesUser.ADMIN,
  RolesUser.EMP,
];

/** Quien pide el enlace de consentimiento (sale del JWT, nunca del cliente). */
export interface GoogleBusinessRequester {
  userId: string;
  organizationalId?: string | null;
}

@Injectable()
export class GoogleBusinessService {
  constructor(
    @InjectRepository(Organizational)
    private readonly _orgRepo: Repository<Organizational>,
    private readonly _configService: ConfigService,
    private readonly _userRepository: UserRepository,
  ) {}

  private get _stateSecret(): string {
    return this._configService.get<string>('jwt.secret');
  }

  getOAuthUrl(
    organizationalId: string,
    requester: GoogleBusinessRequester,
  ): string {
    // Solo se puede vincular la cuenta de Google de la organización propia.
    if (
      !organizationalId ||
      !requester?.organizationalId ||
      requester.organizationalId !== organizationalId
    ) {
      throw new ForbiddenException(
        'Solo puedes conectar Google Business de tu propia organización.',
      );
    }
    const clientId = this._configService.get<string>('google.clientId');
    const callbackUrl = this._configService.get<string>('google.businessCallbackUrl');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/business.manage',
      access_type: 'offline',
      prompt: 'consent',
      state: createSignedState(
        { organizationalId, userId: requester.userId },
        this._stateSecret,
        STATE_PURPOSE,
        STATE_TTL_MS,
      ),
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * El callback llega de Google sin sesión: todo lo que sabemos de quién lo
   * inició sale del `state` firmado. Se valida ANTES de canjear el código, así
   * un `state` falso o vencido ni siquiera llega a pedir tokens.
   */
  async handleCallback(code: string, state: string): Promise<void> {
    const payload = verifySignedState(state, this._stateSecret, STATE_PURPOSE);
    if (!payload) {
      throw new ForbiddenException('El enlace de Google Business no es válido o venció.');
    }
    const organizationalId = payload.o;

    // El usuario pudo cambiar de organización o de rol desde que pidió el enlace.
    const user = await this._userRepository.findOne({
      where: { userId: payload.u },
      relations: ['roleType', 'organizational'],
    });
    if (
      !user ||
      user.organizational?.organizationalId !== organizationalId ||
      !ALLOWED_ROLES.includes(user.roleType?.code)
    ) {
      throw new ForbiddenException(
        'El usuario ya no puede conectar Google Business de esta organización.',
      );
    }

    const clientId = this._configService.get<string>('google.clientId');
    const clientSecret = this._configService.get<string>('google.clientSecret');
    const callbackUrl = this._configService.get<string>('google.businessCallbackUrl');

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokens: any = await res.json();
    if (!tokens.refresh_token) {
      throw new Error('Google no devolvió refresh_token. Revoca el acceso e intenta de nuevo.');
    }

    await this._orgRepo.update(organizationalId, {
      googleBusinessRefreshToken: tokens.refresh_token,
    });
  }

  private async _getAccessToken(refreshToken: string): Promise<string> {
    const clientId = this._configService.get<string>('google.clientId');
    const clientSecret = this._configService.get<string>('google.clientSecret');

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const data: any = await res.json();
    return data.access_token;
  }

  private async _getOrg(organizationalId: string): Promise<Organizational> {
    const org = await this._orgRepo.findOne({ where: { organizationalId } });
    if (!org) throw new NotFoundException('Organización no encontrada');
    return org;
  }

  async getStatus(organizationalId: string) {
    const org = await this._getOrg(organizationalId);
    return {
      connected: !!org.googleBusinessRefreshToken,
      accountName: org.googleBusinessAccountName ?? null,
      locationName: org.googleBusinessLocationName ?? null,
    };
  }

  async getAccounts(organizationalId: string): Promise<any[]> {
    const org = await this._getOrg(organizationalId);
    if (!org.googleBusinessRefreshToken) return [];

    const accessToken = await this._getAccessToken(org.googleBusinessRefreshToken);
    const res = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data: any = await res.json();
    if (data.error) {
      throw new Error(`Google API error: ${JSON.stringify(data.error)}`);
    }
    return data.accounts || [];
  }

  async getLocations(organizationalId: string, accountName: string): Promise<any[]> {
    const org = await this._getOrg(organizationalId);
    if (!org.googleBusinessRefreshToken) return [];

    const accessToken = await this._getAccessToken(org.googleBusinessRefreshToken);
    const res = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data: any = await res.json();
    return data.locations || [];
  }

  async saveLocation(
    organizationalId: string,
    accountName: string,
    locationName: string,
  ): Promise<void> {
    await this._orgRepo.update(organizationalId, {
      googleBusinessAccountName: accountName,
      googleBusinessLocationName: locationName,
    });
  }

  async getGoogleReviews(organizationalId: string): Promise<any[]> {
    const org = await this._getOrg(organizationalId);
    if (!org.googleBusinessRefreshToken || !org.googleBusinessLocationName) return [];

    const accessToken = await this._getAccessToken(org.googleBusinessRefreshToken);
    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${org.googleBusinessLocationName}/reviews`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data: any = await res.json();
    return data.reviews || [];
  }

  async disconnect(organizationalId: string): Promise<void> {
    await this._orgRepo.update(organizationalId, {
      googleBusinessRefreshToken: null,
      googleBusinessAccountName: null,
      googleBusinessLocationName: null,
    });
  }
}
