import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import helmet from 'helmet';
import cookieParser = require('cookie-parser');
import { join } from 'path';
import { Request, Response } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3000;
  const nodeEnv = configService.get<string>('app.nodeEnv');

  app.getHttpAdapter().get('/agent/install', (_request: Request, response: Response) => {
    response.sendFile(join(process.cwd(), 'public', 'install.sh'));
  });
  app.use('/agent', express.static(join(process.cwd(), 'public', 'agent')));

  // Prefijo global para todos los endpoints
  app.setGlobalPrefix('api/v1');

  // Headers de seguridad HTTP
  app.use(helmet());

  // Cookie parser — para leer refreshToken de HttpOnly cookies
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin:
      nodeEnv === 'production'
        ? [process.env.FRONTEND_URL ?? '']
        : ['http://localhost:4200'],
    credentials: true, // Importante: permite envío de cookies cross-origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Filtro de errores global
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('LUMI Guardián AI')
    .setDescription('API REST — Plataforma de ciberseguridad autónoma para VPS')
    .setVersion('3.0')
    .addBearerAuth()
    .addCookieAuth('refreshToken')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`LUMI Backend corriendo en: http://localhost:${port}/api/v1`);
  logger.log(`Ambiente: ${nodeEnv}`);
}

bootstrap();
