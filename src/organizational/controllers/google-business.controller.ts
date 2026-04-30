import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GoogleBusinessService } from '../services/google-business.service';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';

@Controller('organizational/google-business')
@ApiTags('Google Business')
@ApiBearerAuth()
@UseGuards(AuthGuard(), RolesGuard)
@Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN, RolesUser.EMP)
export class GoogleBusinessController {
  constructor(private readonly _gbService: GoogleBusinessService) {}

  @Get('oauth-url')
  getOAuthUrl(@Query('organizationalId') organizationalId: string) {
    const url = this._gbService.getOAuthUrl(organizationalId);
    return { statusCode: HttpStatus.OK, data: { url } };
  }

  @Get('status')
  async getStatus(@Query('organizationalId') organizationalId: string) {
    const status = await this._gbService.getStatus(organizationalId);
    return { statusCode: HttpStatus.OK, data: status };
  }

  @Get('accounts')
  async getAccounts(@Query('organizationalId') organizationalId: string) {
    const accounts = await this._gbService.getAccounts(organizationalId);
    return { statusCode: HttpStatus.OK, data: accounts };
  }

  @Get('locations')
  async getLocations(
    @Query('organizationalId') organizationalId: string,
    @Query('accountName') accountName: string,
  ) {
    const locations = await this._gbService.getLocations(
      organizationalId,
      accountName,
    );
    return { statusCode: HttpStatus.OK, data: locations };
  }

  @Patch('location')
  async saveLocation(
    @Body()
    body: {
      organizationalId: string;
      accountName: string;
      locationName: string;
    },
  ) {
    await this._gbService.saveLocation(
      body.organizationalId,
      body.accountName,
      body.locationName,
    );
    return {
      message: 'api.google_business.saved',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete('disconnect')
  async disconnect(@Query('organizationalId') organizationalId: string) {
    await this._gbService.disconnect(organizationalId);
    return {
      message: 'api.google_business.disconnected',
      statusCode: HttpStatus.OK,
    };
  }
}
