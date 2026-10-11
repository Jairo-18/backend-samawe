import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
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
import { IMAGE_UPLOAD_OPTIONS } from '../../shared/constants/upload.constant';
import { LocalStorageService } from '../../local-storage/services/local-storage.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreatedRecordResponseDto } from 'src/shared/dtos/response.dto';
import { toPublicOrganizational } from '../mappers/organizational-public.mapper';
import { TenantContext } from '../../tenant/tenant-context.service';

/**
 * Quién puede CAMBIAR la configuración del hotel (datos, marca, medios,
 * valores). El rol de la clase incluye EMP para las lecturas de staff —la
 * impresión de facturas necesita `GET :id` para el representante legal—, pero
 * recepción no tiene la vista "Aplicación" en el menú y no debe poder editar la
 * organización por API. Crear o borrar una organización es cosa de plataforma.
 */
const ORG_EDITORS = [RolesUser.SUPERADMIN, RolesUser.ADMIN];

/**
 * Quién administra TODAS las organizaciones (listar, crear, borrar, editar
 * otra). Por ahora el SUPERADMIN, como pidió el dueño; PLATFORM_ADMIN queda
 * incluido para cuando exista una cuenta de plataforma.
 */
const PLATFORM_MANAGERS = [RolesUser.SUPERADMIN, RolesUser.PLATFORM_ADMIN];

interface RequestUser {
  user?: {
    organizationalId?: string | null;
    /** Super administrador "dentro" de otra organización: la suya. */
    homeOrganizationalId?: string | null;
    roleType?: { code?: string };
  };
}

const isPlatformManager = (req: RequestUser) =>
  PLATFORM_MANAGERS.includes(req.user?.roleType?.code as RolesUser);

@Controller('organizational')
@ApiTags('Organizacion')
@Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN, RolesUser.EMP)
export class OrganizationalController {
  constructor(
    private readonly _organizationalUC: OrganizationalUC,
    private readonly _localStorageService: LocalStorageService,
    private readonly _tenant: TenantContext,
  ) {}

  @Post()
  @ApiBearerAuth()
  @Roles(...PLATFORM_MANAGERS)
  @CreateOrganizationalDocs()
  @UseGuards(AuthGuard(), RolesGuard)
  async create(@Body() dto: CreateOrganizationalDto) {
    const data = await this._organizationalUC.create(dto);
    return {
      message: 'api.organizational.created',
      statusCode: HttpStatus.CREATED,
      data,
    };
  }

  /** Listado de plataforma: todas, con logo, dominios y uso. */
  @Get()
  @ApiBearerAuth()
  @Roles(...PLATFORM_MANAGERS)
  @FindAllOrganizationalDocs()
  @UseGuards(AuthGuard(), RolesGuard)
  async findAll() {
    const orgs = await this._organizationalUC.findAllForPlatform();
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

  /**
   * El hotel del sitio desde el que se llama, resuelto por el host (pública,
   * misma lista blanca que `slug/:slug`). Reemplazará al slug fijo del front.
   * Va ANTES de `:id`: Nest prueba las rutas en orden.
   */
  @Get('current')
  async findCurrent() {
    const org = await this._organizationalUC.findPublicById(
      this._tenant.requireOrganizationalId(),
    );
    return {
      statusCode: HttpStatus.OK,
      data: toPublicOrganizational(org),
    };
  }

  /**
   * Ficha completa (staff): la usan "Aplicación" y la impresión de facturas, que
   * necesita el representante legal. Antes era pública —sin guard, el `@Roles`
   * de la clase no hace nada solo— y cualquiera leía los datos personales del
   * propietario. El refresh token de Google Business no sale ni aquí: lleva
   * `@Exclude()` en la entidad.
   */
  @Get(':id')
  @ApiBearerAuth()
  @Roles(RolesUser.SUPERADMIN, RolesUser.ADMIN, RolesUser.EMP, RolesUser.PLATFORM_ADMIN)
  @FindOneOrganizationalDocs()
  @UseGuards(AuthGuard(), RolesGuard)
  async findOne(@Param('id') id: string, @Req() req: RequestUser) {
    this._assertCanSee(req, id);
    const org = await this._organizationalUC.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      data: org,
    };
  }

  /**
   * Pública: la carga la web en cada visita para la marca. Devuelve una lista
   * blanca (`toPublicOrganizational`), nunca la entidad — antes salía entera,
   * con `googleBusinessRefreshToken` y la configuración de Factus.
   */
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const org = await this._organizationalUC.findBySlug(slug);
    return {
      statusCode: HttpStatus.OK,
      data: toPublicOrganizational(org),
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
  @Roles(...ORG_EDITORS, RolesUser.PLATFORM_ADMIN)
  @UpdateOrganizationalDocs()
  @UseGuards(AuthGuard(), RolesGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationalDto,
    @Req() req: RequestUser,
  ) {
    this._assertCanSee(req, id);
    // Desactivar el hotel del sitio en uso lo deja sin servicio: su host deja
    // de resolver (`TenantResolverService`) y esta misma sesión se cae.
    if (dto.status === false && this._isInUse(id, req)) {
      throw new ConflictException(
        'No puedes desactivar la organización del sitio en el que estás conectado.',
      );
    }
    await this._organizationalUC.update(id, dto);
    return {
      message: 'api.organizational.updated',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(...PLATFORM_MANAGERS)
  @DeleteOrganizationalDocs()
  @UseGuards(AuthGuard(), RolesGuard)
  async delete(@Param('id') id: string, @Req() req: RequestUser) {
    if (this._isInUse(id, req)) {
      throw new ConflictException(
        'No puedes eliminar la organización del sitio en el que estás conectado.',
      );
    }
    await this._organizationalUC.delete(id);
    return {
      message: 'api.organizational.deleted',
      statusCode: HttpStatus.OK,
    };
  }

  /**
   * ¿Es una organización que esta sesión está usando? La abierta ahora (la del
   * host, o la elegida con el selector) Y la propia del usuario: estando
   * "dentro" de otro hotel, desactivar la propia tumbaría su sitio igual.
   */
  private _isInUse(organizationalId: string, req: RequestUser): boolean {
    return [
      this._tenant.organizationalId,
      req.user?.homeOrganizationalId,
      req.user?.organizationalId,
    ].includes(organizationalId);
  }

  /**
   * Fuera de la plataforma, cada quien solo ve y edita SU organización. Se
   * responde 404 (no 403) para no confirmar que el id existe.
   */
  private _assertCanSee(req: RequestUser, organizationalId: string): void {
    if (isPlatformManager(req)) return;
    if (req.user?.organizationalId !== organizationalId) {
      throw new NotFoundException('Organización no encontrada');
    }
  }

  @Post(':id/media')
  @ApiBearerAuth()
  @Roles(...ORG_EDITORS)
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
  @Roles(...ORG_EDITORS)
  @UploadMediaDocs()
  @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_OPTIONS))
  @UseGuards(AuthGuard(), RolesGuard)
  async uploadMedia(
    @Param('id') id: string,
    @Body('mediaTypeId') mediaTypeId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<CreatedRecordResponseDto> {
    // El vídeo principal se guarda tal cual; el resto pasa por sharp. Sin esta
    // bifurcación, subir un MP4 moría en `saveImage` con "Tipo de archivo no
    // permitido", porque allí solo se aceptan imágenes.
    const isVideo = await this._organizationalUC.isVideoMediaType(
      parseInt(mediaTypeId),
    );
    const uploadResult = isVideo
      ? await this._localStorageService.saveVideo(file, 'organizational')
      : await this._localStorageService.saveImage(file, 'organizational');
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
  @Roles(...ORG_EDITORS)
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
  @Roles(...ORG_EDITORS)
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
  @Roles(...ORG_EDITORS)
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
  @Roles(...ORG_EDITORS)
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
  @Roles(...ORG_EDITORS)
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
  @Roles(...ORG_EDITORS)
  @UseGuards(AuthGuard(), RolesGuard)
  @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_OPTIONS))
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
  @Roles(...ORG_EDITORS)
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
