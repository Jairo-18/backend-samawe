import { StateTypeRepository } from './../../shared/repositories/stateType.repository';
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
  TogglePaymentBulkResponseDto,
  TogglePaymentResponseDto,
} from '../dtos/invoiceDetaill.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GeneralInvoiceDetaillService } from 'src/shared/services/generalInvoiceDetaill.service';
import { In } from 'typeorm';

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

  async create(
    invoiceId: number,
    createInvoiceDetailDto: CreateInvoiceDetailDto,
  ) {
    try {
      const [invoice, taxeType] = await Promise.all([
        this._invoiceRepository.findOne({
          where: { invoiceId },
          relations: ['invoiceType', 'paidType'],
        }),
        createInvoiceDetailDto.taxeTypeId
          ? this._taxeTypeRepository.findOne({
              where: { taxeTypeId: createInvoiceDetailDto.taxeTypeId },
            })
          : Promise.resolve(null),
      ]);

      if (!invoice) {
        throw new NotFoundException(
          `Factura con ID ${invoiceId} no encontrada`,
        );
      }

      const isQuote = invoice.invoiceType?.code === 'CO';
      const isSale = invoice.invoiceType?.code === 'FV';
      const isBuy = invoice.invoiceType?.code === 'FC';

      if (createInvoiceDetailDto.taxeTypeId && !taxeType) {
        throw new NotFoundException('Tipo de impuesto no encontrado');
      }

      const taxRate = taxeType?.percentage
        ? taxeType.percentage > 1
          ? taxeType.percentage / 100
          : taxeType.percentage
        : 0;

      const amount = Number(createInvoiceDetailDto.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new BadRequestException('La cantidad debe ser mayor a cero');
      }

      let priceBuy = 0;
      let priceWithoutTax = 0;
      let priceWithTax = 0;
      let taxe = 0;
      let subtotal = 0;
      let isProduct = false;
      let product = null;

      if (createInvoiceDetailDto.productId) {
        product = await this._productRepository.findOne({
          where: { productId: createInvoiceDetailDto.productId },
        });
        if (!product) throw new NotFoundException('Producto no encontrado');
        if (!product.isActive)
          throw new BadRequestException('Este producto está inactivo');

        if (isSale && !isQuote) {
          const currentStock = product.amount ?? 0;
          if (amount > currentStock) {
          }
        }

        const prices = this._generalInvoiceDetaillService.getHistoricalPrices(
          product,
          createInvoiceDetailDto,
        );
        priceBuy = prices.priceBuy;
        priceWithoutTax = prices.priceWithoutTax;

        isProduct = true;
      } else {
        priceBuy = Number(createInvoiceDetailDto.priceBuy) || 0;
        priceWithoutTax = Number(createInvoiceDetailDto.priceWithoutTax) || 0;
      }

      if (isNaN(priceWithoutTax) || priceWithoutTax < 0) {
        throw new BadRequestException('El precio sin impuesto no es válido');
      }

      priceWithTax = Number((priceWithoutTax * (1 + taxRate)).toFixed(2));
      taxe = Number((priceWithTax - priceWithoutTax).toFixed(2));
      subtotal = Number((amount * priceWithTax).toFixed(2));

      const detail = this._invoiceDetaillRepository.create({
        amount,
        priceBuy,
        priceWithoutTax,
        priceWithTax,
        taxe,
        subtotal,
        taxeType,
        invoice,
        startDate: createInvoiceDetailDto.startDate,
        endDate: createInvoiceDetailDto.endDate,
      });

      if (product) detail.product = product;

      const [accommodation, excursion] = await Promise.all([
        createInvoiceDetailDto.accommodationId
          ? this._accommodationRepository.findOne({
              where: {
                accommodationId: createInvoiceDetailDto.accommodationId,
              },
              relations: ['stateType'],
            })
          : Promise.resolve(null),
        createInvoiceDetailDto.excursionId
          ? this._excursionRepository.findOne({
              where: { excursionId: createInvoiceDetailDto.excursionId },
            })
          : Promise.resolve(null),
      ]);

      if (createInvoiceDetailDto.accommodationId && !accommodation) {
        throw new NotFoundException('Hospedaje no encontrado');
      }
      if (createInvoiceDetailDto.excursionId && !excursion) {
        throw new NotFoundException('Excursión no encontrada');
      }

      if (accommodation) {
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

        if (
          createInvoiceDetailDto.startDate &&
          createInvoiceDetailDto.endDate
        ) {
          const overlappingDetail = await this._invoiceDetaillRepository
            .createQueryBuilder('detail')
            .leftJoinAndSelect('detail.invoice', 'invoice')
            .leftJoinAndSelect('invoice.paidType', 'paidType')
            .where('detail.accommodation = :accommodationId', {
              accommodationId: accommodation.accommodationId,
            })
            .andWhere(
              'detail.startDate < :endDate AND detail.endDate > :startDate',
              {
                startDate: createInvoiceDetailDto.startDate,
                endDate: createInvoiceDetailDto.endDate,
              },
            )
            .getOne();

          if (
            overlappingDetail &&
            overlappingDetail.invoice?.paidType?.name &&
            [
              'Reservado - Pagado',
              'Reservado - Pendiente',
              'RESERVADO - PAGADO',
              'RESERVADO - PENDIENTE',
            ].includes(overlappingDetail.invoice.paidType.name.trim())
          ) {
            throw new BadRequestException(
              `El hospedaje ya está reservado entre ${createInvoiceDetailDto.startDate} y ${createInvoiceDetailDto.endDate}`,
            );
          }
        }

        if (stateName !== 'Disponible' && stateName !== 'DISPONIBLE') {
          throw new BadRequestException(
            `El hospedaje no está disponible (estado actual: ${stateName})`,
          );
        }

        detail.accommodation = accommodation;

        if (!isQuote && createInvoiceDetailDto.startDate) {
          const diffDays = Math.ceil(
            (new Date(createInvoiceDetailDto.startDate).getTime() -
              new Date().getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (diffDays <= 2) {
            const ocupadoState = await this._stateTypeRepository.findOne({
              where: {
                name: In(['Ocupado', 'OCUPADO']),
              },
            });
            if (!ocupadoState) {
              throw new NotFoundException('No se encontró el estado "Ocupado"');
            }
            accommodation.stateType = ocupadoState;
            await this._accommodationRepository.save(accommodation);
          }
        }
      }

      if (excursion) detail.excursion = excursion;

      const savedDetail = await this._invoiceDetaillRepository.save(detail);

      if (isProduct) {
        const currentAmount = Number(product.amount) || 0;

        if (isSale && !isQuote) {
          product.amount = currentAmount - amount;
        } else if (isBuy) {
          product.amount = currentAmount + amount;
        } else if (isQuote) {
          this._eventEmitter.emit('invoice.detail.cotizacion', {
            invoice,
            product,
          });
        }
      }

      const savePromises = [
        isProduct && !isQuote
          ? this._productRepository.save(product)
          : Promise.resolve(),
        this._generalInvoiceDetaillService.updateInvoiceTotal(invoiceId),
      ];

      await Promise.all(savePromises);

      this._eventEmitter.emit('invoice.detail.created', {
        invoice,
        isProduct,
      });

      let stockInfo = null;
      if (isProduct && product) {
        const previousStock =
          isSale && !isQuote ? product.amount + amount : product.amount;
        const currentStock = product.amount;

        stockInfo = {
          productName: product.name,
          previousStock,
          currentStock,
          requestedAmount: amount,
          hasStockWarning: isSale && !isQuote && amount > previousStock,
          isQuote,
          operationType: isQuote ? 'cotizacion' : isSale ? 'venta' : 'compra',
        };
      }

      return {
        ...savedDetail,
        stockInfo,
      };
    } catch (error) {
      console.error('❌ Error al crear detalle:', error);

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Ocurrió un error al crear el detalle',
      );
    }
  }

  async createMany(
    invoiceId: number,
    dtos: CreateInvoiceDetailDto[],
  ): Promise<any[]> {
    const results = [];
    for (const dto of dtos) {
      const result = await this.create(invoiceId, dto);
      results.push(result);
    }
    return results;
  }

  /**
   * Eliminar detalle:
   * - Si invoiceType === 'CO' no revertir stock ni cambiar estados de accommodation.
   */
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
    const isQuote = invoiceTypeCode === 'CO';

    const ops: Promise<any>[] = [];

    if (product && !isQuote) {
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

    if (accommodation && !isQuote) {
      const disponibleState = await this._stateTypeRepository.findOne({
        where: {
          name: In(['Disponible', 'DISPONIBLE']),
        },
      });

      if (disponibleState) {
        accommodation.stateType = disponibleState;
        ops.push(this._accommodationRepository.save(accommodation));
      }
    }

    await this._invoiceDetaillRepository.remove(detail);

    await this._generalInvoiceDetaillService.updateInvoiceTotal(
      invoice.invoiceId,
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

  async handleScheduledReservation() {
    const now = new Date();

    const activeReservations = await this._invoiceDetaillRepository
      .createQueryBuilder('detail')
      .leftJoinAndSelect('detail.invoice', 'invoice')
      .leftJoinAndSelect('invoice.paidType', 'paidType')
      .leftJoinAndSelect('detail.accommodation', 'accommodation')
      .leftJoinAndSelect('accommodation.stateType', 'stateType')
      .where('detail.startDate <= :now AND detail.endDate >= :now', { now })
      .getMany();

    for (const reservation of activeReservations) {
      if (
        reservation.invoice?.paidType?.name &&
        ['RESERVADO - PAGADO', 'RESERVADO - PENDIENTE'].includes(
          reservation.invoice.paidType.name.trim(),
        )
      ) {
        if (
          reservation.accommodation &&
          reservation.accommodation.stateType?.name === 'DISPONIBLE'
        ) {
          const ocupadoState = await this._stateTypeRepository.findOne({
            where: {
              name: In(['OCUPADO']),
            },
          });
          if (ocupadoState) {
            reservation.accommodation.stateType = ocupadoState;
            await this._accommodationRepository.save(reservation.accommodation);
          }
        }
      }
    }

    const expiredReservations = await this._invoiceDetaillRepository
      .createQueryBuilder('detail')
      .leftJoinAndSelect('detail.accommodation', 'accommodation')
      .leftJoinAndSelect('accommodation.stateType', 'stateType')
      .where('detail.endDate < :now', { now })
      .getMany();

    for (const reservation of expiredReservations) {
      if (
        reservation.accommodation &&
        reservation.accommodation.stateType?.name === 'OCUPADO'
      ) {
        const mantenimientoState = await this._stateTypeRepository.findOne({
          where: {
            name: In(['MANTENIMIENTO']),
          },
        });

        if (mantenimientoState) {
          reservation.accommodation.stateType = mantenimientoState;
          await this._accommodationRepository.save(reservation.accommodation);
        }
      }
    }
  }

  async togglePaymentStatus(
    invoiceId: number,
    detailId: number,
  ): Promise<TogglePaymentResponseDto> {
    return await this._invoiceDetaillRepository.manager.transaction(
      async (manager) => {
        const detail = await manager.findOne(
          this._invoiceDetaillRepository.target,
          {
            where: { invoiceDetailId: detailId, invoice: { invoiceId } },
            relations: ['invoice'],
          },
        );

        if (!detail) {
          throw new NotFoundException('Detalle de factura no encontrado');
        }

        const previousIsPaid = detail.isPaid;
        detail.isPaid = !previousIsPaid;

        const subtotal = Number(detail.subtotal);
        const currentPaidTotal = Number(detail.invoice.paidTotal);

        if (detail.isPaid) {
          detail.invoice.paidTotal = currentPaidTotal + subtotal;
        } else {
          detail.invoice.paidTotal = currentPaidTotal - subtotal;
        }

        if (detail.invoice.paidTotal < 0) detail.invoice.paidTotal = 0;

        await manager.save(detail);
        await manager.save(detail.invoice);

        return {
          invoiceDetailId: detail.invoiceDetailId,
          isPaid: detail.isPaid,
          invoicePaidTotal: Number(detail.invoice.paidTotal),
        };
      },
    );
  }
  async togglePaymentStatusBulk(
    invoiceId: number,
    detailIds: number[],
    targetIsPaid: boolean,
  ): Promise<TogglePaymentBulkResponseDto> {
    return await this._invoiceDetaillRepository.manager.transaction(
      async (manager) => {
        const details = await manager.find(
          this._invoiceDetaillRepository.target,
          {
            where: {
              invoiceDetailId: In(detailIds),
              invoice: { invoiceId },
            },
            relations: ['invoice'],
          },
        );

        if (details.length !== detailIds.length) {
          throw new NotFoundException(
            'Algunos detalles no fueron encontrados o no pertenecen a esta factura',
          );
        }

        const updatedDetails = [];
        let invoiceToUpdate = null;

        for (const detail of details) {
          if (detail.isPaid === targetIsPaid) {
            updatedDetails.push({
              invoiceDetailId: detail.invoiceDetailId,
              isPaid: detail.isPaid,
            });
            continue;
          }

          detail.isPaid = targetIsPaid;

          const subtotal = Number(detail.subtotal);
          const currentPaidTotal = Number(detail.invoice.paidTotal);

          if (targetIsPaid) {
            detail.invoice.paidTotal = currentPaidTotal + subtotal;
          } else {
            detail.invoice.paidTotal = currentPaidTotal - subtotal;
          }

          if (detail.invoice.paidTotal < 0) detail.invoice.paidTotal = 0;

          await manager.save(detail);
          invoiceToUpdate = detail.invoice;

          updatedDetails.push({
            invoiceDetailId: detail.invoiceDetailId,
            isPaid: detail.isPaid,
          });
        }

        if (invoiceToUpdate) {
          await manager.save(invoiceToUpdate);
        } else if (details.length > 0) {
          invoiceToUpdate = details[0].invoice;
        }

        return {
          invoiceId,
          updatedCount: updatedDetails.length,
          invoicePaidTotal: invoiceToUpdate
            ? Number(invoiceToUpdate.paidTotal)
            : 0,
          updatedDetails,
        };
      },
    );
  }
}
