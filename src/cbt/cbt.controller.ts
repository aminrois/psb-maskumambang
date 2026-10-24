import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CbtService } from './cbt.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import {
  CreateCbtExamDto,
  UpdateCbtExamDto,
  DuplicateCbtExamDto,
  CreateCbtQuestionDto,
  UpdateCbtQuestionDto,
  SubmitCbtAnswerDto,
  GradeCbtEssayDto,
  ImportCbtQuestionsDto,
  VerifyCbtAttemptDto,
  RejectCbtAttemptDto,
  ExemptCbtDto,
} from './dto/cbt.dto';

@Controller('cbt')
export class CbtController {
  constructor(private readonly cbtService: CbtService) {}

  // ==========================================================================
  // SUPER ADMIN ENDPOINTS
  // ==========================================================================

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/dashboard')
  async getAdminDashboard() {
    const data = await this.cbtService.getAdminDashboardStats();
    return { success: true, data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/exams/by-school/:schoolId')
  async getExamBySchool(@Param('schoolId') schoolId: string) {
    const data = await this.cbtService.getExamBySchool(schoolId);
    return { success: true, data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/exams/:id')
  async getExamById(@Param('id') id: string) {
    const data = await this.cbtService.getExamById(id);
    return { success: true, data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/exams')
  async createExam(@Body() dto: CreateCbtExamDto) {
    const data = await this.cbtService.createExam(dto);
    return {
      success: true,
      message: 'Ujian CBT berhasil dibuat untuk Program Kelas ini.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/exams/duplicate')
  async duplicateExam(@Body() dto: DuplicateCbtExamDto) {
    const data = await this.cbtService.duplicateExam(dto);
    return {
      success: true,
      message: data.message,
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('admin/exams/:id')
  async updateExam(
    @Param('id') id: string,
    @Body() dto: UpdateCbtExamDto,
  ) {
    const data = await this.cbtService.updateExam(id, dto);
    return {
      success: true,
      message: 'Pengaturan ujian CBT berhasil diperbarui.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/exams/:id/questions')
  async addQuestion(
    @Param('id') id: string,
    @Body() dto: CreateCbtQuestionDto,
  ) {
    const data = await this.cbtService.addQuestion(id, dto);
    return {
      success: true,
      message: 'Soal berhasil ditambahkan.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('admin/questions/:questionId')
  async updateQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: UpdateCbtQuestionDto,
  ) {
    const data = await this.cbtService.updateQuestion(questionId, dto);
    return {
      success: true,
      message: 'Soal berhasil diperbarui.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('admin/questions/:questionId')
  async deleteQuestion(@Param('questionId') questionId: string) {
    return this.cbtService.deleteQuestion(questionId);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/upload-image')
  @UseInterceptors(FileInterceptor('image'))
  async uploadQuestionImage(@UploadedFile() file: Express.Multer.File) {
    const data = await this.cbtService.uploadQuestionImage(file);
    return {
      success: true,
      message: 'Gambar berhasil diunggah.',
      data,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/results')
  async getAdminResults(
    @Query('schoolId') schoolId?: string,
    @Query('attemptStatus') attemptStatus?: string,
    @Query('gradingStatus') gradingStatus?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.cbtService.getAdminResults({
      schoolId,
      attemptStatus,
      gradingStatus,
      search,
    });
    return { success: true, data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/results/:attemptId')
  async getAdminAttemptDetail(@Param('attemptId') attemptId: string) {
    const data = await this.cbtService.getAdminAttemptDetail(attemptId);
    return { success: true, data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/results/:attemptId/grade')
  async gradeEssay(
    @Param('attemptId') attemptId: string,
    @CurrentUser('id') graderUserId: string,
    @Body() dto: GradeCbtEssayDto,
  ) {
    return this.cbtService.gradeEssay(attemptId, graderUserId, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/exams/:id/questions/import')
  async importQuestions(
    @Param('id') id: string,
    @Body() dto: ImportCbtQuestionsDto,
  ) {
    const result = await this.cbtService.importQuestions(id, dto.questions);
    return result;
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/verifications')
  async getAdminVerifications(
    @Query('schoolId') schoolId?: string,
    @Query('verificationStatus') verificationStatus?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.cbtService.getAdminVerifications({
      schoolId,
      verificationStatus,
      search,
    });
    return { success: true, data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/verifications/:attemptId/verify')
  async verifyAttempt(
    @Param('attemptId') attemptId: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: VerifyCbtAttemptDto,
  ) {
    return this.cbtService.verifyAttempt(attemptId, adminUserId, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/verifications/:attemptId/reject')
  async rejectAttempt(
    @Param('attemptId') attemptId: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: RejectCbtAttemptDto,
  ) {
    return this.cbtService.rejectAttempt(attemptId, adminUserId, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/attempts/:attemptId/reset')
  async resetAttempt(
    @Param('attemptId') attemptId: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.cbtService.resetAttempt(attemptId, adminUserId);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('admin/candidates-for-exemption')
  async getCandidatesForExemption(
    @Query('schoolId') schoolId?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.cbtService.getCandidatesForExemption({
      schoolId,
      search,
    });
    return { success: true, data };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('admin/exempt')
  async exemptCbt(
    @CurrentUser('id') adminUserId: string,
    @Body() dto: ExemptCbtDto,
  ) {
    return this.cbtService.exemptCbt(dto, adminUserId);
  }

  // ==========================================================================
  // PESERTA ENDPOINTS
  // ==========================================================================

  @Roles(Role.PESERTA)
  @Get('peserta/status')
  async getPesertaStatus(@CurrentUser('id') userId: string) {
    const data = await this.cbtService.getPesertaStatus(userId);
    return { success: true, data };
  }

  @Roles(Role.PESERTA)
  @Post('peserta/start')
  async startPesertaAttempt(@CurrentUser('id') userId: string) {
    const data = await this.cbtService.startPesertaAttempt(userId);
    return data;
  }

  @Roles(Role.PESERTA)
  @Get('peserta/session')
  async getPesertaSession(@CurrentUser('id') userId: string) {
    const data = await this.cbtService.getPesertaSession(userId);
    return { success: true, data };
  }

  @Roles(Role.PESERTA)
  @Post('peserta/answer')
  async savePesertaAnswer(
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitCbtAnswerDto,
  ) {
    return this.cbtService.savePesertaAnswer(userId, dto);
  }

  @Roles(Role.PESERTA)
  @Post('peserta/finish')
  async finishPesertaAttempt(@CurrentUser('id') userId: string) {
    const data = await this.cbtService.finishPesertaAttempt(userId);
    return data;
  }
}
