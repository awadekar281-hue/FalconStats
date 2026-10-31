import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.use(helmet());
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',').map((v) => v.trim()) ?? false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new ApiExceptionFilter());
  const docs = new DocumentBuilder()
    .setTitle('FalconStats API')
    .setDescription('Normalized market data, provider health, and operational APIs. Test fixtures are never served as production market data.')
    .setVersion('1.0.0')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'X-Admin-Api-Key' }, 'admin-key')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, docs), { swaggerOptions: { persistAuthorization: false } });
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`FalconStats API listening on ${port}`);
}

void bootstrap();
