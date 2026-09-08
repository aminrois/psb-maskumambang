import { Module } from '@nestjs/common';
import { RegistrationFlowController } from './registration-flow.controller';
import { RegistrationFlowService } from './registration-flow.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RegistrationFlowController],
  providers: [RegistrationFlowService],
  exports: [RegistrationFlowService],
})
export class RegistrationFlowModule {}
