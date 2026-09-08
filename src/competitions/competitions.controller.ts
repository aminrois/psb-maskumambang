import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { CompetitionsService } from './competitions.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  CreateSchoolDto,
  UpdateSchoolDto,
  CreateMajorDto,
  UpdateMajorDto,
  CreateClassProgramDto,
  UpdateClassProgramDto,
} from './dto/competition.dto';

@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  // --- Public Endpoints ---

  @Public()
  @Get('tree')
  async getCompetitionTree() {
    const tree = await this.competitionsService.getTree();
    return {
      success: true,
      data: tree,
    };
  }

  @Public()
  @Get('branch/:id')
  async getBranchDetail(@Param('id') id: string) {
    const branch = await this.competitionsService.getBranchDetail(id);
    return {
      success: true,
      data: branch,
    };
  }

  // --- Super Admin Management Endpoints ---

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('categories')
  async getAllCategories() {
    const categories = await this.competitionsService.getAllCategories();
    return { success: true, data: categories };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('categories')
  async createCategory(@Body() dto: CreateSchoolDto) {
    const created = await this.competitionsService.createCategory(dto);
    return { success: true, message: 'Sekolah berhasil dibuat.', data: created };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('categories/:id')
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    const updated = await this.competitionsService.updateCategory(id, dto);
    return { success: true, message: 'Sekolah berhasil diperbarui.', data: updated };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('categories/:id/toggle')
  async toggleCategory(@Param('id') id: string) {
    const toggled = await this.competitionsService.toggleCategory(id);
    return {
      success: true,
      message: `Status sekolah diubah menjadi: ${toggled.isActive ? 'AKTIF' : 'NONAKTIF'}`,
      data: toggled,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('categories/:categoryId/levels')
  async getLevelsByCategory(@Param('categoryId') categoryId: string) {
    const levels = await this.competitionsService.getLevelsByCategory(categoryId);
    return { success: true, data: levels };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('levels')
  async createLevel(@Body() dto: CreateMajorDto) {
    const created = await this.competitionsService.createLevel(dto);
    return { success: true, message: 'Jurusan berhasil dibuat.', data: created };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('levels/:id')
  async updateLevel(@Param('id') id: string, @Body() dto: UpdateMajorDto) {
    const updated = await this.competitionsService.updateLevel(id, dto);
    return { success: true, message: 'Jurusan berhasil diperbarui.', data: updated };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('levels/:levelId/branches')
  async getBranchesByLevel(@Param('levelId') levelId: string) {
    const branches = await this.competitionsService.getBranchesByLevel(levelId);
    return { success: true, data: branches };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('branches')
  async createBranch(@Body() dto: CreateClassProgramDto) {
    const created = await this.competitionsService.createBranch(dto);
    return { success: true, message: 'Program kelas berhasil dibuat.', data: created };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('levels/all')
  async getAllLevels() {
    const levels = await this.competitionsService.getAllLevels();
    return { success: true, data: levels };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('levels')
  async getLevels() {
    const levels = await this.competitionsService.getAllLevels();
    return { success: true, data: levels };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('branches/all')
  async getAllBranches() {
    const branches = await this.competitionsService.getAllBranches();
    return { success: true, data: branches };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('branches')
  async getBranches() {
    const branches = await this.competitionsService.getAllBranches();
    return { success: true, data: branches };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    const deleted = await this.competitionsService.deleteCategory(id);
    return { success: true, message: 'Sekolah berhasil dihapus.', data: deleted };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('levels/:id')
  async deleteLevel(@Param('id') id: string) {
    const deleted = await this.competitionsService.deleteLevel(id);
    return { success: true, message: 'Jurusan berhasil dihapus.', data: deleted };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('branches/:id')
  async updateBranch(@Param('id') id: string, @Body() dto: UpdateClassProgramDto) {
    const updated = await this.competitionsService.updateBranch(id, dto);
    return { success: true, message: 'Program kelas berhasil diperbarui.', data: updated };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('branches/:id')
  async deleteBranch(@Param('id') id: string) {
    const deleted = await this.competitionsService.deleteBranch(id);
    return { success: true, message: 'Program kelas berhasil dihapus.', data: deleted };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('branches/:id/toggle')
  async toggleBranch(@Param('id') id: string) {
    const toggled = await this.competitionsService.toggleBranch(id);
    return {
      success: true,
      message: `Status program kelas diubah menjadi: ${toggled.isActive ? 'AKTIF' : 'NONAKTIF'}`,
      data: toggled,
    };
  }

  // =========================================================================
  // ACADEMIC PERIODS (PERIODE TAHUN PELAJARAN)
  // =========================================================================
  @Public()
  @Get('periods/active')
  async getActivePeriod() {
    const period = await this.competitionsService.getActivePeriod();
    return { success: true, data: period };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('periods')
  async getAllPeriods() {
    const periods = await this.competitionsService.getAllPeriods();
    return { success: true, data: periods };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('periods')
  async createPeriod(@Body() dto: any) {
    const created = await this.competitionsService.createPeriod(dto);
    return { success: true, message: 'Periode tahun pelajaran berhasil dibuat.', data: created };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('periods/:id')
  async updatePeriod(@Param('id') id: string, @Body() dto: any) {
    const updated = await this.competitionsService.updatePeriod(id, dto);
    return { success: true, message: 'Periode tahun pelajaran berhasil diperbarui.', data: updated };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('periods/:id/toggle')
  async togglePeriod(@Param('id') id: string) {
    const toggled = await this.competitionsService.togglePeriod(id);
    return {
      success: true,
      message: `Status periode diubah menjadi: ${toggled.isActive ? 'AKTIF' : 'NONAKTIF'}`,
      data: toggled,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('periods/:id')
  async deletePeriod(@Param('id') id: string) {
    const deleted = await this.competitionsService.deletePeriod(id);
    return { success: true, message: 'Periode tahun pelajaran berhasil dihapus.', data: deleted };
  }

  // =========================================================================
  // ADMISSION WAVES (GELOMBANG PENDAFTARAN)
  // =========================================================================
  @Public()
  @Get('waves/active')
  async getActiveWaves() {
    const waves = await this.competitionsService.getActiveWaves();
    return { success: true, data: waves };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('waves')
  async getAllWaves() {
    const waves = await this.competitionsService.getAllWaves();
    return { success: true, data: waves };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Get('waves/by-period/:periodId')
  async getWavesByPeriod(@Param('periodId') periodId: string) {
    const waves = await this.competitionsService.getWavesByPeriod(periodId);
    return { success: true, data: waves };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post('waves')
  async createWave(@Body() dto: any) {
    const created = await this.competitionsService.createWave(dto);
    return { success: true, message: 'Gelombang pendaftaran berhasil dibuat.', data: created };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('waves/:id')
  async updateWave(@Param('id') id: string, @Body() dto: any) {
    const updated = await this.competitionsService.updateWave(id, dto);
    return { success: true, message: 'Gelombang pendaftaran berhasil diperbarui.', data: updated };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch('waves/:id/toggle')
  async toggleWave(@Param('id') id: string) {
    const toggled = await this.competitionsService.toggleWave(id);
    return {
      success: true,
      message: `Status gelombang diubah menjadi: ${toggled.isActive ? 'AKTIF' : 'NONAKTIF'}`,
      data: toggled,
    };
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete('waves/:id')
  async deleteWave(@Param('id') id: string) {
    const deleted = await this.competitionsService.deleteWave(id);
    return { success: true, message: 'Gelombang pendaftaran berhasil dihapus.', data: deleted };
  }
}

