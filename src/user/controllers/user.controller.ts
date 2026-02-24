import { PaginatedCodePhoneUser } from './../dtos/crudUser.dto';
import { PhoneCode } from './../../shared/entities/phoneCode.entity';
import { CrudUserUC } from './../useCases/crudUserUC';
import { UPDATED_MESSAGE } from './../../shared/constants/messages.constant';
import { User } from 'src/shared/entities/user.entity';
import {
  PaginatedListUsersParamsDto,
  PaginatedUserSelectParamsDto,
  PartialUserDto,
} from '../dtos/crudUser.dto';
import {
  CreatedRecordResponseDto,
  DeleteReCordResponseDto,
  UpdateRecordResponseDto,
} from '../../shared/dtos/response.dto';
import { ApiTags } from '@nestjs/swagger';
import {
  GetPaginatedPartialDocs,
  PaginatedPhoneCodeSelectDocs,
  GetPaginatedListDocs,
  FindAllUsersDocs,
  CreateUserDocs,
  RegisterUserDocs,
  RecoveryPasswordDocs,
  ChangePasswordDocs,
  FindOneUserDocs,
  UpdateUserDocs,
  DeleteUserDocs,
} from '../decorators/user.decorators';
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
@UseGuards(AuthGuard())
export class UserController {
  constructor(
    private readonly _userUC: UserUC,
    private readonly _crudUserUC: CrudUserUC,
  ) {}

  @Get('paginated-partial')
  @GetPaginatedPartialDocs()
  async getPaginatedPartial(
    @Query() params: PaginatedUserSelectParamsDto,
  ): Promise<ResponsePaginationDto<PartialUserDto>> {
    return this._crudUserUC.paginatedPartialUser(params);
  }

  @Get('paginated-phone-code')
  @PaginatedPhoneCodeSelectDocs()
  async paginatedPhoneCodeSelect(
    @Query() params: PaginatedCodePhoneUser,
  ): Promise<ResponsePaginationDto<PhoneCode>> {
    return await this._crudUserUC.paginatedPhoneCodeSelect(params);
  }

  @Get('paginated-list')
  @GetPaginatedListDocs()
  async getPaginatedList(
    @Query() params: PaginatedListUsersParamsDto,
  ): Promise<ResponsePaginationDto<User>> {
    return await this._crudUserUC.paginatedList(params);
  }

  @Get()
  @FindAllUsersDocs()
  async findAll(): Promise<GetAllUsersResposeDto> {
    const users = await this._userUC.findAll();
    return {
      statusCode: HttpStatus.OK,
      data: { users },
    };
  }

  @Post()
  @CreateUserDocs()
  async create(@Body() user: CreateUserDto): Promise<CreatedRecordResponseDto> {
    const rowId = await this._userUC.create(user);
    return {
      message: 'Usuario creado correctamente',
      statusCode: HttpStatus.CREATED,
      data: rowId,
    };
  }

  @Post('register')
  @RegisterUserDocs()
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

  @Patch('recovery-password')
  @RecoveryPasswordDocs()
  async recoveryPassword(
    @Body() body: RecoveryPasswordDto,
  ): Promise<UpdateRecordResponseDto> {
    await this._userUC.recoveryPassword(body);
    return {
      message: UPDATED_MESSAGE,
      statusCode: HttpStatus.OK,
    };
  }

  @Post('change-password')
  @ChangePasswordDocs()
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

  @Get(':id')
  @FindOneUserDocs()
  async findOne(@Param('id') id: string): Promise<GetUserResponseDto> {
    const user = await this._userUC.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      data: user,
    };
  }

  @Patch(':id')
  @UpdateUserDocs()
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
  @DeleteUserDocs()
  async delete(@Param('id') id: string): Promise<DeleteReCordResponseDto> {
    await this._userUC.delete(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Usuario eliminado exitosamente',
    };
  }
}
