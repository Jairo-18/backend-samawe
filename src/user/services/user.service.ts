import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { INVALID_ACCESS_DATA_MESSAGE } from './../../auth/constants/messages.constants';
import {
  NOT_FOUND_MESSAGE,
  PASSWORDS_NOT_MATCH,
} from './../../shared/constants/messages.constant';
import { RoleTypeRepository } from './../../shared/repositories/roleType.repository';
import { UpdateUserModel, UserFiltersModel } from './../models/user.model';
import { PhoneCodeRepository } from './../../shared/repositories/phoneCode.repository';
import {
  CreateUserDto,
  ChangePasswordDto,
  RecoveryPasswordDto,
} from '../dtos/user.dto';
import { IdentificationTypeRepository } from '../../shared/repositories/identificationType.repository';
import { UserRepository } from '../../shared/repositories/user.repository';
import { User } from '../../shared/entities/user.entity';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PasswordService } from './password.service';
import { Not } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    private readonly _userRepository: UserRepository,
    private readonly _roleTypeRepository: RoleTypeRepository,
    private readonly _identificationTypeRepository: IdentificationTypeRepository,
    private readonly _phoneCodeRepository: PhoneCodeRepository,
    private readonly _passwordService: PasswordService,
    private readonly _invoiceRepository: InvoiceRepository,
  ) {}

  async create(user: CreateUserDto): Promise<{ rowId: string }> {
    // Validación por email
    const existingUserByEmail = await this._userRepository.findOne({
      where: { email: user.email },
    });

    if (existingUserByEmail) {
      throw new HttpException('El email ya está en uso', HttpStatus.CONFLICT);
    }

    // Validación por tipo + número de identificación
    const existingUserByIdentification = await this._userRepository.findOne({
      where: {
        identificationType: { identificationTypeId: user.identificationType },
        identificationNumber: user.identificationNumber,
      },
    });

    if (existingUserByIdentification) {
      throw new HttpException(
        'El usuario ya existe con esta identificación',
        HttpStatus.CONFLICT,
      );
    }

    // Validación por código de teléfono + número
    const existingPhoneUser = await this._userRepository.findOne({
      where: {
        phoneCode: { phoneCodeId: user.phoneCode },
        phone: user.phone,
      },
    });

    if (existingPhoneUser) {
      throw new HttpException(
        'Este número ya está en uso',
        HttpStatus.CONFLICT,
      );
    }

    this.validatePasswordMatch(user.password, user.confirmPassword);

    const roleType = await this._roleTypeRepository.findOne({
      where: { roleTypeId: user.roleType },
    });

    const identificationType = await this._identificationTypeRepository.findOne(
      {
        where: { identificationTypeId: user.identificationType },
      },
    );

    const phoneCode = await this._phoneCodeRepository.findOne({
      where: { phoneCodeId: user.phoneCode },
    });

    if (!roleType || !identificationType || !phoneCode) {
      throw new HttpException(
        'Rol, tipo de identificación o código telefónico inválido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const res = await this._userRepository.insert({
      ...user,
      password: hashedPassword,
      roleType,
      identificationType,
      phoneCode,
    });

    return { rowId: res.identifiers[0].id };
  }

  async register(user: CreateUserDto): Promise<{ rowId: string }> {
    const salt = await bcrypt.genSalt();

    // Validación por email
    const existingUserByEmail = await this._userRepository.findOne({
      where: { email: user.email },
    });

    if (existingUserByEmail) {
      throw new HttpException('El email ya está en uso', HttpStatus.CONFLICT);
    }

    // Validación por tipo + número de identificación
    const existingUserByIdentification = await this._userRepository.findOne({
      where: {
        identificationType: { identificationTypeId: user.identificationType },
        identificationNumber: user.identificationNumber,
      },
    });

    if (existingUserByIdentification) {
      throw new HttpException(
        'El usuario ya existe con esta identificación',
        HttpStatus.CONFLICT,
      );
    }

    // Validación por código de teléfono + número
    const existingPhoneUser = await this._userRepository.findOne({
      where: {
        phoneCode: { phoneCodeId: user.phoneCode },
        phone: user.phone,
      },
    });

    if (existingPhoneUser) {
      throw new HttpException(
        'Este número ya está en uso',
        HttpStatus.CONFLICT,
      );
    }

    this.validatePasswordMatch(user.password, user.confirmPassword);

    const roleType =
      user.roleType && user.roleType.trim() !== ''
        ? await this._roleTypeRepository.findOne({
            where: { roleTypeId: user.roleType },
          })
        : await this._roleTypeRepository.findOne({
            where: { roleTypeId: '4a96be8d-308f-434f-9846-54e5db3e7d95' },
          });

    const identificationType =
      typeof user.identificationType === 'string'
        ? await this._identificationTypeRepository.findOne({
            where: { identificationTypeId: user.identificationType },
          })
        : user.identificationType;

    const phoneCode = await this._phoneCodeRepository.findOne({
      where: { phoneCodeId: user.phoneCode },
    });

    if (!roleType || !identificationType || !phoneCode) {
      throw new HttpException(
        'Rol, tipo de identificación o código de teléfono inválido',
        HttpStatus.NOT_FOUND,
      );
    }

    const userConfirm = {
      ...user,
      password: await bcrypt.hash(user.password, salt),
      roleType,
      identificationType,
      phoneCode,
    };

    const res = await this._userRepository.insert(userConfirm);
    return { rowId: res.identifiers[0].id };
  }

  async update(userId: string, userData: UpdateUserModel) {
    const userExist = await this.findOne(userId);
    if (userData.email) {
      const emailExist = await this._userRepository.findOne({
        where: { userId: Not(userId), email: userData.email },
      });

      if (emailExist) {
        throw new HttpException(
          'Ya existe un usuario con este correo',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (userData.identificationType || userData.identificationNumber) {
      const identificationNumberExist = await this._userRepository.findOne({
        where: {
          userId: Not(userId),
          identificationNumber: userData.identificationNumber,
          identificationType: {
            identificationTypeId: userData.identificationType,
          },
        },
      });
      if (identificationNumberExist) {
        throw new HttpException(
          'Ya existe un usuario con ese tipo y número de identificación',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (userData.phoneCode || userData.phone) {
      const phoneExist = await this._userRepository.findOne({
        where: {
          userId: Not(userId),
          phone: userData.phone,
          phoneCode: {
            phoneCodeId: userData.phoneCode,
          },
        },
      });
      if (phoneExist) {
        throw new HttpException(
          'Ya existe un usuario con ese tipo y número de teléfono',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (!userExist) {
      throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
    }

    return await this._userRepository.update(
      { userId },
      {
        ...userData,
        phoneCode: {
          phoneCodeId: userData.phoneCode || userExist.phoneCode.phoneCodeId,
        },
        roleType: {
          roleTypeId: userData.roleType || userExist.roleType.roleTypeId,
        },
        identificationType: {
          identificationTypeId:
            userData.identificationType ||
            userExist.identificationType.identificationTypeId,
        },
      },
    );
  }

  private validatePasswordMatch(password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new HttpException(
        'Las contraseñas no coinciden',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findAll(): Promise<User[]> {
    return await this._userRepository.find();
  }

  async findOne(userId: string): Promise<Omit<User, 'password'>> {
    const { password, ...user } = await this._userRepository.findOne({
      where: { userId },
      relations: ['roleType', 'identificationType', 'phoneCode'],
    });

    if (!user) {
      throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async findByParams(params: Record<string, any>): Promise<User> {
    return await this._userRepository.findOne({
      where: [params],
      relations: ['roleType'],
    });
  }

  async initData(userId: string) {
    const user = await this._userRepository.findOne({
      where: { userId: userId },
    });

    if (!user) {
      throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async changePassword(body: ChangePasswordDto, id: string) {
    const user = await this._userRepository.findOne({
      where: { userId: id },
    });
    if (!user) {
      throw new HttpException(NOT_FOUND_MESSAGE, HttpStatus.NOT_FOUND);
    }

    if (body.newPassword !== body.confirmNewPassword) {
      throw new HttpException(PASSWORDS_NOT_MATCH, HttpStatus.CONFLICT);
    }
    const passwordMatch = await this._passwordService.compare(
      body.oldPassword,
      user.password,
    );

    if (!passwordMatch) {
      throw new HttpException(
        'Contraseña incorrecta.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this._userRepository.update(
      { userId: id },
      { password: await this._passwordService.generateHash(body.newPassword) },
    );
  }

  async delete(id: string): Promise<void> {
    const user = await this.findOne(id);

    const existsInInvoices = await this._invoiceRepository.exist({
      where: [
        { user: { userId: id } }, // como cliente
        { employee: { userId: id } }, // como empleado
      ],
    });

    if (existsInInvoices) {
      const fullName = `${user.firstName} ${user.lastName}`;
      throw new BadRequestException(
        `El usuario ${fullName} está asociado a una factura y no puede eliminarse.`,
      );
    }

    await this._userRepository.delete(id);
  }

  async findOneByParams(
    params: UserFiltersModel,
    login: boolean = false,
    errors: boolean = true,
  ): Promise<User> {
    const user = await this._userRepository.findOne({
      where: { ...params.where },
    });
    if (!user && errors) {
      if (!login) {
        throw new HttpException(NOT_FOUND_MESSAGE, HttpStatus.NOT_FOUND);
      } else {
        throw new UnauthorizedException(INVALID_ACCESS_DATA_MESSAGE);
      }
    }
    return user;
  }

  async generateResetToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 1);

    await this._userRepository.update(userId, {
      resetToken: token,
      resetTokenExpiry: expiryDate,
    });

    return token;
  }

  async recoveryPassword(body: RecoveryPasswordDto) {
    try {
      const user = await this._userRepository.findOne({
        where: { userId: body.userId, resetToken: body.resetToken },
      });
      if (!user) {
        throw new HttpException(NOT_FOUND_MESSAGE, HttpStatus.NOT_FOUND);
      }
      if (user.resetTokenExpiry < new Date()) {
        throw new HttpException(
          'Token inválido o expirado',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (body.newPassword !== body.confirmNewPassword) {
        throw new HttpException(PASSWORDS_NOT_MATCH, HttpStatus.CONFLICT);
      }
      await this._userRepository.update(
        { userId: body.userId },
        {
          password: await this._passwordService.generateHash(body.newPassword),
          resetToken: null,
          resetTokenExpiry: null,
        },
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async findByRoles(roleNames: string[]): Promise<User[]> {
    return this._userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roleType', 'roleType')
      .where('roleType.name IN (:...roleNames)', { roleNames })
      .getMany();
  }
}
