import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateHeroSliderDto } from './dto/create-hero-slider.dto';
import { UpdateHeroSliderDto } from './dto/update-hero-slider.dto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
];
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

@Injectable()
export class HeroSliderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private getUploadDirs(): string[] {
    return [
      path.resolve(process.cwd(), 'public/uploads/hero-slider'),
      path.resolve(process.cwd(), 'uploads/hero-slider'),
    ];
  }

  private saveImageFile(file: Express.Multer.File, prefix: string): string {
    if (!file || !file.buffer) {
      throw new BadRequestException('File gambar tidak ditemukan.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Format file tidak didukung (${file.mimetype}). Hanya format JPG, JPEG, PNG, WEBP yang diperbolehkan.`,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(2)} MB). Maksimal ukuran adalah 2 MB.`,
      );
    }

    let ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!ext) {
      if (file.mimetype === 'image/webp') ext = 'webp';
      else if (file.mimetype === 'image/png') ext = 'png';
      else if (file.mimetype === 'image/svg+xml') ext = 'svg';
      else ext = 'jpg';
    }

    const hash = crypto.randomBytes(6).toString('hex');
    const filename = `${prefix}_${Date.now()}_${hash}.${ext}`;

    const dirs = this.getUploadDirs();
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(path.join(dir, filename), file.buffer);
    }

    return filename;
  }

  private safeDeleteFile(filename?: string | null) {
    if (!filename) return;
    // Do not delete default sample assets if referenced
    if (filename.startsWith('slide1-') || filename.startsWith('slide2-') || filename.startsWith('slide3-')) {
      return;
    }
    const dirs = this.getUploadDirs();
    for (const dir of dirs) {
      const filePath = path.join(dir, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          // ignore unlink error
        }
      }
    }
  }

  /**
   * Mengambil semua slider aktif untuk tampilan publik diurutkan berdasarkan sort_order ASC
   */
  async getActiveSliders() {
    const sliders = await this.prisma.heroSlider.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // Jika database kosong, buat default sample seed agar homepage langsung tampil memukau
    if (sliders.length === 0) {
      const defaultSliders = await this.seedDefaultSliders();
      return defaultSliders.filter((s) => s.isActive);
    }

    return sliders;
  }

  /**
   * Mengambil seluruh slider untuk manajemen Super Admin diurutkan berdasarkan sort_order ASC
   */
  async getAllSliders() {
    const sliders = await this.prisma.heroSlider.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    if (sliders.length === 0) {
      return this.seedDefaultSliders();
    }

    return sliders;
  }

  /**
   * Mengambil detail 1 slider
   */
  async getSliderById(id: string) {
    const slider = await this.prisma.heroSlider.findUnique({
      where: { id },
    });

    if (!slider) {
      throw new NotFoundException(`Hero slider dengan ID ${id} tidak ditemukan.`);
    }

    return slider;
  }

  /**
   * Menambah slider baru
   */
  async createSlider(
    userId: string,
    dto: CreateHeroSliderDto,
    files: {
      desktop_image?: Express.Multer.File[];
      mobile_image?: Express.Multer.File[];
    },
  ) {
    const desktopFile = files?.desktop_image?.[0];
    const mobileFile = files?.mobile_image?.[0];

    if (!desktopFile) {
      throw new BadRequestException('Gambar Desktop wajib diupload.');
    }

    const desktopImage = this.saveImageFile(desktopFile, 'desktop');
    const mobileImage = mobileFile ? this.saveImageFile(mobileFile, 'mobile') : null;

    // Kalkulasi sortOrder jika tidak disediakan
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const last = await this.prisma.heroSlider.findFirst({
        orderBy: { sortOrder: 'desc' },
      });
      sortOrder = last ? last.sortOrder + 1 : 1;
    }

    const slider = await this.prisma.heroSlider.create({
      data: {
        badge: dto.badge?.trim() || null,
        title: dto.title.trim(),
        description: dto.description.trim(),
        primaryButtonText: dto.primaryButtonText?.trim() || null,
        primaryButtonUrl: dto.primaryButtonUrl?.trim() || null,
        secondaryButtonText: dto.secondaryButtonText?.trim() || null,
        secondaryButtonUrl: dto.secondaryButtonUrl?.trim() || null,
        desktopImage,
        mobileImage,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        sortOrder,
      },
    });

    await this.auditService.log({
      userId,
      action: 'CREATE_HERO_SLIDER',
      targetTable: 'hero_sliders',
      details: `Super Admin menambahkan Hero Slider baru: "${slider.title}" (ID: ${slider.id})`,
    });

    return slider;
  }

  /**
   * Mengedit slider
   */
  async updateSlider(
    userId: string,
    id: string,
    dto: UpdateHeroSliderDto,
    files?: {
      desktop_image?: Express.Multer.File[];
      mobile_image?: Express.Multer.File[];
    },
  ) {
    const existing = await this.getSliderById(id);

    let desktopImage = existing.desktopImage;
    let mobileImage = existing.mobileImage;

    const newDesktopFile = files?.desktop_image?.[0];
    const newMobileFile = files?.mobile_image?.[0];

    if (newDesktopFile) {
      this.safeDeleteFile(existing.desktopImage);
      desktopImage = this.saveImageFile(newDesktopFile, 'desktop');
    }

    if (dto.removeMobileImage) {
      this.safeDeleteFile(existing.mobileImage);
      mobileImage = null;
    } else if (newMobileFile) {
      this.safeDeleteFile(existing.mobileImage);
      mobileImage = this.saveImageFile(newMobileFile, 'mobile');
    }

    const updated = await this.prisma.heroSlider.update({
      where: { id },
      data: {
        badge: dto.badge !== undefined ? (dto.badge?.trim() || null) : existing.badge,
        title: dto.title !== undefined ? dto.title.trim() : existing.title,
        description: dto.description !== undefined ? dto.description.trim() : existing.description,
        primaryButtonText:
          dto.primaryButtonText !== undefined ? (dto.primaryButtonText?.trim() || null) : existing.primaryButtonText,
        primaryButtonUrl:
          dto.primaryButtonUrl !== undefined ? (dto.primaryButtonUrl?.trim() || null) : existing.primaryButtonUrl,
        secondaryButtonText:
          dto.secondaryButtonText !== undefined ? (dto.secondaryButtonText?.trim() || null) : existing.secondaryButtonText,
        secondaryButtonUrl:
          dto.secondaryButtonUrl !== undefined ? (dto.secondaryButtonUrl?.trim() || null) : existing.secondaryButtonUrl,
        desktopImage,
        mobileImage,
        isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : existing.sortOrder,
      },
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE_HERO_SLIDER',
      targetTable: 'hero_sliders',
      details: `Super Admin memperbarui Hero Slider "${updated.title}" (ID: ${id})`,
    });

    return updated;
  }

  /**
   * Mengubah status aktif / nonaktif slider
   */
  async updateStatus(userId: string, id: string, isActive: boolean) {
    const slider = await this.getSliderById(id);

    const updated = await this.prisma.heroSlider.update({
      where: { id },
      data: { isActive },
    });

    await this.auditService.log({
      userId,
      action: 'UPDATE_HERO_SLIDER_STATUS',
      targetTable: 'hero_sliders',
      details: `Super Admin mengubah status Hero Slider "${slider.title}" menjadi ${isActive ? 'AKTIF' : 'NONAKTIF'}`,
    });

    return updated;
  }

  /**
   * Reorder urutan slider berdasarkan array ID
   */
  async reorderSliders(userId: string, sliderIds: string[]) {
    await this.prisma.$transaction(
      sliderIds.map((id, index) =>
        this.prisma.heroSlider.update({
          where: { id },
          data: { sortOrder: index + 1 },
        }),
      ),
    );

    await this.auditService.log({
      userId,
      action: 'REORDER_HERO_SLIDERS',
      targetTable: 'hero_sliders',
      details: `Super Admin mengubah urutan Hero Slider (${sliderIds.length} sliders).`,
    });

    return this.getAllSliders();
  }

  /**
   * Menghapus slider
   */
  async deleteSlider(userId: string, id: string) {
    const slider = await this.getSliderById(id);

    this.safeDeleteFile(slider.desktopImage);
    this.safeDeleteFile(slider.mobileImage);

    await this.prisma.heroSlider.delete({
      where: { id },
    });

    await this.auditService.log({
      userId,
      action: 'DELETE_HERO_SLIDER',
      targetTable: 'hero_sliders',
      details: `Super Admin menghapus Hero Slider "${slider.title}" (ID: ${id})`,
    });

    return {
      success: true,
      message: `Slider "${slider.title}" berhasil dihapus.`,
    };
  }

  /**
   * Seed data slider awal jika tabel masih kosong
   */
  private async seedDefaultSliders() {
    const defaultData = [
      {
        badge: 'Tahun Pelajaran 2026/2027',
        title: 'Mari Bergabung di PSB Maskumambang',
        description:
          'Bersama kami membentuk generasi berakhlak mulia, berilmu, dan berdaya saing di masa depan.',
        primaryButtonText: 'Daftar Sekarang',
        primaryButtonUrl: '/register.html',
        secondaryButtonText: 'Lihat Panduan',
        secondaryButtonUrl: '/guide.html',
        desktopImage: 'slide1-desktop.svg',
        mobileImage: 'slide1-mobile.svg',
        isActive: true,
        sortOrder: 1,
      },
      {
        badge: 'Keunggulan',
        title: 'Pendidikan Pesantren dan Akademik Berkualitas',
        description:
          'Kurikulum terpadu memadukan wawasan keagamaan, sains modern, teknologi, dan bahasa asing terapan.',
        primaryButtonText: 'Pilihan Jenjang',
        primaryButtonUrl: '#branches-grid',
        secondaryButtonText: 'Brosur & Rincian',
        secondaryButtonUrl: '/guide.html',
        desktopImage: 'slide2-desktop.svg',
        mobileImage: 'slide2-mobile.svg',
        isActive: true,
        sortOrder: 2,
      },
      {
        badge: 'Informasi',
        title: 'Pendaftaran Dibuka Tahun 2026/2027',
        description:
          'Segera daftarkan putra dan putri Anda. Kuota terbatas untuk jenjang MI, MTs, SMP, MA, dan SMA.',
        primaryButtonText: 'Daftar Akun',
        primaryButtonUrl: '/register.html',
        secondaryButtonText: null,
        secondaryButtonUrl: null,
        desktopImage: 'slide3-desktop.svg',
        mobileImage: 'slide3-mobile.svg',
        isActive: true,
        sortOrder: 3,
      },
    ];

    const created = [];
    for (const item of defaultData) {
      const slide = await this.prisma.heroSlider.create({
        data: item,
      });
      created.push(slide);
    }

    return created;
  }
}
