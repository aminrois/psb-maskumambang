import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto, ResetOperationalDataDto } from './dto/settings.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get()
  async getSettings() {
    const settings = await this.settingsService.getSettings();
    return { success: true, data: settings };
  }

  @Roles(Role.SUPER_ADMIN)
  @Post()
  async updateSettings(
    @CurrentUser('id') staffId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    const updated = await this.settingsService.updateSettings(staffId, dto);
    return {
      success: true,
      message: 'Pengaturan branding berhasil diperbarui.',
      data: updated,
    };
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('logo')
  @UseInterceptors(FileInterceptor('logo'))
  async uploadLogo(
    @CurrentUser('id') staffId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.settingsService.uploadBrandingFile(staffId, file, 'logo');
    return {
      success: true,
      message: 'Logo aplikasi berhasil diperbarui.',
      data: result,
    };
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('favicon')
  @UseInterceptors(FileInterceptor('favicon'))
  async uploadFavicon(
    @CurrentUser('id') staffId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.settingsService.uploadBrandingFile(staffId, file, 'favicon');
    return {
      success: true,
      message: 'Favicon aplikasi berhasil diperbarui.',
      data: result,
    };
  }

  @Roles(Role.SUPER_ADMIN)
  @Post('reset-operational-data')
  async resetOperationalData(
    @CurrentUser('id') staffId: string,
    @Body() dto: ResetOperationalDataDto,
  ) {
    const result = await this.settingsService.resetOperationalData(staffId, dto);
    return result;
  }
}
