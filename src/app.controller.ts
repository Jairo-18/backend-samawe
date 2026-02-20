import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('System')
@Controller('app')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Server is healthy' })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('server-info')
  @ApiOperation({ summary: 'Get server network information' })
  @ApiResponse({
    status: 200,
    description:
      'Returns server IP addresses and port for client configuration',
  })
  getServerInfo() {
    return this.appService.getServerInfo();
  }

  @Get('related-data')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOperation({
    summary: 'Obtiene todos los catálogos/tipos en una sola llamada',
  })
  @ApiResponse({ status: 200, description: 'Catálogo unificado de tipos' })
  async getRelatedData() {
    const data = await this.appService.getRelatedData();
    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }
}
