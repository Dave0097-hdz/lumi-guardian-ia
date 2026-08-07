import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug']
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3000;
  const nodeEnv = configService.get<string>('app.nodeEnv');

  // Prefijo global para todos los endpoints
  app.setGlobalPrefix('api/v1');

  // Headers de seguridad HTTP
  app.use(helmet());

  // CORS
  app.enableCors({
    origin:
      nodeEnv === 'production'
      ? [process.env.FRONTEND_URL ?? '']
      : ['http://localhost:4200'], // Angular dev server
    credentials: true,
    methods: ['GET', 'POST', 'PUT','DELETE', 'PATCH', 'OPTIONS'],
  });

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      }
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
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  //const port = 3000;
  await app.listen(port);
  logger.log(`LUMI Backend corriendo en: http://localhost:${port}/api/v1`);
  logger.log(`Ambiente: ${nodeEnv}`);
}

bootstrap();
