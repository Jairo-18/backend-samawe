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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
} from './../decorators/excursion.decorators';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';

@Controller('excursion')
@ApiTags('Pasadías')
@ApiBearerAuth()
@UseGuards(AuthGuard(), RolesGuard)
@Roles(
  RolesUser.SUPERADMIN,
  RolesUser.ADMIN,
  RolesUser.EMP,
  RolesUser.MES,
  RolesUser.CHE,
)
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
      message: 'api.excursion.created',
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
      message: 'api.excursion.updated',
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

  @Get()
  async findAll(@Query('organizationalId') organizationalId?: string) {
    return await this._crudExcursionUC.findAll(organizationalId);
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
      message: 'api.excursion.deleted',
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
      message: 'api.excursion.image_uploaded',
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
      message: 'api.excursion.image_deleted',
    };
  }
}
