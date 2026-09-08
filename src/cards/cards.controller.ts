import { Controller, Get, Param } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Get(':registrationId')
  async getCard(
    @Param('registrationId') registrationId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
  ) {
    const cardData = await this.cardsService.getParticipantCard(
      registrationId,
      userId,
      role,
    );

    return {
      success: true,
      data: cardData,
    };
  }
}
