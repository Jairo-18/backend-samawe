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
import { SkipApiKey } from '../../shared/decorators/skip-api-key.decorator';
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
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';
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
@Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN, RolesUser.EMP)
export class OrganizationalController {
  constructor(
    private readonly _organizationalUC: OrganizationalUC,
    private readonly _localStorageService: LocalStorageService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @CreateOrganizationalDocs()
  @UseGuards(AuthGuard(), RolesGuard)
  async create(@Body() dto: CreateOrganizationalDto) {
    return await this._organizationalUC.create(dto);
  }

  @Get()
  @ApiBearerAuth()
  @FindAllOrganizationalDocs()
  @UseGuards(AuthGuard(), RolesGuard)
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
  @UseGuards(AuthGuard(), RolesGuard)
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
  @UseGuards(AuthGuard(), RolesGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationalDto) {
    await this._organizationalUC.update(id, dto);
    return {
      message: 'api.organizational.updated',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @DeleteOrganizationalDocs()
  @UseGuards(AuthGuard(), RolesGuard)
  async delete(@Param('id') id: string) {
    await this._organizationalUC.delete(id);
    return {
      message: 'api.organizational.deleted',
      statusCode: HttpStatus.OK,
    };
  }

  @Post(':id/media')
  @ApiBearerAuth()
  @AddMediaDocs()
  @UseGuards(AuthGuard(), RolesGuard)
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
  @UseGuards(AuthGuard(), RolesGuard)
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
      message: 'api.organizational.file_uploaded',
      statusCode: HttpStatus.CREATED,
      data,
    };
  }

  @Patch('media/:mediaId')
  @ApiBearerAuth()
  @UpdateMediaDocs()
  @UseGuards(AuthGuard(), RolesGuard)
  async updateMedia(
    @Param('mediaId') mediaId: string,
    @Body() dto: UpdateOrganizationalMediaDto,
  ) {
    await this._organizationalUC.updateMedia(mediaId, dto);
    return {
      message: 'api.organizational.file_updated',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete('media/:mediaId')
  @ApiBearerAuth()
  @DeleteMediaDocs()
  @UseGuards(AuthGuard(), RolesGuard)
  async deleteMedia(@Param('mediaId') mediaId: string) {
    await this._organizationalUC.deleteMedia(mediaId);
    return {
      message: 'api.organizational.file_deleted',
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
  @UseGuards(AuthGuard(), RolesGuard)
  async createCorporateValue(
    @Param('id') id: string,
    @Body() dto: CreateCorporateValueDto,
  ) {
    const data = await this._organizationalUC.createCorporateValue(id, dto);
    return { statusCode: HttpStatus.CREATED, data };
  }

  @Patch('corporate-values/:valueId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), RolesGuard)
  async updateCorporateValue(
    @Param('valueId') valueId: string,
    @Body() dto: UpdateCorporateValueDto,
  ) {
    await this._organizationalUC.updateCorporateValue(valueId, dto);
    return {
      message: 'api.organizational.value_updated',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete('corporate-values/:valueId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), RolesGuard)
  async deleteCorporateValue(@Param('valueId') valueId: string) {
    await this._organizationalUC.deleteCorporateValue(valueId);
    return {
      message: 'api.organizational.value_deleted',
      statusCode: HttpStatus.OK,
    };
  }

  @Post('corporate-values/:valueId/upload-image')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), RolesGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadCorporateValueImage(
    @Param('valueId') valueId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const uploadResult = await this._localStorageService.saveImage(
      file,
      'corporate-values',
    );
    const data = await this._organizationalUC.uploadCorporateValueImage(
      valueId,
      uploadResult.imageUrl,
      uploadResult.publicId,
    );
    return { statusCode: HttpStatus.OK, data };
  }

  @Delete('corporate-values/:valueId/image')
  @ApiBearerAuth()
  @UseGuards(AuthGuard(), RolesGuard)
  async deleteCorporateValueImage(@Param('valueId') valueId: string) {
    const publicId =
      await this._organizationalUC.deleteCorporateValueImage(valueId);
    if (publicId) {
      await this._localStorageService.deleteImage(publicId);
    }
    return {
      message: 'api.organizational.image_deleted',
      statusCode: HttpStatus.OK,
    };
  }
}
