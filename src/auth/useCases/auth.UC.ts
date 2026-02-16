import { Injectable } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import {
  LoginDto,
  RecoveryPasswordBodyDto,
  RefreshTokenBodyDto,
  SignOutBodyDto,
} from '../dtos/auth.dto';

@Injectable()
export class AuthUC {
  constructor(private readonly _authService: AuthService) {}

  async login(body: LoginDto) {
    return await this._authService.signIn(body);
  }

  async refreshToken(body: RefreshTokenBodyDto) {
    return this._authService.refreshToken(body);
  }

  async signOut(body: SignOutBodyDto) {
    return await this._authService.signOut(body);
  }

  async recoveryPassword(body: RecoveryPasswordBodyDto) {
    return await this._authService.recoveryPassword(body);
  }
}
