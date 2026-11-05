import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { DecimalToNumberInterceptor } from './common/interceptors/decimal-to-number.interceptor';

function assertRequiredEnv(envs: string[]): void {
  const missing = envs.filter((e) => !process.env[e] || process.env[e]!.trim() === '');
  if (missing.length > 0) {
    // Fail fast at boot rather than silently running with weak/empty secrets.
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}`,
    );
  }
}

async function bootstrap() {
  assertRequiredEnv(['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY']);

  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Let Nest run OnModuleDestroy (PrismaService.$disconnect) when the platform
  // sends SIGTERM/SIGINT during a deploy, instead of dropping in-flight work.
  app.enableShutdownHooks();

  // Increase payload size limit to support image/logo uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // Trust the first hop so client IPs (used by the throttler) are correct behind
  // reverse proxies (Render/Railway/Nginx). Keep at 1 proxy hop.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Security headers: X-Content-Type-Options, X-Frame-Options, HSTS, etc.
  app.use(helmet());

  // CORS allow-list: prefer the CORS_ORIGINS env var (comma-separated exact
  // origins); fall back to dev defaults. No wildcard, credentials allowed.
  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Production must declare its origins explicitly. Falling back to a suffix
  // wildcard in production would let anyone on *.vercel.app / *.onrender.com
  // call the API with credentials.
  if (process.env.NODE_ENV === 'production' && corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must be set to an explicit comma-separated allow-list in production');
  }

  const allowedOrigins: (string | RegExp)[] = corsOrigins.length > 0
    ? corsOrigins
    : [
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const ok = allowedOrigins.some((a) =>
        typeof a === 'string' ? a === origin : a.test(origin),
      );
      if (ok) {
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
      'X-Requested-With',
      'X-Company-Id',
      'X-Device-Id',
      'X-Device-Context',
      'X-Client-Type',
      'X-Client-Platform',
      'X-Client-Arch',
      'X-OS-Version',
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
