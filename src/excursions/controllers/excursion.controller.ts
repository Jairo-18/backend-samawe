import {
  PaginatedExcursionSelectParamsDto,
  PaginatedListExcursionsParamsDto,
  PartialExcursionDto,
} from './../dtos/crudExcursion.dto';
import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import { CrudExcursionUC } from './../useCases/crudExcursionUC.uc';
import {
  CreateExcursionDto,
  GetExcursionDto,
  UpdateExcursionDto,
} from './../dtos/excursion.dto';
import { AuthGuard } from '@nestjs/passport';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  UpdateRecordResponseDto,
} from './../../shared/dtos/response.dto';
import { ExcursionUC } from './../useCases/excursionUC.uc';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LocalStorageService } from './../../local-storage/services/local-storage.service';
import { ExcursionImageService } from '../services/excursionImage.service';
import { ApiTags } from '@nestjs/swagger';
import { ExcursionInterfacePaginatedList } from '../interface/excursion.interface';
import {
  GetPaginatedPartialDocs,
  CreateExcursionDocs,
  UpdateExcursionDocs,
  GetPaginatedListDocs,
  FindOneExcursionDocs,
  DeleteExcursionDocs,
  UploadImageDocs,
  GetImagesDocs,
  DeleteImageDocs,
} from '../decorators/excursion.decorators';

@Controller('excursion')
@ApiTags('Pasadías')
@UseGuards(AuthGuard())
export class ExcursionController {
  constructor(
    private readonly _excursionUC: ExcursionUC,
    private readonly _crudExcursionUC: CrudExcursionUC,
    private readonly _excursionImageService: ExcursionImageService,
    private readonly _localStorageService: LocalStorageService,
  ) {}

  @Get('/paginated-partial')
  @GetPaginatedPartialDocs()
  async getPaginatedPartial(
    @Query() params: PaginatedExcursionSelectParamsDto,
  ): Promise<ResponsePaginationDto<PartialExcursionDto>> {
    return this._crudExcursionUC.paginatedPartialExcursion(params);
  }

  @Post('create')
  @CreateExcursionDocs()
  async create(
    @Body() excursionDto: CreateExcursionDto,
  ): Promise<CreatedRecordResponseDto> {
    const createExcursion = await this._excursionUC.create(excursionDto);
    return {
      message: 'Registro de pasadía exitoso',
      statusCode: HttpStatus.CREATED,
      data: {
        rowId: createExcursion.excursionId.toString(),
        ...createExcursion,
      },
    };
  }

  @Patch(':id')
  @UpdateExcursionDocs()
  async update(
    @Param('id') excursionId: string,
    @Body() excursionData: UpdateExcursionDto,
  ): Promise<UpdateRecordResponseDto> {
    await this._excursionUC.update(excursionId, excursionData);

    return {
      message: 'Pasadía actualizado correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('/paginated-list')
  @GetPaginatedListDocs()
  async getPaginatedList(
    @Query() params: PaginatedListExcursionsParamsDto,
  ): Promise<ResponsePaginationDto<ExcursionInterfacePaginatedList>> {
    return await this._crudExcursionUC.paginatedList(params);
  }

  @Get(':id')
  @FindOneExcursionDocs()
  async findOne(@Param('id') excursionId: string): Promise<GetExcursionDto> {
    const excursion = await this._excursionUC.findOne(excursionId);
    return {
      statusCode: HttpStatus.OK,
      data: excursion,
    };
  }

  @Delete(':id')
  @DeleteExcursionDocs()
  async delete(
    @Param('id') excursionId: number,
  ): Promise<DeleteReCordResponseDto> {
    await this._excursionUC.delete(excursionId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Pasadía eliminada exitosamente',
    };
  }

  @Post(':id/images')
  @UploadImageDocs()
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id') excursionId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const uploadResult = await this._localStorageService.saveImage(
      file,
      'excursions',
    );
    const addedImage = await this._excursionImageService.addExcursionImage(
      excursionId,
      uploadResult.imageUrl,
      uploadResult.publicId,
    );

    return {
      message: 'Imagen subida correctamente',
      data: addedImage,
    };
  }

  @Get(':id/images')
  @GetImagesDocs()
  async getImages(@Param('id') excursionId: number) {
    const images =
      await this._excursionImageService.getExcursionImages(excursionId);
    return {
      data: images,
    };
  }

  @Delete(':id/images/*publicId')
  @DeleteImageDocs()
  async deleteImage(
    @Param('id') excursionId: number,
    @Param('publicId') publicId: string,
  ) {
    const decodedPublicId = decodeURIComponent(publicId);
    await this._localStorageService.deleteImage(decodedPublicId);
    await this._excursionImageService.removeExcursionImage(
      excursionId,
      decodedPublicId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Imagen eliminada exitosamente',
    };
  }
}
