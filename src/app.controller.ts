import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
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
}
