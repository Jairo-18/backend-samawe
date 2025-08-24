import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import * as serverless from 'serverless-http';

let cachedServer: any;

async function bootstrap() {
  if (!cachedServer) {
    const app = await NestFactory.create(AppModule, { bufferLogs: false });
    const configService = app.get(ConfigService);

    app.use(bodyParser.urlencoded({ extended: true }));

    const config = new DocumentBuilder()
      .setTitle('SAMAWE API')
      .setDescription('API for managing the web app from "SAMAWE"')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new ClassSerializerInterceptor(app.get(Reflector)),
    );

    app.enableCors({
      origin: true,
      allowedHeaders: configService.get('app.cors.allowedHeaders'),
      methods: configService.get('app.cors.allowedMethods'),
      credentials: true,
    });

    app.use(
      helmet({
        contentSecurityPolicy: false,
      }),
    );

    await app.init();
    const expressApp = app
      .getHttpAdapter()
      .getInstance() as express.Application;
    cachedServer = serverless(expressApp);
  }
  return cachedServer;
}

export default async (req: any, res: any) => {
  const server = await bootstrap();
  return server(req, res);
};
