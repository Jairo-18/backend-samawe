import { Injectable } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import {
  LoginDto,
  RefreshTokenBodyDto,
  SignOutBodyDto,
} from '../dtos/auth.dto';

@Injectable()
export class AuthUC {
  constructor(private readonly authService: AuthService) {}

  async login(body: LoginDto) {
    return await this.authService.signIn(body);
  }

  async refreshToken(body: RefreshTokenBodyDto) {
    return this.authService.refreshToken(body);
  }

  async signOut(body: SignOutBodyDto) {
    return await this.authService.signOut(body);
  }
}
