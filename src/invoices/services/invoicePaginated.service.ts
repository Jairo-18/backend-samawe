import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { CreditNoteRepository } from './../../shared/repositories/creditNote.repository';
import { AdjustmentNoteRepository } from './../../shared/repositories/adjustmentNote.repository';
import { DebitNoteRepository } from './../../shared/repositories/debitNote.repository';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { Invoice } from './../../shared/entities/invoice.entity';
import { PaginatedListInvoicesParamsDto } from '../dtos/paginatedInvoice.dto';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { Injectable } from '@nestjs/common';
import { SimplifiedInvoiceResponse } from '../models/invoice.model';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';

@Injectable()
export class InvoicedPaginatedService {
  constructor(
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _creditNoteRepository: CreditNoteRepository,
    private readonly _adjustmentNoteRepository: AdjustmentNoteRepository,
    private readonly _debitNoteRepository: DebitNoteRepository,
  ) {}

  /**
   * Conteo + total por factura de una tabla de notas (crédito, ajuste o
   * débito). Las tres tienen la misma forma (`invoiceId` + `total`), así que
   * una sola función agregada evita tres bloques calcados.
   */
  private async aggregateNotes(
    repository: Repository<any>,
    alias: string,
    invoiceIds: number[],
  ): Promise<Map<number, { count: number; total: number }>> {
    const agg = new Map<number, { count: number; total: number }>();
    if (!invoiceIds.length) return agg;

    const rows = await repository
      .createQueryBuilder(alias)
      .select(`${alias}.invoiceId`, 'invoiceId')
      .addSelect('COUNT(*)', 'count')
      .addSelect(`COALESCE(SUM(${alias}.total), 0)`, 'total')
      .where(`${alias}.invoiceId IN (:...ids)`, { ids: invoiceIds })
      .groupBy(`${alias}.invoiceId`)
      .getRawMany<{ invoiceId: number; count: string; total: string }>();

    for (const r of rows) {
      agg.set(Number(r.invoiceId), {
        count: Number(r.count),
        total: Number(r.total),
      });
    }
    return agg;
  }

  async paginatedList(
    params: PaginatedListInvoicesParamsDto,
  ): Promise<ResponsePaginationDto<Invoice>> {
    const skip = (params.page - 1) * params.perPage;
    const take = params.perPage;

    const query = this._invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.user', 'user')
      .leftJoinAndSelect('invoice.employee', 'employee')
      .leftJoinAndSelect('user.identificationType', 'userIdentificationType')
      .leftJoinAndSelect(
        'employee.identificationType',
        'employeeIdentificationType',
      )
      .leftJoinAndSelect('invoice.invoiceDetails', 'invoiceDetails')
      .leftJoinAndSelect('invoiceDetails.taxeType', 'taxeType')
      .leftJoinAndSelect('invoice.payType', 'payType')
      .leftJoinAndSelect('invoice.paidType', 'paidType')
      .leftJoinAndSelect('invoice.invoiceType', 'invoiceType')
      .leftJoinAndSelect('invoice.stateType', 'stateType')
      .where('1=1');

    if (params.invoiceTypeId) {
      query.andWhere('invoice.invoiceType = :invoiceType', {
        invoiceType: params.invoiceTypeId,
      });
    }

    if (params.stateTypeId) {
      query.andWhere('invoice.stateType = :stateTypeId', {
        stateTypeId: params.stateTypeId,
      });
    }

    if (params.hasTable) {
      query.andWhere(
        "invoice.tableNumber IS NOT NULL AND invoice.tableNumber != '0' AND invoice.tableNumber != ''",
      );
    }

    if (params.stateTypeIds) {
      const stateIds = params.stateTypeIds
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((id) => !isNaN(id));

      if (stateIds.length > 0) {
        query.andWhere('invoice.stateType IN (:...stateTypeIds)', {
          stateTypeIds: stateIds,
        });
      }
    }

    if (params.code) {
      query.andWhere('invoice.code ILIKE :code', { code: `%${params.code}%` });
    }

    if (params.clientName) {
      query.andWhere(
        `(user.firstName ILIKE :clientName OR user.lastName ILIKE :clientName)`,
        { clientName: `%${params.clientName}%` },
      );
    }

    if (params.invoiceElectronic !== undefined) {
      query.andWhere('invoice.invoiceElectronic = :invoiceElectronic', {
        invoiceElectronic: params.invoiceElectronic,
      });
    }

    if (params.employeeName) {
      query.andWhere(
        `(employee.firstName ILIKE :employeeName OR employee.lastName ILIKE :employeeName)`,
        { employeeName: `%${params.employeeName}%` },
      );
    }

    if (params.identificationTypeId) {
      query.andWhere('user.identificationTypeId = :clientIdentificationType', {
        clientIdentificationType: params.identificationTypeId,
      });
    }

    if (params.payTypeId) {
      query.andWhere('invoice.payType = :payTypeId', {
        payTypeId: params.payTypeId,
      });
    }

    if (params.paidTypeId) {
      query.andWhere('invoice.paidType = :paidTypeId', {
        paidTypeId: params.paidTypeId,
      });
    }

    if (params.total !== undefined) {
      query.andWhere('invoice.total = :total', { total: params.total });
    }

    if (params.createdAtFrom && params.createdAtTo) {
      query.andWhere('invoice.createdAt BETWEEN :from AND :to', {
        from: params.createdAtFrom,
        to: params.createdAtTo,
      });
    } else if (params.createdAtFrom) {
      query.andWhere('invoice.createdAt >= :from', {
        from: params.createdAtFrom,
      });
    } else if (params.createdAtTo) {
      query.andWhere('invoice.createdAt <= :to', { to: params.createdAtTo });
    }

    if (params.startDate && params.endDate) {
      const start = `${params.startDate} 00:00:00`;
      const end = `${params.endDate} 23:59:59`;

      query.andWhere('invoice.startDate BETWEEN :start AND :end', {
        start,
        end,
      });
    } else if (params.startDate) {
      const start = `${params.startDate} 00:00:00`;
      const end = `${params.startDate} 23:59:59`;

      query.andWhere('invoice.startDate BETWEEN :start AND :end', {
        start,
        end,
      });
    } else if (params.endDate) {
      const end = `${params.endDate} 23:59:59`;
      query.andWhere('invoice.startDate <= :end', { end });
    }

    if (params.taxeTypeId) {
      query.andWhere('invoiceDetails.taxeType = :taxeTypeId', {
        taxeTypeId: params.taxeTypeId,
      });
    }

    if (params.search) {
      const search = params.search.trim();
      const isNumeric = !isNaN(Number(search));
      const searchStr = `%${search}%`;

      const conditions: string[] = [
        'invoice.code ILIKE :searchStr',
        'user.firstName ILIKE :searchStr',
        'user.lastName ILIKE :searchStr',
        'user.identificationNumber ILIKE :searchStr',
        'employee.firstName ILIKE :searchStr',
        'employee.lastName ILIKE :searchStr',
      ];

      if (isNumeric) {
        conditions.push(
          'CAST(invoice.total AS TEXT) ILIKE :searchStr',
          'CAST(invoice.subtotalWithTax AS TEXT) ILIKE :searchStr',
          'CAST(invoice.subtotalWithoutTax AS TEXT) ILIKE :searchStr',
        );
      }

      query.andWhere(`(${conditions.join(' OR ')})`, { searchStr });
    }

    if (params.organizationalId) {
      query.andWhere('invoice.organizational = :organizationalId', {
        organizationalId: params.organizationalId,
      });
    }

    query
      .skip(skip)
      .take(take)
      .orderBy('invoice.createdAt', params.order ?? 'DESC');

    const [items, itemCount] = await query.getManyAndCount();

    // Notas por factura (conteo + total) para mostrar el badge y el neto en la
    // lista, sin tocar el documento original. Las tres se piden porque cada
    // tipo de documento tiene la suya: la nota crédito resta de una factura de
    // venta, la nota de AJUSTE resta de un documento soporte (es su única forma
    // de anularse) y la nota débito suma. Sin las dos últimas, un DSE anulado o
    // una factura con nota débito se veían en la lista como si nada.
    const invoiceIds = items.map((i) => i.invoiceId);
    const [creditAgg, adjustmentAgg, debitAgg] = await Promise.all([
      this.aggregateNotes(this._creditNoteRepository, 'cn', invoiceIds),
      this.aggregateNotes(this._adjustmentNoteRepository, 'an', invoiceIds),
      this.aggregateNotes(this._debitNoteRepository, 'dn', invoiceIds),
    ]);

    const transformedItems = items.map((invoice) => {
      let totalTaxes = 0;
      let totalVat = 0;
      let totalIco8 = 0;
      let totalIco5 = 0;
      if (invoice.invoiceDetails && invoice.invoiceDetails.length > 0) {
        invoice.invoiceDetails.forEach((detail) => {
          const vat = Math.round(Number(detail.totalVat ?? 0) * 100) / 100;
          const ico8 = Math.round(Number(detail.totalIco8 ?? 0) * 100) / 100;
          const ico5 = Math.round(Number(detail.totalIco5 ?? 0) * 100) / 100;
          totalVat += vat;
          totalIco8 += ico8;
          totalIco5 += ico5;
          totalTaxes += vat + ico8 + ico5;
        });
      }

      const simplified: SimplifiedInvoiceResponse = {
        invoiceId: invoice.invoiceId,
        code: invoice.code,
        invoiceElectronic: invoice.invoiceElectronic,
        subtotalWithoutTax:
          typeof invoice.subtotalWithoutTax === 'string'
            ? parseFloat(invoice.subtotalWithoutTax) || 0
            : invoice.subtotalWithoutTax || 0,
        subtotalWithTax:
          typeof invoice.subtotalWithTax === 'string'
            ? parseFloat(invoice.subtotalWithTax) || 0
            : invoice.subtotalWithTax || 0,
        total:
          typeof invoice.total === 'string'
            ? parseFloat(invoice.total) || 0
            : invoice.total || 0,
        totalTaxes,
        totalVat: Math.round(totalVat * 100) / 100,
        totalIco8: Math.round(totalIco8 * 100) / 100,
        totalIco5: Math.round(totalIco5 * 100) / 100,
        tableNumber: invoice.tableNumber,
        orderTime: invoice.orderTime,
        readyTime: invoice.readyTime,
        servedTime: invoice.servedTime,
        startDate: invoice.startDate,
        endDate: invoice.endDate,
        user: invoice.user
          ? {
              userId: invoice.user.userId,
              identificationNumber: invoice.user.identificationNumber,
              firstName: invoice.user.firstName,
              lastName: invoice.user.lastName,
              identificationType: invoice.user.identificationType
                ? {
                    identificationTypeId: Number(
                      invoice.user.identificationType.identificationTypeId,
                    ),
                    code: invoice.user.identificationType.code,
                    name: invoice.user.identificationType.name,
                  }
                : undefined,
            }
          : undefined,
        employee: invoice.employee
          ? {
              userId: invoice.employee.userId,
              identificationNumber: invoice.employee.identificationNumber,
              firstName: invoice.employee.firstName,
              lastName: invoice.employee.lastName,
              identificationType: invoice.employee.identificationType
                ? {
                    identificationTypeId: Number(
                      invoice.employee.identificationType.identificationTypeId,
                    ),
                    code: invoice.employee.identificationType.code,
                    name: invoice.employee.identificationType.name,
                  }
                : undefined,
            }
          : undefined,
        invoiceDetails: invoice.invoiceDetails?.map((detail) => ({
          invoiceDetailId: detail.invoiceDetailId,
          taxeType: detail.taxeType
            ? {
                taxeTypeId: Number(detail.taxeType.taxeTypeId),
                name: detail.taxeType.name,
                percentage: parseFloat(detail.taxeType.percentage.toString()),
              }
            : undefined,
        })),
        payType: invoice.payType
          ? {
              payTypeId: Number(invoice.payType.payTypeId),
              code: invoice.payType.code,
              name: invoice.payType.name,
            }
          : undefined,
        paidType: invoice.paidType
          ? {
              paidTypeId: Number(invoice.paidType.paidTypeId),
              code: invoice.paidType.code,
              name: invoice.paidType.name,
            }
          : undefined,
        invoiceType: invoice.invoiceType
          ? {
              invoiceTypeId: Number(invoice.invoiceType.invoiceTypeId),
              code: invoice.invoiceType.code,
              name: invoice.invoiceType.name,
            }
          : undefined,
        stateType: invoice.stateType
          ? {
              stateTypeId: Number(invoice.stateType.stateTypeId),
              code: invoice.stateType.code,
              name: invoice.stateType.name,
            }
          : undefined,
        factusNumber: invoice.factusNumber ?? undefined,
        creditNotesCount: creditAgg.get(invoice.invoiceId)?.count ?? 0,
        creditNotesTotal: creditAgg.get(invoice.invoiceId)?.total ?? 0,
        adjustmentNotesCount: adjustmentAgg.get(invoice.invoiceId)?.count ?? 0,
        adjustmentNotesTotal: adjustmentAgg.get(invoice.invoiceId)?.total ?? 0,
        debitNotesCount: debitAgg.get(invoice.invoiceId)?.count ?? 0,
        debitNotesTotal: debitAgg.get(invoice.invoiceId)?.total ?? 0,
      };

      return plainToInstance(Invoice, simplified);
    });

    const pageMeta = new PageMetaDto({
      itemCount,
      pageOptionsDto: params,
    });

    return new ResponsePaginationDto(transformedItems, pageMeta);
  }
}
