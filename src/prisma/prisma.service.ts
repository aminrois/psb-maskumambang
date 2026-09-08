import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PrismaService');

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Berhasil terhubung ke database PostgreSQL.');
    } catch (error: any) {
      this.logger.warn(
        `⚠️ Tidak dapat terhubung ke server PostgreSQL pada DATABASE_URL. Pastikan PostgreSQL aktif pada port yang sesuai: ${error.message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
