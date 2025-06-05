import { CategoryType } from './../../shared/entities/categoryType.entity';
import { IdentificationType } from './../../shared/entities/identificationType.entity';
import { PaidType } from './../../shared/entities/paidType.entity';
import { PayType } from './../../shared/entities/payType.entity';
import { TaxeType } from './../../shared/entities/taxeType.entity';
import { InvoiceType } from './../../shared/entities/invoiceType.entity';
import { RepositoryService } from './../../shared/services/repositoriry.service';
import { ExcursionRepository } from './../../shared/repositories/excursion.repository';
import { AccommodationRepository } from './../../shared/repositories/accommodation.repository';
import { ProductRepository } from './../../shared/repositories/product.repository';
import { TaxeTypeRepository } from './../../shared/repositories/taxeType.repository';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';

import {
  CreateInvoiceDetailDto,
  CreateRelatedDataInvoiceDto,
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
    private readonly _repositoriesService: RepositoryService,
  ) {}

  async getRelatedDataToCreate(): Promise<CreateRelatedDataInvoiceDto> {
    const invoiceType =
      await this._repositoriesService.getEntities<InvoiceType>(
        this._repositoriesService.repositories.invoiceType,
      );

    const taxeType = await this._repositoriesService.getEntities<TaxeType>(
      this._repositoriesService.repositories.taxeType,
    );

    const payType = await this._repositoriesService.getEntities<PayType>(
      this._repositoriesService.repositories.payType,
    );

    const paidType = await this._repositoriesService.getEntities<PaidType>(
      this._repositoriesService.repositories.paidType,
    );

    const categoryType =
      await this._repositoriesService.getEntities<CategoryType>(
        this._repositoriesService.repositories.categoryType,
      );

    const identificationType =
      await this._repositoriesService.getEntities<IdentificationType>(
        this._repositoriesService.repositories.identificationType,
      );

    return {
      invoiceType,
      taxeType,
      payType,
      paidType,
      identificationType,
      categoryType,
    };
  }

  // Método privado para actualizar el total de la factura
  private async updateInvoiceTotal(invoiceId: number): Promise<void> {
    // Obtener todos los detalles de la factura
    const details = await this._invoiceDetaillRepository.find({
      where: { invoice: { invoiceId } },
    });

    // Calcular el nuevo total sumando todos los subtotales
    const newTotal = details.reduce((sum, detail) => {
      const subtotal = Number(detail.subtotal);
      // Validar que el subtotal sea un número válido
      if (isNaN(subtotal)) {
        return sum;
      }
      return sum + subtotal;
    }, 0);

    // Validar que el total calculado sea válido
    if (isNaN(newTotal)) {
      throw new Error(
        `Error al calcular el total de la factura ${invoiceId}: resultado NaN`,
      );
    }

    // Actualizar la factura con el nuevo total
    await this._invoiceRepository.update(invoiceId, {
      total: newTotal,
      subtotal: newTotal, // Asumiendo que también tienes un campo subtotal separado
    });
  }

  async create(invoiceId: number, dto: CreateInvoiceDetailDto) {
    const invoice = await this._invoiceRepository.findOne({
      where: { invoiceId },
    });
    if (!invoice) {
      throw new NotFoundException(`Factura con ID ${invoiceId} no encontrada`);
    }

    let taxRate = 0;
    let taxeType = null;

    if (dto.taxeTypeId) {
      taxeType = await this._taxeTypeRepository.findOne({
        where: { taxeTypeId: dto.taxeTypeId },
      });
      if (!taxeType)
        throw new NotFoundException('Tipo de impuesto no encontrado');

      // Usar 'percentage' o 'rate' dependiendo de tu entidad
      // Si está en porcentaje (16), dividir por 100. Si ya está en decimal (0.16), usar directo
      taxRate = taxeType.percentage / 100; // Ajusta según tu campo: taxeType.rate o taxeType.percentage
    }

    // Validar que los valores numéricos sean válidos
    const priceWithoutTax = Number(dto.priceWithoutTax);
    const amount = Number(dto.amount);

    if (
      isNaN(priceWithoutTax) ||
      isNaN(amount) ||
      priceWithoutTax < 0 ||
      amount <= 0
    ) {
      throw new BadRequestException(
        'Los valores numéricos no son válidos o deben ser mayores a cero',
      );
    }

    // Calcular valores
    const priceWithTax = Number((priceWithoutTax * (1 + taxRate)).toFixed(2));
    const subtotal = Number((amount * priceWithTax).toFixed(2));

    const detail = this._invoiceDetaillRepository.create({
      amount: amount,
      priceWithoutTax: priceWithoutTax,
      priceWithTax: priceWithTax,
      subtotal: subtotal,
      taxeType: taxeType,
      invoice,
      startDate: dto.startDate,
      endDate: dto.endDate,
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

    // Guardar el detalle
    const savedDetail = await this._invoiceDetaillRepository.save(detail);

    // 🔥 ACTUALIZAR EL TOTAL DE LA FACTURA
    await this.updateInvoiceTotal(invoiceId);

    return savedDetail;
  }

  async update(invoiceDetailId: number, updateDto: UpdateInvoiceDetailDto) {
    const existing = await this._invoiceDetaillRepository.findOne({
      where: { invoiceDetailId },
      relations: [
        'product',
        'accommodation',
        'excursion',
        'invoice',
        'taxeType',
      ], // Incluir invoice y taxeType
    });

    if (!existing) {
      throw new NotFoundException(
        `Detalle con ID ${invoiceDetailId} no encontrado`,
      );
    }

    // Actualizamos las propiedades simples y recalculamos si es necesario
    if (
      updateDto.priceWithoutTax !== undefined ||
      updateDto.taxeTypeId !== undefined ||
      updateDto.amount !== undefined
    ) {
      let taxRate = 0;

      if (updateDto.taxeTypeId !== undefined) {
        if (updateDto.taxeTypeId === null) {
          existing.taxeType = null;
          taxRate = 0;
        } else {
          const taxeType = await this._taxeTypeRepository.findOne({
            where: { taxeTypeId: updateDto.taxeTypeId },
          });
          if (!taxeType)
            throw new NotFoundException('Tipo de impuesto no encontrado');

          taxRate = taxeType.percentage / 100; // Ajusta según tu campo
          existing.taxeType = taxeType;
        }
      } else if (existing.taxeType) {
        taxRate = existing.taxeType.percentage / 100; // Ajusta según tu campo
      }

      // Actualizar valores
      existing.amount = Number(updateDto.amount ?? existing.amount);
      existing.priceWithoutTax = Number(
        updateDto.priceWithoutTax ?? existing.priceWithoutTax,
      );

      // Validar que los valores sean números válidos
      if (isNaN(existing.amount) || isNaN(existing.priceWithoutTax)) {
        throw new BadRequestException('Los valores numéricos no son válidos');
      }

      existing.priceWithTax = Number(
        (existing.priceWithoutTax * (1 + taxRate)).toFixed(2),
      );
      existing.subtotal = Number(
        (existing.amount * existing.priceWithTax).toFixed(2),
      );
    }

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

    // Actualizar fechas si vienen en el DTO
    // if (updateDto.startDate !== undefined) {
    //   existing.startDate = updateDto.startDate;
    // }

    // if (updateDto.endDate !== undefined) {
    //   existing.endDate = updateDto.endDate;
    // }

    // Guardar cambios
    const updatedDetail = await this._invoiceDetaillRepository.save(existing);

    // 🔥 ACTUALIZAR EL TOTAL DE LA FACTURA
    await this.updateInvoiceTotal(existing.invoice.invoiceId);

    return updatedDetail;
  }

  async delete(invoiceDetailId: number) {
    const detail = await this._invoiceDetaillRepository.findOne({
      where: { invoiceDetailId },
      relations: ['invoice'], // Incluir la relación con invoice
    });

    if (!detail) {
      throw new NotFoundException(
        `Detalle con ID ${invoiceDetailId} no encontrado`,
      );
    }

    const invoiceId = detail.invoice.invoiceId;

    await this._invoiceDetaillRepository.remove(detail);

    // 🔥 ACTUALIZAR EL TOTAL DE LA FACTURA DESPUÉS DE ELIMINAR
    await this.updateInvoiceTotal(invoiceId);

    return { message: 'Detalle eliminado correctamente' };
  }

  async findById(invoiceDetailId: number) {
    const detail = await this._invoiceDetaillRepository.findOne({
      where: { invoiceDetailId },
      relations: [
        'product',
        'accommodation',
        'excursion',
        'invoice',
        'taxeType',
      ],
    });

    if (!detail) {
      throw new NotFoundException(
        `Detalle con ID ${invoiceDetailId} no encontrado`,
      );
    }

    return detail;
  }
}
