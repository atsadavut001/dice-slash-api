import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const server = express();
let cachedApp;

async function bootstrap() {
  if (!cachedApp) {
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server)
    );
    app.setGlobalPrefix('api/v1');
    app.enableCors({
      origin: '*', // You can change this to your frontend URL later
      credentials: true,
    });
    await app.init();
    cachedApp = app;
  }
  return server;
}

export default async function handler(req: any, res: any) {
  const app = await bootstrap();
  return app(req, res);
}
