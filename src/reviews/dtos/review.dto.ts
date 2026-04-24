import { IsIn, IsNotEmpty, IsNumber, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateReviewDto {
  @ApiProperty({ example: 'Excelente estadía' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'El hotel superó todas mis expectativas...' })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiProperty({ example: 4.5 })
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @IsIn([1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5])
  score: number;

  @ApiProperty({ example: 'uuid-de-la-organizacion' })
  @IsUUID()
  @IsNotEmpty()
  organizationalId: string;
}

export class UpdateReviewDto extends PartialType(CreateReviewDto) {}

export class CreateReviewReplyDto {
  @ApiProperty({ example: 'Gracias por su comentario!' })
  @IsString()
  @IsNotEmpty()
  comment: string;
}

export class UpdateReviewReplyDto extends PartialType(CreateReviewReplyDto) {}
