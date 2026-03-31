import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { OrganizationalUC } from '../useCases/organizational.uc';
import {
  CreateOrganizationalDto,
  UpdateOrganizationalDto,
  CreateOrganizationalMediaDto,
  UpdateOrganizationalMediaDto,
  CreateCorporateValueDto,
  UpdateCorporateValueDto,
} from '../dtos/organizational.dto';
import { AuthGuard } from '@nestjs/passport';
import {
  CreateOrganizationalDocs,
  FindAllOrganizationalDocs,
  FindOneOrganizationalDocs,
  UpdateOrganizationalDocs,
  DeleteOrganizationalDocs,
  AddMediaDocs,
  UpdateMediaDocs,
  DeleteMediaDocs,
  UploadMediaDocs,
  GetMediaMapDocs,
  FindAllMediaTypesDocs,
} from '../decorators/organizational.decorators';
import { FileInterceptor } from '@nestjs/platform-express';
import { LocalStorageService } from '../../local-storage/services/local-storage.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreatedRecordResponseDto } from 'src/shared/dtos/response.dto';

@Controller('organizational')
@ApiTags('Organizacion')
export class OrganizationalController {
  constructor(
    private readonly _organizationalUC: OrganizationalUC,
    private readonly _localStorageService: LocalStorageService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @CreateOrganizationalDocs()
  @UseGuards(AuthGuard())
  async create(@Body() dto: CreateOrganizationalDto) {
    return await this._organizationalUC.create(dto);
  }

  @Get()
  @ApiBearerAuth()
  @FindAllOrganizationalDocs()
  @UseGuards(AuthGuard())
  async findAll() {
    const orgs = await this._organizationalUC.findAll();
    return {
      statusCode: HttpStatus.OK,
      data: orgs,
    };
  }

  @Get('media-types')
  @ApiBearerAuth()
  @FindAllMediaTypesDocs()
  @UseGuards(AuthGuard())
  async findAllMediaTypes() {
    const types = await this._organizationalUC.findAllMediaTypes();
    return {
      statusCode: HttpStatus.OK,
      data: types,
    };
  }

  @Get(':id')
  @FindOneOrganizationalDocs()
  async findOne(@Param('id') id: string) {
    const org = await this._organizationalUC.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      data: org,
    };
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const org = await this._organizationalUC.findBySlug(slug);
    return {
      statusCode: HttpStatus.OK,
      data: org,
    };
  }

  @Get(':id/media')
  @GetMediaMapDocs()
  async getMediaMap(@Param('id') id: string) {
    const map = await this._organizationalUC.getMediaMap(id);
    return {
      statusCode: HttpStatus.OK,
      data: map,
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UpdateOrganizationalDocs()
  @UseGuards(AuthGuard())
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationalDto) {
    await this._organizationalUC.update(id, dto);
    return {
      message: 'Organización actualizada correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @DeleteOrganizationalDocs()
  @UseGuards(AuthGuard())
  async delete(@Param('id') id: string) {
    await this._organizationalUC.delete(id);
    return {
      message: 'Organización eliminada correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Post(':id/media')
  @ApiBearerAuth()
  @AddMediaDocs()
  @UseGuards(AuthGuard())
  async addMedia(
    @Param('id') id: string,
    @Body() dto: CreateOrganizationalMediaDto,
  ) {
    return await this._organizationalUC.addMedia(id, dto);
  }

  @Post(':id/upload-media')
  @ApiBearerAuth()
  @UploadMediaDocs()
  @UseInterceptors(FileInterceptor('file'))
  @UseGuards(AuthGuard())
  async uploadMedia(
    @Param('id') id: string,
    @Body('mediaTypeId') mediaTypeId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<CreatedRecordResponseDto> {
    const uploadResult = await this._localStorageService.saveImage(
      file,
      'organizational',
    );
    const data = await this._organizationalUC.addMedia(id, {
      url: uploadResult.imageUrl,
      publicId: uploadResult.publicId,
      mediaTypeId: parseInt(mediaTypeId),
      label: file.originalname,
    });
    return {
      message: 'Media agregada correctamente',
      statusCode: HttpStatus.CREATED,
      data,
    };
  }

  @Patch('media/:mediaId')
  @ApiBearerAuth()
  @UpdateMediaDocs()
  @UseGuards(AuthGuard())
  async updateMedia(
    @Param('mediaId') mediaId: string,
    @Body() dto: UpdateOrganizationalMediaDto,
  ) {
    await this._organizationalUC.updateMedia(mediaId, dto);
    return {
      message: 'Media actualizada correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete('media/:mediaId')
  @ApiBearerAuth()
  @DeleteMediaDocs()
  @UseGuards(AuthGuard())
  async deleteMedia(@Param('mediaId') mediaId: string) {
    await this._organizationalUC.deleteMedia(mediaId);
    return {
      message: 'Media eliminada correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Get(':id/corporate-values')
  async getCorporateValues(@Param('id') id: string) {
    const values = await this._organizationalUC.getCorporateValues(id);
    return { statusCode: HttpStatus.OK, data: values };
  }

  @Post(':id/corporate-values')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async createCorporateValue(
    @Param('id') id: string,
    @Body() dto: CreateCorporateValueDto,
  ) {
    const data = await this._organizationalUC.createCorporateValue(id, dto);
    return { statusCode: HttpStatus.CREATED, data };
  }

  @Patch('corporate-values/:valueId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async updateCorporateValue(
    @Param('valueId') valueId: string,
    @Body() dto: UpdateCorporateValueDto,
  ) {
    await this._organizationalUC.updateCorporateValue(valueId, dto);
    return { message: 'Valor corporativo actualizado', statusCode: HttpStatus.OK };
  }

  @Delete('corporate-values/:valueId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async deleteCorporateValue(@Param('valueId') valueId: string) {
    await this._organizationalUC.deleteCorporateValue(valueId);
    return { message: 'Valor corporativo eliminado', statusCode: HttpStatus.OK };
  }
}
