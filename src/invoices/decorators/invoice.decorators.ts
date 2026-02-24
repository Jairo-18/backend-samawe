import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { PaginatedInvoiceResponseDto } from './../dtos/paginatedInvoice.dto';
import {
  CreateInvoiceDetailDto,
  TogglePaymentBulkDto,
  TogglePaymentBulkResponseDto,
  TogglePaymentResponseDto,
} from './../dtos/invoiceDetaill.dto';
import { CREATE_INVOICE_DETAILS_EXAMPLE } from '../constants/exampleInvoices.conts';
import { GetInvoiceWithDetailsResponseDto } from './../dtos/invoice.dto';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  DuplicatedResponseDto,
  NotFoundResponseDto,
  UpdateRecordResponseDto,
} from './../../shared/dtos/response.dto';

export function GetPaginatedListDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtener lista paginada de facturas' }),
    ApiOkResponse({ type: PaginatedInvoiceResponseDto }),
  );
}

export function CreateInvoiceDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Crear una nueva factura' }),
    ApiOkResponse({ type: CreatedRecordResponseDto }),
    ApiConflictResponse({ type: DuplicatedResponseDto }),
  );
}

export function FindOneInvoiceDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtener una factura por su ID con sus detalles' }),
    ApiOkResponse({ type: GetInvoiceWithDetailsResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function DeleteInvoiceDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Eliminar una factura por su ID' }),
    ApiOkResponse({ type: DeleteReCordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function CreateDetailsDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Agregar detalles (ítems) a una factura' }),
    ApiOkResponse({ type: CreatedRecordResponseDto }),
    ApiBody({
      type: [CreateInvoiceDetailDto],
      examples: {
        multipleItems: {
          summary: 'Lista completa de items (Ejemplo)',
          description:
            'Ejemplo de array con múltiples items incluyendo todos los campos posibles (Producto, Hospedaje, Excursión)',
          value: CREATE_INVOICE_DETAILS_EXAMPLE,
        },
      },
    }),
  );
}

export function UpdateInvoiceDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Actualizar la información de una factura' }),
    ApiOkResponse({ type: UpdateRecordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function DeleteDetailDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Eliminar un detalle específico de una factura' }),
    ApiOkResponse({ type: DeleteReCordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function ToggleDetailPaymentDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Alternar estado de pago de un detalle de factura',
    }),
    ApiOkResponse({
      description:
        'Actualiza el estado de pago del detalle y el total pagado de la factura',
      type: TogglePaymentResponseDto,
    }),
  );
}

export function ToggleDetailPaymentBulkDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Alternar estado de pago de múltiples detalles de factura',
    }),
    ApiOkResponse({
      description:
        'Actualiza el estado de pago de múltiples detalles y el total pagado de la factura',
      type: TogglePaymentBulkResponseDto,
    }),
    ApiBody({ type: TogglePaymentBulkDto }),
  );
}
