import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { RegistrationFlowService } from './registration-flow.service';
import { CreateFlowStepDto } from './dto/create-flow-step.dto';
import { UpdateFlowStepDto } from './dto/update-flow-step.dto';
import { ReorderFlowStepsDto } from './dto/reorder-flow-step.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('registration-flow')
export class RegistrationFlowController {
  constructor(private readonly service: RegistrationFlowService) {}

  /**
   * Publik: Ambil langkah aktif untuk Homepage / Guide
   */
  @Public()
  @Get('active')
  async getActiveSteps() {
    const data = await this.service.getActiveSteps();
    return { success: true, data };
  }

  /**
   * Super Admin: Semua langkah (termasuk nonaktif)
   */
  @Roles(Role.SUPER_ADMIN)
  @Get()
  async getAllSteps() {
    const data = await this.service.getAllSteps();
    return { success: true, data };
  }

  /**
   * Super Admin: Urutkan ulang langkah (drag & drop)
   */
  @Roles(Role.SUPER_ADMIN)
  @Patch('reorder')
  async reorderSteps(@Body() dto: ReorderFlowStepsDto) {
    const data = await this.service.reorderSteps(dto.stepIds);
    return { success: true, message: 'Urutan langkah berhasil diperbarui.', data };
  }

  /**
   * Super Admin: Detail 1 langkah
   */
  @Roles(Role.SUPER_ADMIN)
  @Get(':id')
  async getStepById(@Param('id') id: string) {
    const data = await this.service.getStepById(id);
    return { success: true, data };
  }

  /**
   * Super Admin: Tambah langkah baru
   */
  @Roles(Role.SUPER_ADMIN)
  @Post()
  async createStep(@Body() dto: CreateFlowStepDto) {
    const data = await this.service.createStep(dto);
    return { success: true, message: 'Langkah berhasil ditambahkan.', data };
  }

  /**
   * Super Admin: Update langkah
   */
  @Roles(Role.SUPER_ADMIN)
  @Patch(':id')
  async updateStep(@Param('id') id: string, @Body() dto: UpdateFlowStepDto) {
    const data = await this.service.updateStep(id, dto);
    return { success: true, message: 'Langkah berhasil diperbarui.', data };
  }

  /**
   * Super Admin: Toggle status aktif/nonaktif
   */
  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    const data = await this.service.updateStatus(id, isActive);
    return {
      success: true,
      message: `Status langkah diubah menjadi ${data.isActive ? 'Aktif' : 'Nonaktif'}.`,
      data,
    };
  }

  /**
   * Super Admin: Hapus langkah
   */
  @Roles(Role.SUPER_ADMIN)
  @Delete(':id')
  async deleteStep(@Param('id') id: string) {
    return this.service.deleteStep(id);
  }
}
