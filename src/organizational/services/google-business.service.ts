import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Organizational } from '../../shared/entities/organizational.entity';

@Injectable()
export class GoogleBusinessService {
  constructor(
    @InjectRepository(Organizational)
    private readonly _orgRepo: Repository<Organizational>,
    private readonly _configService: ConfigService,
  ) {}

  getOAuthUrl(organizationalId: string): string {
    const clientId = this._configService.get<string>('google.clientId');
    const callbackUrl = this._configService.get<string>('google.businessCallbackUrl');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/business.manage',
      access_type: 'offline',
      prompt: 'consent',
      state: organizationalId,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleCallback(code: string, organizationalId: string): Promise<void> {
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
