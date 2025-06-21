import { StateTypeRepository } from './../../shared/repositories/stateType.repository';
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
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';

import {
  CreateInvoiceDetailDto,
  CreateRelatedDataInvoiceDto,
} from '../dtos/invoiceDetaill.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GeneralInvoiceDetaillService } from 'src/shared/services/generalInvoiceDetaill.service';

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
    private readonly _stateTypeRepository: StateTypeRepository,
    private readonly _eventEmitter: EventEmitter2,
    private readonly _generalInvoiceDetaillService: GeneralInvoiceDetaillService,
  ) {}

  async getRelatedDataToCreate(): Promise<CreateRelatedDataInvoiceDto> {
    const {
      invoiceType,
      taxeType,
      payType,
      paidType,
      categoryType,
      identificationType,
    } = this._repositoriesService.repositories;

    const [
      invoiceTypes,
      taxeTypes,
      payTypes,
      paidTypes,
      categoryTypes,
      identificationTypes,
    ] = await Promise.all([
      this._repositoriesService.getEntities<InvoiceType>(invoiceType),
      this._repositoriesService.getEntities<TaxeType>(taxeType),
      this._repositoriesService.getEntities<PayType>(payType),
      this._repositoriesService.getEntities<PaidType>(paidType),
      this._repositoriesService.getEntities<CategoryType>(categoryType),
      this._repositoriesService.getEntities<IdentificationType>(
        identificationType,
      ),
    ]);

    return {
      invoiceType: invoiceTypes,
      taxeType: taxeTypes,
      payType: payTypes,
      paidType: paidTypes,
      categoryType: categoryTypes,
      identificationType: identificationTypes,
    };
  }

  async create(invoiceId: number, dto: CreateInvoiceDetailDto) {
    try {
      const [invoice, taxeType] = await Promise.all([
        this._invoiceRepository.findOne({
          where: { invoiceId },
          relations: ['invoiceType'],
        }),
        dto.taxeTypeId
          ? this._taxeTypeRepository.findOne({
              where: { taxeTypeId: dto.taxeTypeId },
            })
          : Promise.resolve(null),
      ]);

      if (!invoice) {
        throw new NotFoundException(
          `Factura con ID ${invoiceId} no encontrada`,
        );
      }

      if (dto.taxeTypeId && !taxeType) {
        throw new NotFoundException('Tipo de impuesto no encontrado');
      }

      const taxRate = taxeType?.percentage
        ? taxeType.percentage > 1
          ? taxeType.percentage / 100
          : taxeType.percentage
        : 0;

      const amount = Number(dto.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new BadRequestException('La cantidad debe ser mayor a cero');
      }

      // Validación de fechas
      if (
        dto.startDate &&
        dto.endDate &&
        new Date(dto.startDate) >= new Date(dto.endDate)
      ) {
        throw new BadRequestException(
          'La fecha de inicio debe ser anterior a la fecha de fin',
        );
      }

      let priceBuy = 0;
      let priceWithoutTax = 0;
      let priceWithTax = 0;
      let subtotal = 0;
      let isProduct = false;
      let product = null;

      if (dto.productId) {
        product = await this._productRepository.findOne({
          where: { productId: dto.productId },
        });
        if (!product) {
          throw new NotFoundException('Producto no encontrado');
        }

        // NUEVA VALIDACIÓN: Verificar si el producto está activo
        if (!product.isActive) {
          throw new BadRequestException('Este producto está inactivo');
        }

        const prices = this._generalInvoiceDetaillService.getHistoricalPrices(
          product,
          dto,
        );
        priceBuy = prices.priceBuy;
        priceWithoutTax = prices.priceWithoutTax;

        const validation =
          this._generalInvoiceDetaillService.validateProductPriceConsistency(
            product,
            priceBuy,
            priceWithoutTax,
            invoice.invoiceType.code,
          );

        if (!validation.isValid) {
          throw new BadRequestException(validation.message);
        }

        isProduct = true;
      } else {
        priceBuy = Number(dto.priceBuy) || 0;
        priceWithoutTax = Number(dto.priceWithoutTax) || 0;
      }

      if (isNaN(priceWithoutTax) || priceWithoutTax < 0) {
        throw new BadRequestException('El precio sin impuesto no es válido');
      }

      priceWithTax = Number((priceWithoutTax * (1 + taxRate)).toFixed(2));
      subtotal = Number((amount * priceWithTax).toFixed(2));

      const detail = this._invoiceDetaillRepository.create({
        amount,
        priceBuy,
        priceWithoutTax,
        priceWithTax,
        subtotal,
        taxeType,
        invoice,
        startDate: dto.startDate,
        endDate: dto.endDate,
      });

      if (product) detail.product = product;

      const [accommodation, excursion] = await Promise.all([
        dto.accommodationId
          ? this._accommodationRepository.findOne({
              where: { accommodationId: dto.accommodationId },
              relations: ['stateType'],
            })
          : Promise.resolve(null),
        dto.excursionId
          ? this._excursionRepository.findOne({
              where: { excursionId: dto.excursionId },
            })
          : Promise.resolve(null),
      ]);

      if (dto.accommodationId && !accommodation) {
        throw new NotFoundException('Hospedaje no encontrado');
      }
      if (dto.excursionId && !excursion) {
        throw new NotFoundException('Excursión no encontrada');
      }

      if (accommodation) {
        // Validación más robusta del estado
        if (!accommodation.stateType) {
          throw new BadRequestException(
            'El alojamiento no tiene un estado definido',
          );
        }

        const stateName = accommodation.stateType.name?.toString().trim();
        if (!stateName) {
          throw new BadRequestException(
            'El nombre del estado no está definido',
          );
        }

        // NUEVA VALIDACIÓN: Verificar si el hospedaje está disponible
        if (stateName !== 'Disponible') {
          let stateMessage = '';

          switch (stateName) {
            case 'Mantenimiento':
              stateMessage = 'El hospedaje está en mantenimiento';
              break;
            case 'Ocupado':
              stateMessage = 'El hospedaje está ocupado';
              break;
            case 'Fuera de Servicio':
              stateMessage = 'El hospedaje está fuera de servicio';
              break;
            default:
              stateMessage = 'El hospedaje no está disponible';
          }

          throw new BadRequestException(stateMessage);
        }

        detail.accommodation = accommodation;

        // Cambiar estado a Ocupado
        const ocupadoState = await this._stateTypeRepository.findOne({
          where: { name: 'Ocupado' },
        });

        if (!ocupadoState) {
          throw new NotFoundException('No se encontró el estado "Ocupado"');
        }

        accommodation.stateType = ocupadoState;
        await this._accommodationRepository.save(accommodation); // Guardar inmediatamente
      }

      if (excursion) detail.excursion = excursion;

      const savedDetail = await this._invoiceDetaillRepository.save(detail);

      if (isProduct) {
        const currentAmount = Number(product.amount) || 0;
        if (invoice.invoiceType.code === 'FV') {
          if (currentAmount < amount) {
            throw new BadRequestException(
              `No hay suficientes unidades para el producto ${product.name}`,
            );
          }
          product.amount = currentAmount - amount;
        } else if (invoice.invoiceType.code === 'FC') {
          product.amount = currentAmount + amount;
        }
      }

      const savePromises = [
        isProduct ? this._productRepository.save(product) : Promise.resolve(),
        this._generalInvoiceDetaillService.updateInvoiceTotal(invoiceId),
      ];

      await Promise.all(savePromises);

      this._eventEmitter.emit('invoice.detail.created', {
        invoice,
        isProduct,
      });

      return savedDetail;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Ocurrió un error al crear el detalle',
      );
    }
  }

  async delete(invoiceDetailId: number) {
    const detail = await this._invoiceDetaillRepository.findOne({
      where: { invoiceDetailId },
      relations: [
        'invoice',
        'product',
        'invoice.invoiceType',
        'accommodation',
        'accommodation.stateType',
      ],
    });

    if (!detail) {
      throw new NotFoundException(
        `Detalle con ID ${invoiceDetailId} no encontrado`,
      );
    }

    const { invoice, product, accommodation, amount: detailAmount } = detail;
    const invoiceTypeCode = invoice.invoiceType.code;
    const isSale = invoiceTypeCode === 'FV';
    const isBuy = invoiceTypeCode === 'FC';

    const ops: Promise<any>[] = [];

    // ✅ REVERTIR STOCK SI ES PRODUCTO
    if (product) {
      const currentAmount = Number(product.amount ?? 0);
      const amt = Number(detailAmount ?? 0);

      if (isNaN(currentAmount) || isNaN(amt)) {
        throw new Error(
          `Stock inválido: product.amount=${product.amount}, detail.amount=${detail.amount}`,
        );
      }

      if (isSale) {
        product.amount = currentAmount + amt;
      } else if (isBuy) {
        const newAmount = currentAmount - amt;
        if (newAmount < 0) {
          throw new BadRequestException(
            `No se puede eliminar: dejaría el stock del producto ${product.name} en negativo`,
          );
        }
        product.amount = newAmount;
      }

      ops.push(this._productRepository.save(product));
    }

    // 🆕 LIBERAR ACCOMMODATION SI EXISTE
    if (accommodation) {
      // Buscar el stateType "Disponible" y asignarlo
      const disponibleState = await this._stateTypeRepository.findOne({
        where: { name: 'Disponible' },
      });

      if (disponibleState) {
        accommodation.stateType = disponibleState;
        ops.push(this._accommodationRepository.save(accommodation));
      }
    }

    // ✅ ELIMINAR DETALLE Y ACTUALIZAR TOTAL EN PARALELO
    ops.push(
      this._invoiceDetaillRepository.remove(detail),
      this._generalInvoiceDetaillService.updateInvoiceTotal(invoice.invoiceId),
    );

    await Promise.all(ops);

    this._eventEmitter.emit('invoice.detail.deleted', {
      invoice,
      isProduct: !!product,
    });

    return {
      invoiceId: invoice.invoiceId,
      deletedDetailId: invoiceDetailId,
    };
  }
}
