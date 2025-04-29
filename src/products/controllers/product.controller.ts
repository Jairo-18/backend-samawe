import { CreateProductDto } from './../dtos/product.dto';
import {
  Body,
  Controller,
  Delete,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductUC } from '../useCases/product.uc';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  DuplicatedResponseDto,
  NotFoundResponseDto,
} from 'src/shared/dtos/response.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('product')
@ApiTags('Productos')
export class ProductController {
  constructor(private readonly _productUC: ProductUC) {}

  @Post('create')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CreatedRecordResponseDto })
  @ApiConflictResponse({ type: DuplicatedResponseDto })
  async create(
    @Body() productDto: CreateProductDto,
  ): Promise<CreatedRecordResponseDto> {
    const createdProduct = await this._productUC.create(productDto);

    return {
      message: 'Registro exitoso',
      statusCode: HttpStatus.CREATED,
      data: {
        rowId: createdProduct.productId.toString(),
        ...createdProduct,
      },
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: DeleteReCordResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async delete(
    @Param('id') producId: string,
  ): Promise<DeleteReCordResponseDto> {
    await this._productUC.delete(producId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Producto eliminado exitosamente',
    };
  }
}
