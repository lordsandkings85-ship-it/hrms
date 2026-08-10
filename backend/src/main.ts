import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust the first hop so client IPs (used by the throttler) are correct behind
  // reverse proxies (Render/Railway/Nginx). Keep at 1 proxy hop.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Security headers: X-Content-Type-Options, X-Frame-Options, HSTS, etc.
  app.use(helmet());

  // Explicit CORS allow-list from CORS_ORIGINS (comma separated). Never reflect
  // arbitrary origins while credentials are enabled.
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: allowedOrigins, credentials: true });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`HRMS backend running on http://localhost:${port}/api/v1`);
}
bootstrap();
