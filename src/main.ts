// eslint-disable-next-line @typescript-eslint/no-require-imports
import basicAuth = require('express-basic-auth');
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as bodyParser from 'body-parser';
import { join } from 'path';
import { Express } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const express = require('express');
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { ExpressAdapter } from '@nestjs/platform-express';

// Variable para almacenar la instancia de la app en Vercel
let cachedApp: Express;

async function createApp(): Promise<Express> {
  // Si ya existe una instancia cachada, la devolvemos (importante para Vercel)
  if (cachedApp) {
    return cachedApp;
  }

  const expressServer = express();
  const adapter = new ExpressAdapter(expressServer);

  const app = await NestFactory.create(AppModule, adapter, {
    bufferLogs: false,
  });

  app.use(bodyParser.urlencoded({ extended: true }));
  const configService = app.get(ConfigService);
  const swaggerUser = configService.get<string>('swagger.user');
  const swaggerPassword = configService.get<string>('swagger.password');

  app.use(
    '/docs',
    basicAuth({
      challenge: true,
      users: { [swaggerUser]: swaggerPassword },
    }),
  );

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

  const allowedHeaders = configService.get('app.cors.allowedHeaders');
  const allowedMethods = configService.get('app.cors.allowedMethods');

  app.enableCors({
    origin: true,
    allowedHeaders,
    methods: allowedMethods,
    credentials: true,
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.use(
    '/docs',
    express.static(join(__dirname, '../node_modules/swagger-ui-dist')),
  );

  await app.init();

  // Cachear la app para Vercel
  cachedApp = expressServer;
  return expressServer;
}

// Función bootstrap para desarrollo local
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  app.use(bodyParser.urlencoded({ extended: true }));
  const configService = app.get(ConfigService);
  const swaggerUser = configService.get<string>('swagger.user');
  const swaggerPassword = configService.get<string>('swagger.password');

  app.use(
    '/docs',
    basicAuth({
      challenge: true,
      users: { [swaggerUser]: swaggerPassword },
    }),
  );

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

  const allowedHeaders = configService.get('app.cors.allowedHeaders');
  const allowedMethods = configService.get('app.cors.allowedMethods');

  app.enableCors({
    origin: true,
    allowedHeaders,
    methods: allowedMethods,
    credentials: true,
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );

  app.use(
    '/docs',
    express.static(join(__dirname, '../node_modules/swagger-ui-dist')),
  );

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);
  console.log(
    `🚀 App corriendo en el puerto ${port} [${configService.get('app.env')}]`,
  );
}

// Ejecutar bootstrap solo si no estamos en Vercel
if (process.env.VERCEL !== '1') {
  bootstrap();
}

// Export por defecto para Vercel
export default async (req: any, res: any) => {
  const server = await createApp();
  return server(req, res);
};
