// eslint-disable-next-line @typescript-eslint/no-require-imports
import basicAuth = require('express-basic-auth');
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as bodyParser from 'body-parser';

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
    .setTitle('IPUC 4TA API')
    .setDescription('API for managing the web app from "IPUC 4TA"')
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
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
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
  await app.listen(configService.get<number>('APP_PORT') || 3000);
}
bootstrap();
