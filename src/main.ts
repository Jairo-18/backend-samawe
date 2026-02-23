import * as nodeCrypto from 'node:crypto';

if (!globalThis.crypto) {
  // @ts-ignore
  globalThis.crypto = nodeCrypto;
} else {
  if (!(globalThis.crypto as any).randomUUID) {
    (globalThis.crypto as any).randomUUID = nodeCrypto.randomUUID;
  }
  if (!(globalThis.crypto as any).randomBytes) {
    (globalThis.crypto as any).randomBytes = nodeCrypto.randomBytes;
  }
}

import { v4 as uuidv4 } from 'uuid';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const id = uuidv4();

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
import * as express from 'express';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { AppDataSource } from 'typeorm.config';

async function bootstrap() {
  if (process.argv.includes('--migrations')) {
    try {
      await AppDataSource.initialize();
      console.log('📦 Ejecutando migraciones...');
      const migrations = await AppDataSource.runMigrations();
      console.log('✅ Migraciones ejecutadas:', migrations);
      await AppDataSource.destroy();
      process.exit(0);
    } catch (err) {
      console.error('❌ Error ejecutando migraciones:', err);
      process.exit(1);
    }
  }

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
      crossOriginResourcePolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(
    '/docs',
    express.static(join(__dirname, '../node_modules/swagger-ui-dist')),
  );

  // Servir archivos estáticos del directorio uploads
  // En Dokploy (sea dev o prod), el volumen se monta en /app/uploads.
  // En local Windows, usamos join(process.cwd(), 'uploads')
  const uploadsPath =
    process.platform === 'win32'
      ? join(process.cwd(), 'uploads')
      : '/app/uploads';

  app.use('/uploads', express.static(uploadsPath));

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(
    `🚀 App corriendo en el puerto ${port} en todas las interfaces de red [${configService.get('app.env')}]`,
  );
}

bootstrap();
