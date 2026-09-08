import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { HeroSliderService } from './hero-slider.service';
import { CreateHeroSliderDto } from './dto/create-hero-slider.dto';
import { UpdateHeroSliderDto } from './dto/update-hero-slider.dto';
import { ReorderHeroSlidersDto } from './dto/reorder-hero-slider.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('hero-sliders')
export class HeroSliderController {
  constructor(private readonly heroSliderService: HeroSliderService) {}

  /**
   * Endpoint Publik: Mengambil slider aktif untuk Homepage
   */
  @Public()
  @Get('active')
  async getActiveSliders() {
    const data = await this.heroSliderService.getActiveSliders();
    return {
      success: true,
      data,
    };
  }

  /**
   * Endpoint Super Admin: Mengambil semua slider (aktif maupun nonaktif)
   */
  @Roles(Role.SUPER_ADMIN)
  @Get()
  async getAllSliders() {
    const data = await this.heroSliderService.getAllSliders();
    return {
      success: true,
      data,
    };
  }

  /**
   * Endpoint Super Admin: Mengubah urutan slider secara batch (Drag & Drop)
   */
  @Roles(Role.SUPER_ADMIN)
  @Patch('reorder')
  async reorderSliders(
    @CurrentUser('id') userId: string,
    @Body() dto: ReorderHeroSlidersDto,
  ) {
    const data = await this.heroSliderService.reorderSliders(userId, dto.sliderIds);
    return {
      success: true,
      message: 'Urutan slider berhasil diperbarui.',
      data,
    };
  }

  /**
   * Endpoint Super Admin: Mengambil detail 1 slider
   */
  @Roles(Role.SUPER_ADMIN)
  @Get(':id')
  async getSliderById(@Param('id') id: string) {
    const data = await this.heroSliderService.getSliderById(id);
    return {
      success: true,
      data,
    };
  }

  /**
   * Endpoint Super Admin: Menambah slider baru dengan upload gambar Desktop & Mobile
   */
  @Roles(Role.SUPER_ADMIN)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'desktop_image', maxCount: 1 },
      { name: 'mobile_image', maxCount: 1 },
    ]),
  )
  async createSlider(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateHeroSliderDto,
    @UploadedFiles()
    files: {
      desktop_image?: Express.Multer.File[];
      mobile_image?: Express.Multer.File[];
    },
  ) {
    const data = await this.heroSliderService.createSlider(userId, dto, files);
    return {
      success: true,
      message: 'Hero Slider berhasil ditambahkan.',
      data,
    };
  }

  /**
   * Endpoint Super Admin: Mengubah status aktif/nonaktif slider
   */
  @Roles(Role.SUPER_ADMIN)
  @Patch(':id/status')
  async updateStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    const data = await this.heroSliderService.updateStatus(userId, id, isActive);
    return {
      success: true,
      message: `Status slider berhasil diubah menjadi ${data.isActive ? 'Aktif' : 'Nonaktif'}.`,
      data,
    };
  }

  /**
   * Endpoint Super Admin: Mengupdate data slider dan/atau mengganti gambar
   */
  @Roles(Role.SUPER_ADMIN)
  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'desktop_image', maxCount: 1 },
      { name: 'mobile_image', maxCount: 1 },
    ]),
  )
  async updateSlider(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateHeroSliderDto,
    @UploadedFiles()
    files: {
      desktop_image?: Express.Multer.File[];
      mobile_image?: Express.Multer.File[];
    },
  ) {
    const data = await this.heroSliderService.updateSlider(userId, id, dto, files);
    return {
      success: true,
      message: 'Hero Slider berhasil diperbarui.',
      data,
    };
  }

  /**
   * Endpoint Super Admin: Menghapus slider
   */
  @Roles(Role.SUPER_ADMIN)
  @Delete(':id')
  async deleteSlider(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.heroSliderService.deleteSlider(userId, id);
  }
}
