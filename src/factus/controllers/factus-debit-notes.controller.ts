import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SkipApiKey } from '../../shared/decorators/skip-api-key.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';
import { FactusDebitNoteService } from '../services/factus-debit-note.service';

class DebitNoteItemDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @IsNumber()
  @Min(0.01)
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsString()
  taxCode?: string;
}

class CreateDebitNoteDto {
  /** '1' intereses · '2' gastos por cobrar · '3' cambio del valor · '4' otros. */
  @IsOptional()
  @IsIn(['1', '2', '3', '4'])
  correctionConceptCode?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DebitNoteItemDto)
  items: DebitNoteItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(250)
  observation?: string;
}

@ApiTags('Factus - Debit Notes')
@ApiBearerAuth()
@SkipApiKey()
@UseGuards(AuthGuard(), RolesGuard)
@Roles(
  RolesUser.SUPERADMIN,
  RolesUser.ADMIN,
  RolesUser.PRO,
  RolesUser.CHE,
  RolesUser.MES,
  RolesUser.EMP,
) // Todos menos USER, igual que las notas crédito
@Controller('factus/invoices')
export class FactusDebitNotesController {
  constructor(private readonly debitNoteService: FactusDebitNoteService) {}

  @Post(':id/debit-notes')
  @ApiOperation({
    summary: 'Generar y validar una nota débito sobre una factura electrónica',
  })
  async create(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateDebitNoteDto,
  ) {
    const data = await this.debitNoteService.createForInvoice(id, body);
    return { success: true, data };
  }

  @Get(':id/debit-notes')
  @ApiOperation({ summary: 'Listar las notas débito de una factura' })
  async list(@Param('id', ParseIntPipe) id: number) {
    const data = await this.debitNoteService.listForInvoice(id);
    return { success: true, data };
  }
}
