import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { Invoice } from './../../shared/entities/invoice.entity';
import { CreateInvoiceDto } from '../dtos/invoice.dto';
import { InvoiceTypeRepository } from './../../shared/repositories/invoiceType.repository';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _invoiceTypeRepository: InvoiceTypeRepository,
  ) {}

  async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
    const codeExist = await this._invoiceRepository.findOne({
      where: { code: createInvoiceDto.code },
    });

    if (codeExist) {
      throw new HttpException('El código ya está en uso', HttpStatus.CONFLICT);
    }

    try {
      const { invoiceTypeId, ...invoiceData } = createInvoiceDto;

      // Cargar relaciones
      const invoiceType = await this._invoiceTypeRepository.findOne({
        where: { invoiceTypeId },
      });

      if (!invoiceType) {
        throw new BadRequestException('Tipo de factura no encontrado');
      }

      const newInvoice = this._invoiceRepository.create({
        ...invoiceData,
        invoiceType,
      });

      return await this._invoiceRepository.save(newInvoice);
    } catch (error) {
      console.error('Error creando factura:', error);
      throw new BadRequestException('No se pudo crear la factura');
    }
  }
}
