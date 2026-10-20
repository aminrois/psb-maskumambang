import { Module } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { RegistrationsExportService } from './registrations-export.service';
import { RegistrationsController } from './registrations.controller';

@Module({
  providers: [RegistrationsService, RegistrationsExportService],
  controllers: [RegistrationsController],
  exports: [RegistrationsService, RegistrationsExportService],
})
export class RegistrationsModule {}

