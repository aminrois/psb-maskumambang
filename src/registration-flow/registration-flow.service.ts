import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFlowStepDto } from './dto/create-flow-step.dto';
import { UpdateFlowStepDto } from './dto/update-flow-step.dto';

const DEFAULT_STEPS = [
  {
    stepNumber: '01',
    title: 'Buat Akun PSB',
    description:
      'Daftarkan akun calon santri atau wali santri secara online dan verifikasi nomor WhatsApp/Email aktif.',
    icon: 'fa-user-plus',
    badgeColor: '#4f46e5',
    isActive: true,
    sortOrder: 1,
  },
  {
    stepNumber: '02',
    title: 'Pilih Jenjang & Isi Biodata',
    description:
      'Tentukan jenjang pendidikan yang dituju (MI, MTs, SMP, MA, SMA) dan lengkapi data formulir pendaftaran santri baru.',
    icon: 'fa-school',
    badgeColor: '#7c3aed',
    isActive: true,
    sortOrder: 2,
  },
  {
    stepNumber: '03',
    title: 'Pembayaran Biaya Pendaftaran',
    description:
      'Lakukan pembayaran biaya formulir pendaftaran sesuai petunjuk rekening/Virtual Account resmi panitia PSB.',
    icon: 'fa-money-bill-wave',
    badgeColor: '#059669',
    isActive: true,
    sortOrder: 3,
  },
  {
    stepNumber: '04',
    title: 'Unggah Berkas Persyaratan',
    description:
      'Unggah dokumen pendukung seperti Kartu Keluarga, Akta Kelahiran, Pas Foto terbaru, dan dokumen rapor.',
    icon: 'fa-folder-open',
    badgeColor: '#d97706',
    isActive: true,
    sortOrder: 4,
  },
  {
    stepNumber: '05',
    title: 'Tes Seleksi CBT & Wawancara',
    description:
      'Mengikuti ujian seleksi masuk berbasis komputer (CBT) serta sesi wawancara santri dan orang tua/wali.',
    icon: 'fa-graduation-cap',
    badgeColor: '#8b5cf6',
    isActive: true,
    sortOrder: 5,
  },
  {
    stepNumber: '06',
    title: 'Pengumuman & Daftar Ulang',
    description:
      'Cek hasil pengumuman kelulusan seleksi secara resmi di portal PSB dan selesaikan tahapan daftar ulang santri.',
    icon: 'fa-bullhorn',
    badgeColor: '#dc2626',
    isActive: true,
    sortOrder: 6,
  },
];

@Injectable()
export class RegistrationFlowService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seed default steps if table is empty
   */
  async seedDefaultIfEmpty(): Promise<void> {
    const count = await this.prisma.registrationFlowStep.count();
    if (count === 0) {
      await this.prisma.registrationFlowStep.createMany({
        data: DEFAULT_STEPS,
      });
    }
  }

  /**
   * Get all active steps (public)
   */
  async getActiveSteps() {
    await this.seedDefaultIfEmpty();
    return this.prisma.registrationFlowStep.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get all steps (admin)
   */
  async getAllSteps() {
    await this.seedDefaultIfEmpty();
    return this.prisma.registrationFlowStep.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Get single step by id
   */
  async getStepById(id: string) {
    const step = await this.prisma.registrationFlowStep.findUnique({
      where: { id },
    });
    if (!step) throw new NotFoundException('Langkah alur pendaftaran tidak ditemukan.');
    return step;
  }

  /**
   * Create new step
   */
  async createStep(dto: CreateFlowStepDto) {
    const maxOrder = await this.prisma.registrationFlowStep.aggregate({
      _max: { sortOrder: true },
    });
    const nextOrder = (maxOrder._max.sortOrder || 0) + 1;
    return this.prisma.registrationFlowStep.create({
      data: {
        stepNumber: dto.stepNumber,
        title: dto.title,
        description: dto.description,
        icon: dto.icon || 'fa-diagram-project',
        badgeColor: dto.badgeColor || '#0284c7',
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        sortOrder: dto.sortOrder || nextOrder,
      },
    });
  }

  /**
   * Update a step
   */
  async updateStep(id: string, dto: UpdateFlowStepDto) {
    await this.getStepById(id);
    return this.prisma.registrationFlowStep.update({
      where: { id },
      data: {
        ...(dto.stepNumber !== undefined && { stepNumber: dto.stepNumber }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.badgeColor !== undefined && { badgeColor: dto.badgeColor }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  /**
   * Toggle active status
   */
  async updateStatus(id: string, isActive: boolean) {
    await this.getStepById(id);
    return this.prisma.registrationFlowStep.update({
      where: { id },
      data: { isActive },
    });
  }

  /**
   * Reorder steps via drag & drop
   */
  async reorderSteps(stepIds: string[]) {
    await Promise.all(
      stepIds.map((id, index) =>
        this.prisma.registrationFlowStep.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );
    return this.getAllSteps();
  }

  /**
   * Delete a step
   */
  async deleteStep(id: string) {
    await this.getStepById(id);
    await this.prisma.registrationFlowStep.delete({ where: { id } });
    return { success: true, message: 'Langkah berhasil dihapus.' };
  }
}
