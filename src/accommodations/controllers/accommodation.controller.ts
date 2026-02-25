import { ResponsePaginationDto } from './../../shared/dtos/pagination.dto';
import {
  PaginatedAccommodationSelectParamsDto,
  PaginatedListAccommodationsParamsDto,
  PartialAccommodationDto,
} from './../dtos/crudAccommodation.dto';
import { CrudAccommodationUC } from '../useCases/crudAccommodationUC.uc';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  UpdateRecordResponseDto,
} from './../../shared/dtos/response.dto';
import {
  CreateAccommodationDto,
  GetAcommodationDto,
  UpdateAccommodationDto,
} from './../dtos/accommodation.dto';
import { AccommodationUC } from './../useCases/accommodationUC.uc';
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
import { AccommodationImageService } from '../services/accommodationImage.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { AccommodationInterfacePaginatedList } from '../interface/accommodation.interface';
import {
  GetPaginatedPartialDocs,
  CreateAccommodationDocs,
  UpdateAccommodationDocs,
  GetPaginatedListDocs,
  FindOneAccommodationDocs,
  DeleteAccommodationDocs,
  UploadImageDocs,
  GetImagesDocs,
  DeleteImageDocs,
} from '../decorators/accommodation.decorators';

@Controller('accommodation')
@ApiTags('Hospedajes')
@UseGuards(AuthGuard())
export class AccommodationController {
  constructor(
    private readonly _accommodationUC: AccommodationUC,
    private readonly _crudAccommodationUC: CrudAccommodationUC,
    private readonly _accommodationImageService: AccommodationImageService,
    private readonly _localStorageService: LocalStorageService,
  ) {}

  @Get('/paginated-partial')
  @GetPaginatedPartialDocs()
  async getPaginatedPartial(
    @Query() params: PaginatedAccommodationSelectParamsDto,
  ): Promise<ResponsePaginationDto<PartialAccommodationDto>> {
    return this._crudAccommodationUC.paginatedPartialAccommodation(params);
  }

  @Post('create')
  @CreateAccommodationDocs()
  async create(
    @Body() accommodationDto: CreateAccommodationDto,
  ): Promise<CreatedRecordResponseDto> {
    const createAccommodation =
      await this._accommodationUC.create(accommodationDto);

    return {
      message: 'Registro de hospedaje exitoso',
      statusCode: HttpStatus.CREATED,
      data: {
        rowId: createAccommodation.accommodationId.toString(),
        ...createAccommodation,
      },
    };
  }

  @Patch(':id')
  @UpdateAccommodationDocs()
  async update(
    @Param('id') accommodationId: string,
    @Body() accommodationData: UpdateAccommodationDto,
  ): Promise<UpdateRecordResponseDto> {
    await this._accommodationUC.update(accommodationId, accommodationData);

    return {
      message: 'Hospedaje actualizado correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Get('/paginated-list')
  @GetPaginatedListDocs()
  async getPaginatedList(
    @Query() params: PaginatedListAccommodationsParamsDto,
  ): Promise<ResponsePaginationDto<AccommodationInterfacePaginatedList>> {
    return await this._crudAccommodationUC.paginatedList(params);
  }

  @Get(':id')
  @FindOneAccommodationDocs()
  async findOne(
    @Param('id') accommodationId: string,
  ): Promise<GetAcommodationDto> {
    const accommodation = await this._accommodationUC.findOne(accommodationId);
    return {
      statusCode: HttpStatus.OK,
      data: accommodation,
    };
  }

  @Delete(':id')
  @DeleteAccommodationDocs()
  async delete(
    @Param('id') accommodationId: number,
  ): Promise<DeleteReCordResponseDto> {
    await this._accommodationUC.delete(accommodationId);
    return {
      statusCode: HttpStatus.OK,
      message: 'Hospedaje eliminado exitosamente',
    };
  }

  @Post(':id/images')
  @UploadImageDocs()
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id') accommodationId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const uploadResult = await this._localStorageService.saveImage(
      file,
      'accommodations',
    );
    const addedImage =
      await this._accommodationImageService.addAccommodationImage(
        accommodationId,
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
  async getImages(@Param('id') accommodationId: number) {
    const images =
      await this._accommodationImageService.getAccommodationImages(
        accommodationId,
      );
    return {
      data: images,
    };
  }

  @Delete(':id/images/*publicId')
  @DeleteImageDocs()
  async deleteImage(
    @Param('id') accommodationId: number,
    @Param('publicId') publicId: string,
  ) {
    const decodedPublicId = decodeURIComponent(publicId);
    await this._localStorageService.deleteImage(decodedPublicId);
    await this._accommodationImageService.removeAccommodationImage(
      accommodationId,
      decodedPublicId,
    );
    return {
      statusCode: HttpStatus.OK,
      message: 'Imagen eliminada exitosamente',
    };
  }
}
