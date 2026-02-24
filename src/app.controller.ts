import { Controller, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import {
  HealthDocs,
  GetServerInfoDocs,
  GetRelatedDataDocs,
} from './app.decorators';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @HealthDocs()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('server-info')
  @GetServerInfoDocs()
  getServerInfo() {
    return this.appService.getServerInfo();
  }

  @Get('app/related-data')
  @UseGuards(AuthGuard())
  @GetRelatedDataDocs()
  async getRelatedData() {
    const data = await this.appService.getRelatedData();
    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }
}
