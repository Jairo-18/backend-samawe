import { InvoiceType } from './../../shared/entities/invoiceType.entity';
import { TaxeType } from './../../shared/entities/taxeType.entity';
import { Excursion } from './../../shared/entities/excursion.entity';
import { Accommodation } from './../../shared/entities/accommodation.entity';
import { Product } from './../../shared/entities/product.entity';
import { InvoiceDetail } from './../../shared/entities/invoiceDetaill.entity';
import { InvoiceDetaillRepository } from './../../shared/repositories/invoiceDetaill.repository';
import { TaxeTypeRepository } from './../../shared/repositories/taxeType.repository';
import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { Invoice } from './../../shared/entities/invoice.entity';
import {
  CreateInvoiceWithDetailsDto,
  UpdateInvoiceDto,
} from '../dtos/invoice.dto';
import { InvoiceTypeRepository } from './../../shared/repositories/invoiceType.repository';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _invoiceTypeRepository: InvoiceTypeRepository,
    private readonly _taxeTypeRepository: TaxeTypeRepository,
    private readonly _invoiceDetailRepository: InvoiceDetaillRepository,
  ) {}

  // async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
  //   const codeExist = await this._invoiceRepository.findOne({
  //     where: { code: createInvoiceDto.code },
  //   });

  //   if (codeExist) {
  //     throw new HttpException('El código ya está en uso', HttpStatus.CONFLICT);
  //   }

  //   try {
  //     const { invoiceTypeId, ...invoiceData } = createInvoiceDto;

  //     // Cargar relaciones
  //     const invoiceType = await this._invoiceTypeRepository.findOne({
  //       where: { invoiceTypeId },
  //     });

  //     if (!invoiceType) {
  //       throw new BadRequestException('Tipo de factura no encontrado');
  //     }

  //     const newInvoice = this._invoiceRepository.create({
  //       ...invoiceData,
  //       invoiceType,
  //     });

  //     return await this._invoiceRepository.save(newInvoice);
  //   } catch (error) {
  //     console.error('Error creando factura:', error);
  //     throw new BadRequestException('No se pudo crear la factura');
  //   }
  // }

  async createWithDetails(
    createInvoiceWithDetailsDto: CreateInvoiceWithDetailsDto,
  ): Promise<Invoice> {
    const { invoiceTypeId, details, code, ...invoiceData } =
      createInvoiceWithDetailsDto;

    // Validar tipo de factura
    const invoiceType = await this._invoiceTypeRepository.findOne({
      where: { invoiceTypeId },
    });
    if (!invoiceType) {
      throw new BadRequestException('Tipo de factura no encontrado');
    }

    // ❗ Validar que no exista otra factura con el mismo code y tipo
    const existingInvoice = await this._invoiceRepository.findOne({
      where: {
        code: code,
        invoiceType: { invoiceTypeId }, // depende de cómo esté relacionada tu entidad
      },
      relations: ['invoiceType'], // asegúrate de incluir la relación si es necesaria
    });

    if (existingInvoice) {
      throw new BadRequestException(
        `Ya existe una factura con código '${code}' para el mismo tipo de factura.`,
      );
    }

    // Preparar detalles
    const invoiceDetails = [];

    for (const detail of details) {
      let taxeType = null;
      if (detail.taxeTypeId) {
        taxeType = await this._taxeTypeRepository.findOne({
          where: { taxeTypeId: detail.taxeTypeId },
        });
        if (!taxeType) {
          throw new BadRequestException('Tipo de impuesto no encontrado');
        }
      }

      invoiceDetails.push({
        amount: detail.amount,
        priceWithoutTax: detail.priceWithoutTax,
        priceWithTax: detail.priceWithTax,
        subtotal: detail.subtotal,
        taxeType,
        product: detail.productId ? { productId: detail.productId } : null,
        accommodation: detail.accommodationId
          ? { accommodationId: detail.accommodationId }
          : null,
        excursion: detail.excursionId
          ? { excursionId: detail.excursionId }
          : null,
      });
    }

    // Crear la factura con detalles
    const newInvoice = this._invoiceRepository.create({
      code,
      ...invoiceData,
      invoiceType,
      invoiceDetails,
    });

    return await this._invoiceRepository.save(newInvoice);
  }

  async findOne(invoiceId: number): Promise<Invoice> {
    const invoice = await this._invoiceRepository.findOne({
      where: { invoiceId },
      relations: [
        'invoiceType',
        'invoiceDetails',
        'invoiceDetails.product',
        'invoiceDetails.product.categoryType',
        'invoiceDetails.accommodation',
        'invoiceDetails.accommodation.bedType',
        'invoiceDetails.accommodation.categoryType',
        'invoiceDetails.excursion',
        'invoiceDetails.excursion.categoryType',
        'invoiceDetails.taxeType',
      ],
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }

    return invoice;
  }

  async update(updateDto: UpdateInvoiceDto): Promise<Invoice> {
    const { invoiceId, invoiceTypeId, code, startDate, endDate, details } =
      updateDto;

    // Crear un query runner para transacciones
    const queryRunner =
      this._invoiceRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Cargar factura con detalles
      const invoice = await queryRunner.manager.findOne(Invoice, {
        where: { invoiceId },
        relations: ['invoiceDetails'],
      });

      if (!invoice) throw new NotFoundException('Factura no encontrada');

      // Validar invoiceType
      const invoiceType = await queryRunner.manager.findOne(InvoiceType, {
        where: { invoiceTypeId },
      });
      if (!invoiceType)
        throw new BadRequestException('Tipo de factura no válido');

      // Actualizar campos factura
      invoice.code = code;
      invoice.startDate = new Date(startDate);
      invoice.endDate = new Date(endDate);
      invoice.invoiceType = invoiceType;

      // Guardar factura (sin detalles aún)
      await queryRunner.manager.save(invoice);

      // Mapa detalles existentes para fácil acceso
      const existingDetailsMap = new Map(
        invoice.invoiceDetails.map((d) => [d.invoiceDetailId, d]),
      );

      const detailsToSave: InvoiceDetail[] = [];
      const keepDetailIds = new Set<number>();

      for (const d of details) {
        let detailEntity: InvoiceDetail;

        if (d.invoiceDetailId) {
          detailEntity = existingDetailsMap.get(d.invoiceDetailId);
          if (!detailEntity) {
            throw new NotFoundException(
              `Detalle con id ${d.invoiceDetailId} no encontrado`,
            );
          }
          keepDetailIds.add(d.invoiceDetailId);
        } else {
          detailEntity = new InvoiceDetail();
          detailEntity.invoice = invoice;
        }

        // Asociar entidad relacionada: product, accommodation o excursion
        if (d.productId) {
          const product = await queryRunner.manager.findOne(Product, {
            where: { productId: d.productId },
          });
          if (!product)
            throw new BadRequestException(`Producto ${d.productId} no existe`);
          detailEntity.product = product;
          detailEntity.accommodation = null;
          detailEntity.excursion = null;
        } else if (d.accommodationId) {
          const accommodation = await queryRunner.manager.findOne(
            Accommodation,
            { where: { accommodationId: d.accommodationId } },
          );
          if (!accommodation)
            throw new BadRequestException(
              `Hospedaje ${d.accommodationId} no existe`,
            );
          detailEntity.accommodation = accommodation;
          detailEntity.product = null;
          detailEntity.excursion = null;
        } else if (d.excursionId) {
          const excursion = await queryRunner.manager.findOne(Excursion, {
            where: { excursionId: d.excursionId },
          });
          if (!excursion)
            throw new BadRequestException(
              `Excursión ${d.excursionId} no existe`,
            );
          detailEntity.excursion = excursion;
          detailEntity.product = null;
          detailEntity.accommodation = null;
        } else {
          throw new BadRequestException(
            'Debe asignar productId, accommodationId o excursionId en detalle',
          );
        }

        // TaxeType opcional
        if (d.taxeTypeId) {
          const taxeType = await queryRunner.manager.findOne(TaxeType, {
            where: { taxeTypeId: d.taxeTypeId },
          });
          if (!taxeType)
            throw new BadRequestException(`TaxeType ${d.taxeTypeId} no existe`);
          detailEntity.taxeType = taxeType;
        } else {
          detailEntity.taxeType = null;
        }

        // Asignar valores numéricos
        detailEntity.amount = d.amount;
        detailEntity.priceWithoutTax = d.priceWithoutTax;
        detailEntity.priceWithTax = d.priceWithTax;
        detailEntity.subtotal = d.subtotal;

        detailsToSave.push(detailEntity);
      }

      // Guardar detalles (nuevos y editados)
      await queryRunner.manager.save(InvoiceDetail, detailsToSave);

      // Eliminar detalles que ya no están en el arreglo enviado
      const toDelete = invoice.invoiceDetails.filter(
        (d) => !keepDetailIds.has(d.invoiceDetailId),
      );

      if (toDelete.length > 0) {
        await queryRunner.manager.remove(InvoiceDetail, toDelete);
      }

      // Commit de la transacción
      await queryRunner.commitTransaction();

      // Retornar la factura actualizada con detalles
      return this.findOne(invoiceId);
    } catch (error) {
      // Rollback en caso de error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Liberar queryRunner
      await queryRunner.release();
    }
  }

  async delete(invoiceId: number) {
    await this.findOne(invoiceId);

    // Primero elimina los detalles asociados
    await this._invoiceDetailRepository.delete({ invoice: { invoiceId } });

    // Luego elimina la factura
    return await this._invoiceRepository.delete(invoiceId);
  }
}
