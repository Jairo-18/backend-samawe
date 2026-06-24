import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkipApiKey } from '../../shared/decorators/skip-api-key.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';
import { FactusAuthService } from '../services/factus-auth.service';

@ApiTags('Factus - Auth')
@ApiBearerAuth()
@SkipApiKey()
@UseGuards(AuthGuard(), RolesGuard)
@Roles(
  RolesUser.SUPERADMIN,
  RolesUser.ADMIN,
  RolesUser.PRO,
  RolesUser.CHE,
  RolesUser.MES,
  RolesUser.EMP,
) // Todos menos USER
@Controller('factus/auth')
export class FactusAuthController {
  constructor(private readonly authService: FactusAuthService) {}

  @Get('test')
  @ApiOperation({ summary: 'Test Factus OAuth2 password grant' })
  async testAuth() {
    const tokenData = await this.authService.getToken();
    return {
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      access_token_preview: tokenData.access_token.substring(0, 20) + '...',
    };
  }

  @Get('refresh-test')
  @ApiOperation({ summary: 'Test Factus token refresh flow' })
  async testRefresh() {
    const current = this.authService.getStoredTokenData();

    if (!current) {
      await this.authService.getToken();
      return { message: 'No stored token found — fetched fresh token', refreshed: false };
    }

    const refreshed = await this.authService.refreshToken(current.refresh_token);
    return {
      message: 'Token refreshed successfully',
      token_type: refreshed.token_type,
      expires_in: refreshed.expires_in,
      access_token_preview: refreshed.access_token.substring(0, 20) + '...',
    };
  }

  @Get('valid-token-test')
  @ApiOperation({ summary: 'Test getValidToken() — uses cache or refreshes automatically' })
  async testValidToken() {
    const token = await this.authService.getValidToken();
    const stored = this.authService.getStoredTokenData();
    const secondsLeft = stored
      ? Math.round((stored.expires_at - Date.now()) / 1000)
      : null;

    return {
      access_token_preview: token.substring(0, 20) + '...',
      expires_in_seconds: secondsLeft,
    };
  }
}
