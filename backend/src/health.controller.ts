import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

/**
 * Unauthenticated operational endpoints.
 *
 * `/health` is a liveness probe: it only proves the process is serving HTTP.
 * `/health/ready` is a readiness probe: it also verifies the database is
 * reachable, so a load balancer stops routing traffic to an instance whose
 * connection pool is broken.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  liveness() {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // Do not leak driver/connection details to an unauthenticated caller.
      throw new ServiceUnavailableException('Database is not reachable');
    }
    return {
      status: 'ok',
      database: 'reachable',
      timestamp: new Date().toISOString(),
    };
  }
}
