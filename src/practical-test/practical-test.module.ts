import { Module } from '@nestjs/common';
import { PracticalTestController } from './practical-test.controller';
import { PracticalTestService } from './practical-test.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PracticalTestController],
  providers: [PracticalTestService],
  exports: [PracticalTestService],
})
export class PracticalTestModule {}
