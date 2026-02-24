import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  DuplicatedResponseDto,
  NotFoundResponseDto,
  UpdateRecordResponseDto,
} from './../../shared/dtos/response.dto';
import { GetAllProductsResposeDto, GetProductDto } from './../dtos/product.dto';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { PartialProductDto } from './../dtos/crudProduct.dto';
import { Product } from './../../shared/entities/product.entity';

export function GetPaginatedPartialDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtiene una lista paginada parcial de productos',
    }),
    ApiOkResponse({ type: ResponsePaginationDto<PartialProductDto> }),
  );
}

export function CreateProductDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Crea un nuevo producto' }),
    ApiOkResponse({ type: CreatedRecordResponseDto }),
    ApiConflictResponse({ type: DuplicatedResponseDto }),
  );
}

export function FindAllProductsDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene todos los productos' }),
    ApiOkResponse({ type: GetAllProductsResposeDto }),
  );
}

export function UpdateProductDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Actualiza un producto por su ID' }),
    ApiOkResponse({ type: UpdateRecordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function GetPaginatedListDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Obtiene una lista paginada detallada de productos',
    }),
    ApiOkResponse({ type: ResponsePaginationDto<Product> }),
  );
}

export function FindOneProductDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene un producto por su ID' }),
    ApiOkResponse({ type: GetProductDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function DeleteProductDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Elimina un producto por su ID' }),
    ApiOkResponse({ type: DeleteReCordResponseDto }),
    ApiNotFoundResponse({ type: NotFoundResponseDto }),
  );
}

export function UploadImageDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Sube una imagen para el producto' }),
  );
}

export function GetImagesDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Obtiene las imágenes de un producto' }),
  );
}

export function DeleteImageDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Elimina una imagen de un producto' }),
  );
}
