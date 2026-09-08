import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { CheckInService } from './checkin.service';
import { ScanCheckInDto } from './dto/checkin.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Roles(Role.BENDAHARA, Role.SUPER_ADMIN, Role.ADMIN_BARCODE)
@Controller('checkin')
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  /** Stage 1: Check-in kedatangan */
  @Post('scan')
  async scanCheckIn(
    @CurrentUser('id') staffId: string,
    @Body() dto: ScanCheckInDto,
  ) {
    return await this.checkInService.processCheckIn(staffId, dto);
  }

  /** Stage 2: Check-in masuk arena lomba */
  @Post('scan2')
  async scanCheckIn2(
    @CurrentUser('id') staffId: string,
    @Body() dto: ScanCheckInDto,
  ) {
    return await this.checkInService.processCheckIn2(staffId, dto);
  }

  @Get('live-log')
  async getLiveLog(@Query('limit') limit = '100') {
    const logs = await this.checkInService.getLiveCheckInLogs(parseInt(limit, 10) || 100);
    return {
      success: true,
      count: logs.length,
      data: logs,
    };
  }
}
