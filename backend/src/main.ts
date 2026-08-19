import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { DecimalToNumberInterceptor } from './common/interceptors/decimal-to-number.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust the first hop so client IPs (used by the throttler) are correct behind
  // reverse proxies (Render/Railway/Nginx). Keep at 1 proxy hop.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Security headers: X-Content-Type-Options, X-Frame-Options, HSTS, etc.
  app.use(helmet());

  app.enableCors({
    origin: (origin, callback) => {
      const allowed = [
        /^https:\/\/.*\.vercel\.app$/,
        /^https:\/\/.*\.onrender\.com$/,
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      ];
      if (!origin || allowed.some(re => re.test(origin))) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With'
    ]
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalInterceptors(new DecimalToNumberInterceptor());
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
  // console.log(`HRMS backend running on https://hrms-backend-rl2c.onrender.com/api/v1`);

}
bootstrap();
