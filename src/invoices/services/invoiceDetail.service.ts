import { ExcursionRepository } from './../../shared/repositories/excursion.repository';
import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { TaxeTypeRepository } from './../../shared/repositories/taxeType.repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';

import {
  CreateInvoiceDetailDto,
  UpdateInvoiceDetailDto,
} from '../dtos/invoiceDetaill.dto';

@Injectable()
export class InvoiceDetailService {
  constructor(
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _productRepository: ProductRepository,
    private readonly _accommodationRepository: AccommodationRepository,
    private readonly _excursionRepository: ExcursionRepository,
    private readonly _taxeTypeRepository: TaxeTypeRepository,
  ) {}

  async create(invoiceId: number, dto: CreateInvoiceDetailDto) {
    const invoice = await this._invoiceRepository.findOne({
      where: { invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
    }

    const detail = this._invoiceDetaillRepository.create({
      amount: dto.amount,
      priceWithoutTax: dto.priceWithoutTax,
      priceWithTax: dto.priceWithTax,
      subtotal: dto.subtotal,
      taxeType: dto.taxeTypeId ? { taxeTypeId: dto.taxeTypeId } : null,
      invoice,
    });

    // Asignar relación con product si existe productId
    if (dto.productId) {
      const product = await this._productRepository.findOne({
        where: { productId: dto.productId },
      });
      if (!product) throw new NotFoundException('Producto no encontrado');
      detail.product = product;
    }

    // Asignar relación con accommodation si existe accommodationId
    if (dto.accommodationId) {
      const accommodation = await this._accommodationRepository.findOne({
        where: { accommodationId: dto.accommodationId },
      });
      if (!accommodation)
        throw new NotFoundException('Hospedaje no encontrado');
      detail.accommodation = accommodation;
    }

    // Asignar relación con excursion si existe excursionId
    if (dto.excursionId) {
      const excursion = await this._excursionRepository.findOne({
        where: { excursionId: dto.excursionId },
      });
      if (!excursion) throw new NotFoundException('Excursión no encontrada');
      detail.excursion = excursion;
    }

    return await this._invoiceDetaillRepository.save(detail);
  }

  async update(invoiceDetailId: number, updateDto: UpdateInvoiceDetailDto) {
    const existing = await this._invoiceDetaillRepository.findOne({
      where: { invoiceDetailId },
      relations: ['product', 'accommodation', 'excursion'], // cargar relaciones para evitar problemas
    });

    if (!existing) {
      throw new NotFoundException(
        `Detalle con ID ${invoiceDetailId} no encontrado`,
      );
    }

    // Actualizamos las propiedades simples
    existing.amount = updateDto.amount ?? existing.amount;
    existing.priceWithoutTax =
      updateDto.priceWithoutTax ?? existing.priceWithoutTax;
    existing.priceWithTax = updateDto.priceWithTax ?? existing.priceWithTax;
    existing.subtotal = updateDto.subtotal ?? existing.subtotal;

    // Actualizar relación con product si viene productId en updateDto
    if (updateDto.productId !== undefined) {
      if (updateDto.productId === null) {
        existing.product = null; // quitar relación si null
      } else {
        const product = await this._productRepository.findOne({
          where: { productId: updateDto.productId },
        });
        if (!product) throw new NotFoundException('Producto no encontrado');
        existing.product = product;
      }
    }

    // Actualizar relación con accommodation si viene accommodationId en updateDto
    if (updateDto.accommodationId !== undefined) {
      if (updateDto.accommodationId === null) {
        existing.accommodation = null;
      } else {
        const accommodation = await this._accommodationRepository.findOne({
          where: { accommodationId: updateDto.accommodationId },
        });
        if (!accommodation)
          throw new NotFoundException('Hospedaje no encontrado');
        existing.accommodation = accommodation;
      }
    }

    // Actualizar relación con excursion si viene excursionId en updateDto
    if (updateDto.excursionId !== undefined) {
      if (updateDto.excursionId === null) {
        existing.excursion = null;
      } else {
        const excursion = await this._excursionRepository.findOne({
          where: { excursionId: updateDto.excursionId },
        });
        if (!excursion) throw new NotFoundException('Excursión no encontrada');
        existing.excursion = excursion;
      }
    }

    if (updateDto.taxeTypeId !== undefined) {
      if (updateDto.taxeTypeId === null) {
        existing.taxeType = null;
      } else {
        const taxeType = await this._taxeTypeRepository.findOne({
          where: { taxeTypeId: updateDto.taxeTypeId },
        });
        if (!taxeType)
          throw new NotFoundException('Tipo de impuesto no encontrado');
        existing.taxeType = taxeType;
      }
    }

    return await this._invoiceDetaillRepository.save(existing);
  }

  async delete(invoiceDetailId: number) {
    const detail = await this._invoiceDetaillRepository.findOne({
      where: { invoiceDetailId },
    });
    if (!detail) {
      throw new NotFoundException(
        `Detalle con ID ${invoiceDetailId} no encontrado`,
      );
    }

    await this._invoiceDetaillRepository.remove(detail);
    return { message: 'Detalle eliminado correctamente' };
  }

  async findById(invoiceDetailId: number) {
    const detail = await this._invoiceDetaillRepository.findOne({
      where: { invoiceDetailId },
      relations: ['product', 'accommodation', 'excursion', 'invoice'],
    });

    if (!detail) {
      throw new NotFoundException(
        `Detalle con ID ${invoiceDetailId} no encontrado`,
      );
    }

    return detail;
  }
}
