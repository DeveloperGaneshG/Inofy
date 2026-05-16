import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import express from 'express';
import type { Request, Response } from 'express';

const expressServer = express();
let isReady = false;

async function bootstrap() {
  if (isReady) return;

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressServer),
    { logger: ['error', 'warn'] },
  );

  const allowedOrigins = [
    /^http:\/\/localhost(:\d+)?$/,
    'https://inofy-drab.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();
  isReady = true;
}

export default async function handler(req: Request, res: Response) {
  try {
    await bootstrap();
    expressServer(req, res);
  } catch (err) {
    console.error('Bootstrap error:', err);
    res.status(500).json({ error: 'Server failed to start', detail: String(err) });
  }
}
