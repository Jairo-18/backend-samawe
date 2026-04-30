import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ReviewUC } from '../useCases/reviewUC.uc';
import {
  CreateReviewDto,
  UpdateReviewDto,
  CreateReviewReplyDto,
  UpdateReviewReplyDto,
} from '../dtos/review.dto';
import { GoogleBusinessService } from '../../organizational/services/google-business.service';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { RolesUser } from '../../shared/roles/RolesUser.enum';
import { Throttle } from '@nestjs/throttler';

const ALL_ROLES = [
  RolesUser.SUPERADMIN,
  RolesUser.ADMIN,
  RolesUser.EMP,
  RolesUser.MES,
  RolesUser.CHE,
  RolesUser.USER,
  RolesUser.PRO,
];

@Controller('reviews')
@ApiTags('Reseñas')
export class ReviewController {
  constructor(
    private readonly _reviewUC: ReviewUC,
    private readonly _googleBusinessService: GoogleBusinessService,
  ) {}

  @Get('google')
  @ApiOperation({ summary: 'Reseñas de Google Business del tenant' })
  async findGoogleReviews(@Query('organizationalId') organizationalId: string) {
    return {
      statusCode: HttpStatus.OK,
      data: await this._googleBusinessService.getGoogleReviews(
        organizationalId,
      ),
    };
  }

  @Get('paginated')
  @ApiOperation({ summary: 'Listar reseñas paginadas' })
  async findPaginated(
    @Query('organizationalId') organizationalId: string,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 15,
    @Query('search') search?: string,
    @Query('filter') filter?: 'all' | '1' | '2' | '3' | '4' | '5',
    @Query('sort') sort?: 'newest' | 'oldest',
  ) {
    return this._reviewUC.findPaginated(
      organizationalId,
      Number(page),
      Number(perPage),
      search,
      filter,
      sort,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las reseñas con sus respuestas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de reseñas del hotel',
    content: {
      'application/json': {
        example: {
          statusCode: 200,
          data: [
            {
              reviewId: 1,
              title: 'Excelente estadía',
              comment:
                'El hotel superó todas mis expectativas, el servicio fue impecable.',
              createdAt: '2026-04-23T10:00:00.000Z',
              updatedAt: '2026-04-23T10:00:00.000Z',
              user: {
                userId: 'uuid-del-usuario',
                firstName: 'Juan',
                lastName: 'García',
                avatarUrl: null,
              },
              organizational: {
                organizationalId: 'uuid-de-la-organizacion',
                name: 'Hotel Samawe',
              },
              replies: [
                {
                  reviewReplyId: 1,
                  comment:
                    '¡Gracias por tu comentario, Juan! Fue un placer recibirte.',
                  createdAt: '2026-04-23T12:00:00.000Z',
                  updatedAt: '2026-04-23T12:00:00.000Z',
                  user: {
                    userId: 'uuid-del-staff',
                    firstName: 'Ana',
                    lastName: 'López',
                    avatarUrl: null,
                  },
                },
              ],
            },
          ],
        },
      },
    },
  })
  async findAll(@Query('organizationalId') organizationalId?: string) {
    return {
      statusCode: HttpStatus.OK,
      data: await this._reviewUC.findAll(organizationalId),
    };
  }

  @Get(':id')
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener una reseña por ID' })
  async findOne(@Param('id', ParseIntPipe) reviewId: number) {
    return {
      statusCode: HttpStatus.OK,
      data: await this._reviewUC.findOne(reviewId),
    };
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear una reseña' })
  async create(@Request() req: any, @Body() dto: CreateReviewDto) {
    const review = await this._reviewUC.create(req.user.userId, dto);
    return {
      message: 'api.review.created',
      statusCode: HttpStatus.CREATED,
      data: review,
    };
  }

  @Patch(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar una reseña propia' })
  async update(
    @Param('id', ParseIntPipe) reviewId: number,
    @Request() req: any,
    @Body() dto: UpdateReviewDto,
  ) {
    const review = await this._reviewUC.update(reviewId, req.user.userId, dto);
    return {
      message: 'api.review.updated',
      statusCode: HttpStatus.OK,
      data: review,
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar una reseña propia' })
  async remove(
    @Param('id', ParseIntPipe) reviewId: number,
    @Request() req: any,
  ) {
    await this._reviewUC.remove(reviewId, req.user.userId);
    return {
      message: 'api.review.deleted',
      statusCode: HttpStatus.OK,
    };
  }

  @Post(':id/replies')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Responder a una reseña' })
  async createReply(
    @Param('id', ParseIntPipe) reviewId: number,
    @Request() req: any,
    @Body() dto: CreateReviewReplyDto,
  ) {
    const reply = await this._reviewUC.createReply(
      reviewId,
      req.user.userId,
      dto,
    );
    return {
      message: 'api.review.reply_added',
      statusCode: HttpStatus.CREATED,
      data: reply,
    };
  }

  @Patch(':reviewId/replies/:replyId')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Editar una respuesta propia' })
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  async updateReply(
    @Param('replyId', ParseIntPipe) reviewReplyId: number,
    @Request() req: any,
    @Body() dto: UpdateReviewReplyDto,
  ) {
    const reply = await this._reviewUC.updateReply(
      reviewReplyId,
      req.user.userId,
      dto,
    );
    return {
      message: 'api.review.reply_updated',
      statusCode: HttpStatus.OK,
      data: reply,
    };
  }

  @Delete(':reviewId/replies/:replyId')
  @ApiOperation({ summary: 'Eliminar una respuesta propia' })
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(...ALL_ROLES)
  @ApiBearerAuth()
  async removeReply(
    @Param('replyId', ParseIntPipe) reviewReplyId: number,
    @Request() req: any,
  ) {
    await this._reviewUC.removeReply(reviewReplyId, req.user.userId);
    return {
      message: 'api.review.reply_deleted',
      statusCode: HttpStatus.OK,
    };
  }
}
