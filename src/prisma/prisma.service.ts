import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('PrismaService');

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Berhasil terhubung ke database PostgreSQL.');

      // Non-destructive safe auto-migration for multi-role support
      try {
        await this.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS roles "Role"[] DEFAULT '{}';`);
        await this.$executeRawUnsafe(`UPDATE users SET roles = ARRAY[role] WHERE roles IS NULL OR cardinality(roles) = 0;`);
        this.logger.log('✅ Sinkronisasi kolom multi-role users berhasil diverifikasi.');
      } catch (schemaErr: any) {
        this.logger.warn(`⚠️ Multi-role check: ${schemaErr.message}`);
      }
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
