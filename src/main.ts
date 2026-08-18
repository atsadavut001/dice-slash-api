import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const corsOrigin = configService.get<string>('CORS_ORIGIN') || 'http://localhost:5173';
  const port = configService.get<number>('PORT') || 3001;

  // Set Global Prefix to /api/v1
  app.setGlobalPrefix('api/v1');
  
  // Enable CORS so frontend can communicate with backend
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Run on port
  await app.listen(port);
}
bootstrap();
