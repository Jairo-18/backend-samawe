import { UPDATED_MESSAGE } from './../../shared/constants/messages.constant';
import {
  NOT_FOUND_RESPONSE,
  UPDATED_RESPONSE,
} from './../../shared/constants/response.constant';
import { CrudUserUC } from './../useCases/crudUserUC';
import { User } from 'src/shared/entities/user.entity';

import {
  CreateUserRelatedDataReponseDto,
  PaginatedListUsersParamsDto,
  PaginatedUserSelectParamsDto,
  PartialUserDto,
} from '../dtos/crudUser.dto';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  DuplicatedResponseDto,
  NotFoundResponseDto,
  UpdateRecordResponseDto,
} from '../../shared/dtos/response.dto';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  GetAllUsersResposeDto,
  ChangePasswordDto,
  CreateUserDto,
  UpdateUserDto,
  GetUserResponseDto,
  RecoveryPasswordDto,
} from '../dtos/user.dto';

import { UserUC } from '../useCases/userUC.uc';
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
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ResponsePaginationDto } from 'src/shared/dtos/pagination.dto';

@Controller('user')
@ApiTags('Usuarios')
export class UserController {
  constructor(
    private readonly _userUC: UserUC,
    private readonly _crudUserUC: CrudUserUC,
  ) {}

  @Get('/paginated-partial')
  @ApiOkResponse({ type: ResponsePaginationDto<PartialUserDto> })
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async getPaginatedPartial(
    @Query() params: PaginatedUserSelectParamsDto,
  ): Promise<ResponsePaginationDto<PartialUserDto>> {
    return this._crudUserUC.paginatedPartialUser(params);
  }

  @Patch('/recovery-password')
  @ApiOkResponse(UPDATED_RESPONSE)
  @ApiNotFoundResponse(NOT_FOUND_RESPONSE)
  async recoveryPassword(
    @Body() body: RecoveryPasswordDto,
  ): Promise<UpdateRecordResponseDto> {
    await this._userUC.recoveryPassword(body);
    return {
      message: UPDATED_MESSAGE,
      statusCode: HttpStatus.OK,
    };
  }

  @Post('/change-password')
  @ApiOkResponse(UPDATED_RESPONSE)
  @ApiNotFoundResponse(NOT_FOUND_RESPONSE)
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async changePassword(
    @Body() body: ChangePasswordDto,
    @Req() req,
  ): Promise<UpdateRecordResponseDto> {
    await this._userUC.changePassword(body, req.user.id);
    return {
      message: UPDATED_MESSAGE,
      statusCode: HttpStatus.OK,
    };
  }

  @Get('/create/related-data')
  @ApiOkResponse({ type: CreateUserRelatedDataReponseDto })
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async getRelatedDataForCreate(): Promise<CreateUserRelatedDataReponseDto> {
    const data = await this._crudUserUC.getRelatedDataToCreate(false);
    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }

  @Get('/register/related-data')
  @ApiOkResponse({ type: CreateUserRelatedDataReponseDto })
  async getRelatedData(): Promise<CreateUserRelatedDataReponseDto> {
    const data = await this._crudUserUC.getRelatedDataToCreate(true);
    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetAllUsersResposeDto })
  async findAll(): Promise<GetAllUsersResposeDto> {
    const users = await this._userUC.findAll();
    return {
      statusCode: HttpStatus.OK,
      data: { users },
    };
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: CreatedRecordResponseDto })
  @ApiConflictResponse({ type: DuplicatedResponseDto })
  async create(@Body() user: CreateUserDto): Promise<CreatedRecordResponseDto> {
    const rowId = await this._userUC.create(user);
    return {
      message: 'Usuario creado correctamente',
      statusCode: HttpStatus.CREATED,
      data: rowId,
    };
  }

  @Post('register')
  @ApiOkResponse({ type: CreatedRecordResponseDto })
  @ApiConflictResponse({ type: DuplicatedResponseDto })
  async register(
    @Body() user: CreateUserDto,
  ): Promise<CreatedRecordResponseDto> {
    const rowId = await this._userUC.register(user);
    return {
      message: 'Registro exitoso',
      statusCode: HttpStatus.CREATED,
      data: rowId,
    };
  }

  @Get('/paginated-list')
  @ApiOkResponse({ type: ResponsePaginationDto<User> })
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async getPaginatedList(
    @Query() params: PaginatedListUsersParamsDto,
  ): Promise<ResponsePaginationDto<User>> {
    return await this._crudUserUC.paginatedList(params);
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetUserResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async findOne(@Param('id') id: string): Promise<GetUserResponseDto> {
    const user = await this._userUC.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      data: user,
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: UpdateRecordResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async update(
    @Param('id') id: string,
    @Body() userData: UpdateUserDto,
  ): Promise<UpdateRecordResponseDto> {
    await this._userUC.update(id, userData);

    return {
      message: 'Usuario actualizado correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: DeleteReCordResponseDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async delete(@Param('id') id: string): Promise<DeleteReCordResponseDto> {
    await this._userUC.delete(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Usuario eliminado exitosamente',
    };
  }
}
