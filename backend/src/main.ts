import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global validation pipe
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

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT || 3005;
  await app.listen(port);
  
  logger.log(`🚀 API Gateway is running on http://localhost:${port}`);
  logger.log(`📡 Gateway endpoints: http://localhost:${port}/v1/chat/completions`);
  logger.log(`🔧 Admin API: http://localhost:${port}/api/teams, /api/api-keys, /api/usage`);
}

bootstrap();
