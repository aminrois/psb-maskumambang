import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class ReorderHeroSlidersDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'sliderIds tidak boleh kosong' })
  @IsString({ each: true })
  sliderIds!: string[];
}
