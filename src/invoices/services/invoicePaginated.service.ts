import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { PageMetaDto } from './../../shared/dtos/pageMeta.dto';
import { Invoice } from './../../shared/entities/invoice.entity';
import { PaginatedListInvoicesParamsDto } from '../dtos/paginatedInvoice.dto';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { Injectable } from '@nestjs/common';
import { SimplifiedInvoiceResponse } from '../models/invoice.model';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class InvoicedPaginatedService {
  constructor(private readonly _invoiceRepository: InvoiceRepository) {}

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
      .where('1=1');

    if (params.invoiceTypeId) {
      query.andWhere('invoice.invoiceType = :invoiceType', {
        invoiceType: params.invoiceTypeId,
      });
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

    if (params.startDate) {
      query.andWhere('invoice.startDate = :startDate', {
        startDate: params.startDate,
      });
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

    query
      .skip(skip)
      .take(take)
      .orderBy('invoice.createdAt', params.order ?? 'DESC');

    const [items, itemCount] = await query.getManyAndCount();

    const transformedItems = items.map((invoice) => {
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
