import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly _configService: ConfigService,
    private readonly _userService: UserService,
  ) {
    super({
      clientID: _configService.get<string>('google.clientId'),
      clientSecret: _configService.get<string>('google.clientSecret'),
      callbackURL: _configService.get<string>('google.callbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    const googleUser = {
      googleId: id,
      email: emails?.[0]?.value,
      firstName: name?.givenName || 'Usuario',
      lastName: name?.familyName || 'Google',
      avatarUrl: photos?.[0]?.value,
    };

    const user = await this._userService.findOrCreateGoogleUser(googleUser);
    done(null, user);
  }
}
