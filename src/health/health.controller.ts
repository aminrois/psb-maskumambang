import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async getHealth() {
    const isDbHealthy = await this.prisma.isHealthy();

    return {
      status: isDbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'Sistem Pendaftaran Lomba (NestJS API)',
      database: isDbHealthy ? 'connected' : 'disconnected',
    };
  }
}
