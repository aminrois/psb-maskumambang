import { Controller, Get, Query } from '@nestjs/common';
import { PublicService } from './public.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Public()
  @Get('cek-peserta')
  async checkParticipants(@Query('q') q?: string) {
    const results = await this.publicService.searchParticipants(q);
    return {
      success: true,
      count: results.length,
      results,
    };
  }
}
