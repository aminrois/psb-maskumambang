import { Module } from '@nestjs/common';
import { CbtController } from './cbt.controller';
import { CbtService } from './cbt.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CbtController],
  providers: [CbtService],
  exports: [CbtService],
})
export class CbtModule {}
