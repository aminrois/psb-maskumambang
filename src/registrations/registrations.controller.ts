import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { RegistrationsService } from './registrations.service';
import { CreateIndividualRegistrationDto } from './dto/create-individual.dto';
import { CreateTeamRegistrationDto } from './dto/create-team.dto';
import { SaveFormDraftDto, SubmitFullFormDto, RequestRevisionDto } from './dto/full-form.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, RegistrationStatus, FormStatus, DocumentType } from '@prisma/client';
import * as fs from 'fs';

@Controller('registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @Roles(Role.PESERTA)
  @Post('individual')
  async createIndividual(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateIndividualRegistrationDto,
  ) {
    const data = await this.registrationsService.createIndividual(userId, dto);
    return {
      success: true,
      message: 'Pendaftaran awal calon siswa berhasil dibuat!',
      data,
    };
  }

  @Roles(Role.PESERTA)
  @Post('team')
  async createTeam(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTeamRegistrationDto,
  ) {
    const data = await this.registrationsService.createTeam(userId, dto);
    return {
      success: true,
      message: 'Pendaftaran berhasil dibuat!',
      data,
    };
  }

  @Roles(Role.BENDAHARA, Role.ADMIN, Role.SUPER_ADMIN)
  @Get()
  async listAll(
    @Query('search') search?: string,
    @Query('status') status?: RegistrationStatus,
    @Query('classProgramId') classProgramId?: string,
    @Query('branchId') branchId?: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '25',
  ) {
    const data = await this.registrationsService.listAllRegistrations(
      search,
      status,
      classProgramId || branchId,
      parseInt(page, 10) || 1,
      parseInt(perPage, 10) || 25,
    );
    return { success: true, ...data };
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/verification-list')
  async getAdminVerificationList(
    @Query('search') search?: string,
    @Query('formStatus') formStatus?: FormStatus,
    @Query('academicPeriodId') academicPeriodId?: string,
    @Query('admissionWaveId') admissionWaveId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '25',
  ) {
    return this.registrationsService.getAdminVerificationList({
      search,
      formStatus,
      academicPeriodId,
      admissionWaveId,
      schoolId,
      page: parseInt(page, 10) || 1,
      perPage: parseInt(perPage, 10) || 25,
    });
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin/final-verification-list')
  async getFinalVerificationList(
    @Query('search') search?: string,
    @Query('finalStatus') finalStatus?: any,
    @Query('onlyCompletedStages') onlyCompletedStages?: string,
    @Query('academicPeriodId') academicPeriodId?: string,
    @Query('admissionWaveId') admissionWaveId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('majorId') majorId?: string,
    @Query('page') page = '1',
    @Query('perPage') perPage = '25',
  ) {
    return this.registrationsService.getFinalVerificationList({
      search,
      finalStatus,
      onlyCompletedStages: onlyCompletedStages !== undefined ? (onlyCompletedStages === 'true') : undefined,
      academicPeriodId,
      admissionWaveId,
      schoolId,
      majorId,
      page: parseInt(page, 10) || 1,
      perPage: parseInt(perPage, 10) || 25,
    });
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post(':id/final-verification')
  async performFinalVerification(
    @Param('id') id: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: { finalStatus: any; notes?: string },
  ) {
    const data = await this.registrationsService.performFinalVerification(id, dto, adminUserId);
    return {
      success: true,
      message: 'Keputusan verifikasi final calon santri berhasil disimpan!',
      data,
    };
  }

  @Get('my')
  async getMyRegistrations(@CurrentUser('id') userId: string) {
    const data = await this.registrationsService.getUserRegistrations(userId);
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  async getRegistrationDetail(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const data = await this.registrationsService.getRegistrationById(id, userId, role);
    return {
      success: true,
      data,
    };
  }

  /**
   * Endpoint to verify full form access gate.
   * Throws 403 Forbidden if payment is not APPROVED.
   */
  @Get(':id/form-gate')
  async checkFormGate(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.registrationsService.checkFullFormAccess(id, userId, role);
  }

  /**
   * Get Full Application Form data.
   */
  @Get(':id/form')
  async getRegistrationForm(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.registrationsService.getRegistrationForm(id, userId, role);
  }

  /**
   * Save form draft (partial).
   */
  @Put(':id/form/draft')
  async saveFormDraft(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() dto: SaveFormDraftDto,
  ) {
    return this.registrationsService.saveFormDraft(id, userId, role, dto);
  }

  @Post(':id/form/draft')
  async saveFormDraftPost(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() dto: SaveFormDraftDto,
  ) {
    return this.registrationsService.saveFormDraft(id, userId, role, dto);
  }

  /**
   * Final Submit Full Application Form.
   */
  @Post(':id/form/submit')
  async submitFullForm(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body() dto: SubmitFullFormDto,
  ) {
    return this.registrationsService.submitFullForm(id, userId, role, dto);
  }

  /**
   * Upload Document.
   */
  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Body('documentType') documentType: DocumentType,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.registrationsService.uploadDocument(id, userId, role, documentType, file);
  }

  /**
   * Delete Document.
   */
  @Delete(':id/documents/:docId')
  async deleteDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    return this.registrationsService.deleteDocument(id, docId, userId, role);
  }

  /**
   * Stream Document File securely.
   */
  @Get(':id/documents/:docId/file')
  async getDocumentFile(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Res() res: Response,
  ) {
    const docInfo = await this.registrationsService.getDocumentFile(id, docId, userId, role);
    res.setHeader('Content-Type', docInfo.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${docInfo.fileName}"`);
    const stream = fs.createReadStream(docInfo.filePath);
    stream.pipe(res);
  }

  @Get('documents/:docId/file')
  async getDocumentFileDirect(
    @Param('docId') docId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Res() res: Response,
  ) {
    const docInfo = await this.registrationsService.getDocumentFileDirect(docId, userId, role);
    res.setHeader('Content-Type', docInfo.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${docInfo.fileName}"`);
    const stream = fs.createReadStream(docInfo.filePath);
    stream.pipe(res);
  }

  /**
   * Admin / Super Admin: Verify candidate data -> VERIFIED.
   */
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post(':id/verify')
  async verifyCandidate(
    @Param('id') id: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.registrationsService.verifyCandidateForm(id, adminUserId);
  }

  /**
   * Admin / Super Admin: Request revision -> REVISION_REQUIRED.
   */
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post(':id/request-revision')
  async requestRevision(
    @Param('id') id: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: RequestRevisionDto,
  ) {
    return this.registrationsService.requestCandidateRevision(id, adminUserId, dto);
  }
}

function regIdOrId(id: string) {
  return id;
}
