import { CrudUserUseCase } from '../useCases/crudUser.UC';
import { CreateUserRelatedDataReponseDto } from '../dtos/crudUser.dto';
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
  GetUserDto,
  ChangePasswordDto,
  CreateUserDto,
  UpdateUserDto,
} from '../dtos/user.dto';

import { UserUC } from '../useCases/user.uc';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('user')
@ApiTags('Usuarios')
export class UserController {
  constructor(
    private readonly _userUC: UserUC,
    private readonly _crudUserUseCase: CrudUserUseCase,
  ) {}

  @Patch('change-password')
  @ApiOkResponse({ description: 'Contraseña actualizada correctamente' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async changePassword(@Request() req, @Body() body: ChangePasswordDto) {
    const userId = req.user.id;
    await this._userUC.changePassword(userId, body);
    return {
      statusCode: HttpStatus.OK,
      message: 'Contraseña actualizada correctamente',
    };
  }

  @Get('/register/related-data')
  @ApiOkResponse({ type: CreateUserRelatedDataReponseDto })
  async getRelatedData(): Promise<CreateUserRelatedDataReponseDto> {
    const data = await this._crudUserUseCase.getRelatedDataToCreate(true);
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

  @Get('init-data')
  @ApiOkResponse()
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  async initData(@Req() req) {
    const initData = await this._userUC.initData(req.user.id);
    return {
      statusCode: HttpStatus.OK,
      data: initData,
    };
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard())
  @ApiOkResponse({ type: GetUserDto })
  @ApiNotFoundResponse({ type: NotFoundResponseDto })
  async findOne(@Param('id') id: string): Promise<GetUserDto> {
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
