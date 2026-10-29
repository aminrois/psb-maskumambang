import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PracticalTestService } from './practical-test.service';
import {
  CreatePracticalScheduleDto,
  UpdatePracticalScheduleDto,
  AssignExaminersDto,
  AssignPracticalParticipantsDto,
  MovePracticalParticipantScheduleDto,
  SubmitPracticalScoreDto,
  PracticalCandidateFilterDto,
} from './dto/practical-test.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PracticalScheduleStatus, PracticalTestStatus, Role } from '@prisma/client';

@Controller('practical-test')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PracticalTestController {
  constructor(private readonly practicalTestService: PracticalTestService) {}

  // =========================================================================
  // ADMIN & SUPER ADMIN ENDPOINTS
  // =========================================================================

  @Get('admin/dashboard')
  @Roles(Role.PETUGAS_TES_PRAKTIK, Role.SUPER_ADMIN, Role.ADMIN)
  async getAdminDashboard(@Query('academicPeriodId') academicPeriodId?: string) {
    return this.practicalTestService.getDashboardStats(academicPeriodId);
  }

  @Get('admin/schedules')
  @Roles(Role.PETUGAS_TES_PRAKTIK, Role.SUPER_ADMIN, Role.ADMIN)
  async listSchedules(
    @Query('academicPeriodId') academicPeriodId?: string,
    @Query('admissionWaveId') admissionWaveId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('status') status?: PracticalScheduleStatus,
    @Query('search') search?: string,
  ) {
    return this.practicalTestService.listSchedules({
      academicPeriodId,
      admissionWaveId,
      schoolId,
      status,
      search,
    });
  }

  @Post('admin/schedules')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async createSchedule(@Body() dto: CreatePracticalScheduleDto) {
    return this.practicalTestService.createSchedule(dto);
  }

  @Get('admin/schedules/:id')
  @Roles(Role.PETUGAS_TES_PRAKTIK, Role.SUPER_ADMIN, Role.ADMIN)
  async getScheduleDetail(@Param('id') id: string) {
    return this.practicalTestService.getScheduleDetail(id);
  }

  @Patch('admin/schedules/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdatePracticalScheduleDto,
  ) {
    return this.practicalTestService.updateSchedule(id, dto);
  }

  @Delete('admin/schedules/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async deleteSchedule(@Param('id') id: string) {
    return this.practicalTestService.deleteSchedule(id);
  }

  @Post('admin/schedules/:id/assign-examiners')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async assignExaminers(
    @Param('id') id: string,
    @Body() dto: AssignExaminersDto,
  ) {
    return this.practicalTestService.assignExaminers(id, dto);
  }

  @Post('admin/schedules/:id/assign-participants')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async assignParticipants(
    @Param('id') id: string,
    @Body() dto: AssignPracticalParticipantsDto,
  ) {
    return this.practicalTestService.assignParticipants(id, dto);
  }

  @Delete('admin/schedules/:id/participants/:registrationId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async removeParticipant(
    @Param('id') scheduleId: string,
    @Param('registrationId') registrationId: string,
  ) {
    return this.practicalTestService.removeParticipantFromSchedule(
      scheduleId,
      registrationId,
    );
  }

  @Post('admin/participants/:registrationId/move-schedule')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  async moveParticipantSchedule(
    @Param('registrationId') registrationId: string,
    @Body() dto: MovePracticalParticipantScheduleDto,
  ) {
    return this.practicalTestService.moveParticipantSchedule(
      registrationId,
      dto,
    );
  }

  @Get('admin/candidates/ready')
  @Roles(Role.PETUGAS_TES_PRAKTIK, Role.SUPER_ADMIN, Role.ADMIN)
  async listReadyCandidates(@Query() query: PracticalCandidateFilterDto) {
    return this.practicalTestService.listReadyCandidates(query);
  }

  @Get('admin/examiners')
  @Roles(Role.PETUGAS_TES_PRAKTIK, Role.SUPER_ADMIN, Role.ADMIN)
  async listExaminers() {
    return this.practicalTestService.listExaminers();
  }

  // =========================================================================
  // EXAMINER (PETUGAS TES PRAKTIK) ENDPOINTS
  // =========================================================================

  @Get('examiner/dashboard')
  @Roles(Role.PETUGAS_TES_PRAKTIK, Role.SUPER_ADMIN, Role.ADMIN)
  async getExaminerDashboard() {
    return this.practicalTestService.getDashboardStats();
  }

  @Get('examiner/my-schedules')
  @Roles(Role.PETUGAS_TES_PRAKTIK, Role.SUPER_ADMIN, Role.ADMIN)
  async getMySchedules(@CurrentUser('id') userId: string) {
    return this.practicalTestService.getMySchedules(userId);
  }

  @Get('examiner/schedules/:scheduleId/participants')
  @Roles(Role.PETUGAS_TES_PRAKTIK, Role.SUPER_ADMIN, Role.ADMIN)
  async getMyScheduleParticipants(
    @Param('scheduleId') scheduleId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.practicalTestService.getMyScheduleParticipants(
      scheduleId,
      userId,
    );
  }

  @Get('examiner/process/:registrationId')
  @Roles(Role.PETUGAS_TES_PRAKTIK, Role.SUPER_ADMIN, Role.ADMIN)
  async getCandidateDetail(@Param('registrationId') registrationId: string) {
    return this.practicalTestService.getCandidateDetail(registrationId);
  }

  @Post('examiner/process/:registrationId/assessment')
  @Roles(Role.PETUGAS_TES_PRAKTIK, Role.SUPER_ADMIN, Role.ADMIN)
  async submitPracticalScore(
    @Param('registrationId') registrationId: string,
    @Body() dto: SubmitPracticalScoreDto,
    @CurrentUser() user: any,
  ) {
    return this.practicalTestService.submitPracticalScore(
      registrationId,
      dto,
      user,
    );
  }

  @Get('recap')
  @Roles(Role.PETUGAS_TES_PRAKTIK, Role.SUPER_ADMIN, Role.ADMIN)
  async getRecapReport() {
    return this.practicalTestService.getRecapReport();
  }

  @Post('admin/verify/:registrationId')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PETUGAS_TES_PRAKTIK)
  async adminVerifyPracticalTest(
    @Param('registrationId') registrationId: string,
    @CurrentUser() user: any,
    @Body()
    body: {
      status?: PracticalTestStatus;
      generalNotes?: string;
      btqScore?: number;
      btqNotes?: string;
      wudhuScore?: number;
      wudhuNotes?: string;
      salatScore?: number;
      salatNotes?: string;
    },
  ) {
    return this.practicalTestService.adminVerifyPracticalTest(
      registrationId,
      body,
      user,
    );
  }
}
