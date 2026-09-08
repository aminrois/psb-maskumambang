import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { InterviewService } from './interview.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  Gender,
  InterviewPackageStatus,
  InterviewRecommendation,
  InterviewScheduleStatus,
  InterviewStatus,
  Role,
} from '@prisma/client';
import {
  AdminUpdateInterviewDto,
  AssignInterviewersDto,
  AssignParticipantsDto,
  CheckInParticipantDto,
  CreateInterviewAspectDto,
  CreateInterviewCategoryDto,
  CreateInterviewPackageDto,
  CreateInterviewQuestionDto,
  CreateInterviewScheduleDto,
  DuplicatePackageDto,
  MoveParticipantScheduleDto,
  SaveAspectConfigsDto,
  SaveInterviewAssessmentDto,
  UpdateInterviewAspectDto,
  UpdateInterviewCategoryDto,
  UpdateInterviewPackageDto,
  UpdateInterviewQuestionDto,
  UpdateInterviewScheduleDto,
  UpdatePackageQuestionsOrderDto,
} from './dto/interview.dto';

@Controller('interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  // ==========================================================================
  // SUPER ADMIN ENDPOINTS
  // ==========================================================================

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/dashboard')
  async getAdminDashboard(@Query('academicPeriodId') academicPeriodId?: string) {
    const data = await this.interviewService.getAdminDashboardStats(
      academicPeriodId,
    );
    return { success: true, data };
  }

  // --- Kategori Pertanyaan ---
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/categories')
  async listCategories(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    const data = await this.interviewService.listCategories(search, activeBool);
    return { success: true, data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/categories')
  async createCategory(@Body() dto: CreateInterviewCategoryDto) {
    const data = await this.interviewService.createCategory(dto);
    return {
      success: true,
      message: 'Kategori pertanyaan berhasil dibuat.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('admin/categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateInterviewCategoryDto,
  ) {
    const data = await this.interviewService.updateCategory(id, dto);
    return {
      success: true,
      message: 'Kategori pertanyaan berhasil diperbarui.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('admin/categories/:id')
  async deleteCategory(@Param('id') id: string) {
    await this.interviewService.deleteCategory(id);
    return { success: true, message: 'Kategori pertanyaan berhasil dihapus.' };
  }

  // --- Bank Pertanyaan ---
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/questions')
  async listQuestions(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('academicPeriodId') academicPeriodId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('majorId') majorId?: string,
    @Query('classProgramId') classProgramId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '25',
  ) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    const data = await this.interviewService.listQuestions(
      search,
      categoryId,
      academicPeriodId,
      schoolId,
      majorId,
      classProgramId,
      activeBool,
      parseInt(page, 10) || 1,
      parseInt(perPage, 10) || 25,
    );
    return { success: true, ...data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/questions')
  async createQuestion(@Body() dto: CreateInterviewQuestionDto) {
    const data = await this.interviewService.createQuestion(dto);
    return {
      success: true,
      message: 'Pertanyaan wawancara berhasil ditambahkan ke Bank Soal.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('admin/questions/:id')
  async updateQuestion(
    @Param('id') id: string,
    @Body() dto: UpdateInterviewQuestionDto,
  ) {
    const data = await this.interviewService.updateQuestion(id, dto);
    return {
      success: true,
      message: 'Pertanyaan wawancara berhasil diperbarui.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('admin/questions/:id')
  async deleteQuestion(@Param('id') id: string) {
    await this.interviewService.deleteQuestion(id);
    return { success: true, message: 'Pertanyaan wawancara berhasil dihapus.' };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/questions/:id/duplicate')
  async duplicateQuestion(@Param('id') id: string) {
    const data = await this.interviewService.duplicateQuestion(id);
    return {
      success: true,
      message: 'Pertanyaan berhasil diduplikasi.',
      data,
    };
  }

  // --- Paket Wawancara ---
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/packages')
  async listPackages(
    @Query('search') search?: string,
    @Query('academicPeriodId') academicPeriodId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('majorId') majorId?: string,
    @Query('classProgramId') classProgramId?: string,
    @Query('status') status?: InterviewPackageStatus,
    @Query('page') page = '1',
    @Query('perPage') perPage = '25',
  ) {
    const data = await this.interviewService.listPackages(
      search,
      academicPeriodId,
      schoolId,
      majorId,
      classProgramId,
      status,
      parseInt(page, 10) || 1,
      parseInt(perPage, 10) || 25,
    );
    return { success: true, ...data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/packages/:id')
  async getPackageById(@Param('id') id: string) {
    const data = await this.interviewService.getPackageById(id);
    return { success: true, data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/packages')
  async createPackage(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInterviewPackageDto,
  ) {
    const data = await this.interviewService.createPackage(userId, dto);
    return {
      success: true,
      message: 'Paket Wawancara berhasil dibuat.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('admin/packages/:id')
  async updatePackage(
    @Param('id') id: string,
    @Body() dto: UpdateInterviewPackageDto,
  ) {
    const data = await this.interviewService.updatePackage(id, dto);
    return {
      success: true,
      message: 'Paket Wawancara berhasil diperbarui.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('admin/packages/:id')
  async deletePackage(@Param('id') id: string) {
    await this.interviewService.deletePackage(id);
    return { success: true, message: 'Paket Wawancara berhasil diproses.' };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/packages/:id/questions')
  async addQuestionToPackage(
    @Param('id') packageId: string,
    @Body()
    dto: {
      questionId: string;
      sortOrder?: number;
      isRequired?: boolean;
      answerNoteMode?: any;
    },
  ) {
    const data = await this.interviewService.addQuestionToPackage(
      packageId,
      dto,
    );
    return {
      success: true,
      message: 'Pertanyaan berhasil dimasukkan ke Paket.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('admin/packages/:id/questions/:questionId')
  async removeQuestionFromPackage(
    @Param('id') packageId: string,
    @Param('questionId') questionId: string,
  ) {
    await this.interviewService.removeQuestionFromPackage(
      packageId,
      questionId,
    );
    return {
      success: true,
      message: 'Pertanyaan berhasil dikeluarkan dari Paket.',
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/packages/:id/questions/order')
  async updatePackageQuestionsOrder(
    @Param('id') packageId: string,
    @Body() dto: UpdatePackageQuestionsOrderDto,
  ) {
    const data = await this.interviewService.updatePackageQuestionsOrder(
      packageId,
      dto,
    );
    return {
      success: true,
      message: 'Urutan dan konfigurasi pertanyaan berhasil diperbarui.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/packages/:id/duplicate')
  async duplicatePackage(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: DuplicatePackageDto,
  ) {
    const data = await this.interviewService.duplicatePackageForNewYear(
      id,
      dto,
      userId,
    );
    return {
      success: true,
      message: 'Paket berhasil diduplikasi untuk Tahun Baru.',
      data,
    };
  }

  // --- Aspek Penilaian ---
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/aspects')
  async listAspects(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    const data = await this.interviewService.listAspects(search, activeBool);
    return { success: true, data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/aspects')
  async createAspect(@Body() dto: CreateInterviewAspectDto) {
    const data = await this.interviewService.createAspect(dto);
    return {
      success: true,
      message: 'Aspek penilaian berhasil dibuat.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('admin/aspects/:id')
  async updateAspect(
    @Param('id') id: string,
    @Body() dto: UpdateInterviewAspectDto,
  ) {
    const data = await this.interviewService.updateAspect(id, dto);
    return {
      success: true,
      message: 'Aspek penilaian berhasil diperbarui.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('admin/aspects/:id')
  async deleteAspect(@Param('id') id: string) {
    await this.interviewService.deleteAspect(id);
    return { success: true, message: 'Aspek penilaian berhasil dihapus.' };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/aspects/configs')
  async getAspectConfigs(
    @Query('academicPeriodId') academicPeriodId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('majorId') majorId?: string,
    @Query('classProgramId') classProgramId?: string,
  ) {
    const data = await this.interviewService.getAspectConfigs(
      academicPeriodId,
      schoolId,
      majorId,
      classProgramId,
    );
    return { success: true, data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/aspects/configs')
  async saveAspectConfigs(@Body() dto: SaveAspectConfigsDto) {
    const data = await this.interviewService.saveAspectConfigs(dto);
    return {
      success: true,
      message: 'Konfigurasi bobot dan aspek berhasil disimpan.',
      data,
    };
  }

  // --- Data Pewawancara ---
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/interviewers')
  async listInterviewers(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '25',
  ) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    const data = await this.interviewService.listInterviewers(
      search,
      activeBool,
      parseInt(page, 10) || 1,
      parseInt(perPage, 10) || 25,
    );
    return { success: true, ...data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/interviewers/:id')
  async getInterviewerDetail(@Param('id') id: string) {
    const data = await this.interviewService.getInterviewerDetail(id);
    return { success: true, data };
  }

  // --- Jadwal Wawancara ---
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/schedules')
  async listSchedules(
    @Query('search') search?: string,
    @Query('academicPeriodId') academicPeriodId?: string,
    @Query('admissionWaveId') admissionWaveId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('majorId') majorId?: string,
    @Query('classProgramId') classProgramId?: string,
    @Query('status') status?: InterviewScheduleStatus,
    @Query('interviewerId') interviewerId?: string,
    @Query('date') date?: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '25',
  ) {
    const data = await this.interviewService.listSchedules(
      search,
      academicPeriodId,
      admissionWaveId,
      schoolId,
      majorId,
      classProgramId,
      status,
      interviewerId,
      date,
      parseInt(page, 10) || 1,
      parseInt(perPage, 10) || 25,
    );
    return { success: true, ...data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/schedules/:id')
  async getScheduleById(@Param('id') id: string) {
    const data = await this.interviewService.getScheduleById(id);
    return { success: true, data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/schedules')
  async createSchedule(@Body() dto: CreateInterviewScheduleDto) {
    const data = await this.interviewService.createSchedule(dto);
    return {
      success: true,
      message: 'Jadwal wawancara berhasil dibuat.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('admin/schedules/:id')
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdateInterviewScheduleDto,
  ) {
    const data = await this.interviewService.updateSchedule(id, dto);
    return {
      success: true,
      message: 'Jadwal wawancara berhasil diperbarui.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('admin/schedules/:id')
  async deleteSchedule(@Param('id') id: string) {
    await this.interviewService.deleteSchedule(id);
    return { success: true, message: 'Jadwal wawancara berhasil dihapus.' };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/schedules/:id/assign-interviewers')
  async assignInterviewers(
    @Param('id') scheduleId: string,
    @Body() dto: AssignInterviewersDto,
  ) {
    const data = await this.interviewService.assignInterviewersToSchedule(
      scheduleId,
      dto,
    );
    return {
      success: true,
      message: 'Pewawancara berhasil ditugaskan ke jadwal.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/schedules/assign-participants')
  async assignParticipants(@Body() dto: AssignParticipantsDto) {
    const data = await this.interviewService.assignParticipants(dto);
    return {
      success: true,
      message: `${data.count} peserta berhasil ditugaskan ke jadwal wawancara.`,
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/schedules/move-participant')
  async moveParticipant(@Body() dto: MoveParticipantScheduleDto) {
    const data = await this.interviewService.moveParticipantSchedule(dto);
    return {
      success: true,
      message: 'Jadwal peserta berhasil dipindahkan.',
      data,
    };
  }

  // --- Peserta Wawancara ---
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/participants')
  async listParticipants(
    @Query('search') search?: string,
    @Query('gender') gender?: Gender,
    @Query('academicPeriodId') academicPeriodId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('majorId') majorId?: string,
    @Query('classProgramId') classProgramId?: string,
    @Query('scheduleId') scheduleId?: string,
    @Query('interviewerId') interviewerId?: string,
    @Query('status') status?: InterviewStatus,
    @Query('page') page = '1',
    @Query('perPage') perPage = '25',
  ) {
    const data = await this.interviewService.listParticipants(
      search,
      gender,
      academicPeriodId,
      schoolId,
      majorId,
      classProgramId,
      scheduleId,
      interviewerId,
      status,
      parseInt(page, 10) || 1,
      parseInt(perPage, 10) || 25,
    );
    return { success: true, ...data };
  }

  // --- Check-in Wawancara ---
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.PEWAWANCARA, Role.ADMIN_BARCODE)
  @Post('check-in')
  async checkIn(
    @CurrentUser('id') staffId: string,
    @Body() dto: CheckInParticipantDto,
  ) {
    return this.interviewService.checkInParticipant(
      dto.identifier,
      dto.status,
      staffId,
    );
  }

  // --- Rekap Hasil & Koreksi ---
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/results')
  async getResults(
    @Query('search') search?: string,
    @Query('academicPeriodId') academicPeriodId?: string,
    @Query('admissionWaveId') admissionWaveId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('majorId') majorId?: string,
    @Query('classProgramId') classProgramId?: string,
    @Query('scheduleId') scheduleId?: string,
    @Query('interviewerId') interviewerId?: string,
    @Query('status') status?: InterviewStatus,
    @Query('recommendation') recommendation?: InterviewRecommendation,
    @Query('page') page = '1',
    @Query('perPage') perPage = '25',
  ) {
    const data = await this.interviewService.getInterviewResults(
      search,
      academicPeriodId,
      admissionWaveId,
      schoolId,
      majorId,
      classProgramId,
      scheduleId,
      interviewerId,
      status,
      recommendation,
      parseInt(page, 10) || 1,
      parseInt(perPage, 10) || 25,
    );
    return { success: true, ...data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('admin/results/:interviewId/correct')
  async adminCorrectInterview(
    @Param('interviewId') interviewId: string,
    @CurrentUser() user: any,
    @Body() dto: AdminUpdateInterviewDto,
  ) {
    return this.interviewService.adminUpdateInterview(interviewId, dto, user);
  }

  // ==========================================================================
  // PEWAWANCARA ENDPOINTS
  // ==========================================================================

  @Roles(Role.PEWAWANCARA, Role.SUPER_ADMIN, Role.ADMIN)
  @Get('interviewer/dashboard')
  async getInterviewerDashboard(@CurrentUser('id') interviewerId: string) {
    const data = await this.interviewService.getInterviewerDashboardStats(
      interviewerId,
    );
    return { success: true, data };
  }

  @Roles(Role.PEWAWANCARA, Role.SUPER_ADMIN, Role.ADMIN)
  @Get('interviewer/schedules')
  async getMySchedules(
    @CurrentUser('id') interviewerId: string,
    @Query('date') date?: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '25',
  ) {
    const data = await this.interviewService.listSchedules(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      interviewerId,
      date,
      parseInt(page, 10) || 1,
      parseInt(perPage, 10) || 25,
    );
    return { success: true, ...data };
  }

  @Roles(Role.PEWAWANCARA, Role.SUPER_ADMIN, Role.ADMIN)
  @Get('interviewer/participants')
  async getMyParticipants(
    @CurrentUser('id') interviewerId: string,
    @Query('search') search?: string,
    @Query('scheduleId') scheduleId?: string,
    @Query('status') status?: InterviewStatus,
    @Query('page') page = '1',
    @Query('perPage') perPage = '25',
  ) {
    const data = await this.interviewService.listParticipants(
      search,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      scheduleId,
      interviewerId,
      status,
      parseInt(page, 10) || 1,
      parseInt(perPage, 10) || 25,
    );
    return { success: true, ...data };
  }

  @Roles(Role.PEWAWANCARA, Role.SUPER_ADMIN, Role.ADMIN)
  @Get('interviewer/process/:identifier')
  async getInterviewForProcess(
    @Param('identifier') identifier: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.interviewService.getInterviewDetailForProcess(
      identifier,
      user,
    );
    return { success: true, data };
  }

  @Roles(Role.PEWAWANCARA, Role.SUPER_ADMIN, Role.ADMIN)
  @Post('interviewer/process/:interviewId/save')
  async saveInterviewAssessment(
    @Param('interviewId') interviewId: string,
    @CurrentUser() user: any,
    @Body() dto: SaveInterviewAssessmentDto,
  ) {
    return this.interviewService.saveInterviewAssessment(
      interviewId,
      dto,
      user,
    );
  }

  // ==========================================================================
  // PESERTA ENDPOINT
  // ==========================================================================

  @Roles(Role.PESERTA)
  @Get('my-interview')
  async getMyInterviewInfo(@CurrentUser('id') userId: string) {
    const data = await this.interviewService.getParticipantInterviewInfo(
      userId,
    );
    return { success: true, data };
  }
}
