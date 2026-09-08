import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Roles(Role.SUPER_ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async listLogs(
    @Query('search') search?: string,
    @Query('action') action?: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '25',
  ) {
    const data = await this.auditService.listLogs(
      search,
      action,
      parseInt(page, 10) || 1,
      parseInt(perPage, 10) || 25,
    );
    return { success: true, ...data };
  }
}
