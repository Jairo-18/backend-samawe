import { PaginatedCodePhoneUser } from './../dtos/crudUser.dto';
import { PhoneCode } from './../../shared/entities/phoneCode.entity';
import { CrudUserUC } from './../useCases/crudUserUC';
import { PASSWORD_CHANGED_MESSAGE } from './../../shared/constants/messages.constant';
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
  CreateUserDocs,
  RegisterUserDocs,
  RecoveryPasswordDocs,
  ChangePasswordDocs,
  FindOneUserDocs,
  UpdateUserDocs,
  DeleteUserDocs,
} from '../decorators/user.decorators';
import {
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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { ResponsePaginationDto } from 'src/shared/dtos/pagination.dto';

class VerifyEmailQueryDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}

@Controller('user')
@ApiTags('Usuarios')
export class UserController {
  constructor(
    private readonly _userUC: UserUC,
    private readonly _crudUserUC: CrudUserUC,
  ) {}

  @Get('paginated-partial')
  @UseGuards(AuthGuard())
  @GetPaginatedPartialDocs()
  async getPaginatedPartial(
    @Query() params: PaginatedUserSelectParamsDto,
  ): Promise<ResponsePaginationDto<PartialUserDto>> {
    return this._crudUserUC.paginatedPartialUser(params);
  }

  @Get('paginated-phone-code')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @PaginatedPhoneCodeSelectDocs()
  async paginatedPhoneCodeSelect(
    @Query() params: PaginatedCodePhoneUser,
  ): Promise<ResponsePaginationDto<PhoneCode>> {
    return await this._crudUserUC.paginatedPhoneCodeSelect(params);
  }

  @Get('paginated-list')
  @UseGuards(AuthGuard())
  @GetPaginatedListDocs()
  async getPaginatedList(
    @Query() params: PaginatedListUsersParamsDto,
  ): Promise<ResponsePaginationDto<User>> {
    return await this._crudUserUC.paginatedList(params);
  }

  @Post()
  @UseGuards(AuthGuard())
  @CreateUserDocs()
  async create(@Body() user: CreateUserDto): Promise<CreatedRecordResponseDto> {
    const rowId = await this._userUC.create(user);
    return {
      message: 'Usuario creado correctamente',
      statusCode: HttpStatus.CREATED,
      data: rowId,
    };
  }

  @Get('verify-email')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async verifyEmail(
    @Query() query: VerifyEmailQueryDto,
  ): Promise<{ message: string; statusCode: number }> {
    await this._userUC.verifyEmail(query.token, query.userId);
    return {
      message: 'Correo verificado correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @RegisterUserDocs()
  async register(
    @Body() user: CreateUserDto,
  ): Promise<CreatedRecordResponseDto> {
    const rowId = await this._userUC.register(user);
    return {
      message: '',
      statusCode: HttpStatus.CREATED,
      data: rowId,
    };
  }

  @Patch('recovery-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @RecoveryPasswordDocs()
  async recoveryPassword(
    @Body() body: RecoveryPasswordDto,
  ): Promise<UpdateRecordResponseDto> {
    await this._userUC.recoveryPassword(body);
    return {
      message: PASSWORD_CHANGED_MESSAGE,
      statusCode: HttpStatus.OK,
    };
  }

  @Post('change-password')
  @UseGuards(AuthGuard())
  @ChangePasswordDocs()
  async changePassword(
    @Body() body: ChangePasswordDto,
    @Req() req,
  ): Promise<UpdateRecordResponseDto> {
    await this._userUC.changePassword(body, req.user.id);
    return {
      message: PASSWORD_CHANGED_MESSAGE,
      statusCode: HttpStatus.OK,
    };
  }

  @Get(':id')
  @UseGuards(AuthGuard())
  @FindOneUserDocs()
  async findOne(@Param('id') id: string): Promise<GetUserResponseDto> {
    const user = await this._userUC.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      data: user,
    };
  }

  @Patch(':id')
  @UseGuards(AuthGuard())
  @UpdateUserDocs()
  async update(
    @Param('id') id: string,
    @Body() userData: UpdateUserDto,
  ): Promise<UpdateRecordResponseDto> {
    await this._userUC.update(id, userData);
    return {
      message: 'Información almacenada correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Patch(':id/avatar')
  @UseGuards(AuthGuard())
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UpdateRecordResponseDto> {
    await this._userUC.uploadAvatar(id, file);
    return {
      message: 'Foto de perfil actualizada correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':id/avatar')
  @UseGuards(AuthGuard())
  async deleteAvatar(
    @Param('id') id: string,
  ): Promise<UpdateRecordResponseDto> {
    await this._userUC.deleteAvatar(id);
    return {
      message: 'Foto de perfil eliminada correctamente',
      statusCode: HttpStatus.OK,
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard())
  @DeleteUserDocs()
  async delete(@Param('id') id: string): Promise<DeleteReCordResponseDto> {
    await this._userUC.delete(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Usuario eliminado exitosamente',
    };
  }
}
