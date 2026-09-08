import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { WilayahService } from './wilayah.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Read-only master data endpoint for Indonesian administrative regions.
 * No authentication required — this is public geographic reference data.
 *
 * GET /api/wilayah/provinces
 * GET /api/wilayah/regencies/:provinceCode
 * GET /api/wilayah/districts/:regencyCode
 * GET /api/wilayah/villages/:districtCode
 */
@Public()
@Controller('wilayah')
export class WilayahController {
  constructor(private readonly wilayahService: WilayahService) {}

  @Get('provinces')
  @HttpCode(HttpStatus.OK)
  async getProvinces() {
    const data = await this.wilayahService.getProvinces();
    return { success: true, data };
  }

  @Get('regencies/:provinceCode')
  @HttpCode(HttpStatus.OK)
  async getRegencies(@Param('provinceCode') provinceCode: string) {
    const data = await this.wilayahService.getRegencies(provinceCode);
    return { success: true, data };
  }

  @Get('districts/:regencyCode')
  @HttpCode(HttpStatus.OK)
  async getDistricts(@Param('regencyCode') regencyCode: string) {
    const data = await this.wilayahService.getDistricts(regencyCode);
    return { success: true, data };
  }

  @Get('villages/:districtCode')
  @HttpCode(HttpStatus.OK)
  async getVillages(@Param('districtCode') districtCode: string) {
    const data = await this.wilayahService.getVillages(districtCode);
    return { success: true, data };
  }
}
