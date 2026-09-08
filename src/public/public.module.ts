import { Module } from '@nestjs/common';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';

@Module({
  providers: [PublicService],
  controllers: [PublicController],
  exports: [PublicService],
})
export class PublicModule {}
