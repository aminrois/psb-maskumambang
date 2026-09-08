import { Module } from '@nestjs/common';
import { HeroSliderController } from './hero-slider.controller';
import { HeroSliderService } from './hero-slider.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [HeroSliderController],
  providers: [HeroSliderService],
  exports: [HeroSliderService],
})
export class HeroSliderModule {}
