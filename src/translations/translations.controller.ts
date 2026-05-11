import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { TranslationService } from '../shared/services/translation.service';

class TranslateTextDto {
  @ApiProperty({ example: 'Excelente estadía, muy recomendado' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000)
  text: string;

  @ApiProperty({ example: 'en' })
  @IsString()
  @IsNotEmpty()
  to: string;
}

@Controller('translate')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 15, ttl: 60000 } })
export class TranslationsController {
  constructor(private readonly _translationService: TranslationService) {}

  @Post()
  async translate(@Body() dto: TranslateTextDto): Promise<{ text: string }> {
    const text = await this._translationService.translateText(dto.text, dto.to);
    return { text };
  }
}
