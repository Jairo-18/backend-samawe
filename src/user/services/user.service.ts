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
} from './../dtos/user.dto';
import { IdentificationTypeRepository } from '../../shared/repositories/identificationType.repository';
import { UserRepository } from '../../shared/repositories/user.repository';
import { User } from '../../shared/entities/user.entity';
import { PersonTypeRepository } from '../../shared/repositories/personType.repository';
import { OrganizationalRepository } from '../../shared/repositories/organizational.repository';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PasswordService } from './password.service';
import { Not } from 'typeorm';
import {
  mapUserDetail,
  UserDetailDto,
} from './../../shared/mappers/entity-mappers';

@Injectable()
export class UserService {
  constructor(
    private readonly _userRepository: UserRepository,
    private readonly _roleTypeRepository: RoleTypeRepository,
    private readonly _identificationTypeRepository: IdentificationTypeRepository,
    private readonly _phoneCodeRepository: PhoneCodeRepository,
    private readonly _passwordService: PasswordService,
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _personTypeRepository: PersonTypeRepository,
    private readonly _organizationalRepository: OrganizationalRepository,
  ) {}

  async create(user: CreateUserDto): Promise<{ rowId: string }> {
    if (user.email) {
      const existingUserByEmail = await this._userRepository.findOne({
        where: { email: user.email },
      });

      if (existingUserByEmail) {
        throw new HttpException('El email ya está en uso', HttpStatus.CONFLICT);
      }
    }

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

    const personType = await this.resolvePersonType(user.identificationType);

    const hashedPassword = await bcrypt.hash(user.password, 10);

    let organizational = null;
    if (user.organizationalId) {
      organizational = await this._organizationalRepository.findOne({
        where: { organizationalId: user.organizationalId },
      });
      if (!organizational) {
        throw new BadRequestException('La organización asignada no existe');
      }
    }

    const res = await this._userRepository.insert({
      ...user,
      password: hashedPassword,
      roleType,
      identificationType,
      phoneCode,
      personType,
      ...(organizational && { organizational }),
    });

    return { rowId: res.identifiers[0].id };
  }

  async register(user: CreateUserDto): Promise<{ rowId: string }> {
    const salt = await bcrypt.genSalt();

    if (!user.email || user.email.trim() === '') {
      user.email = null;
    } else {
      user.email = user.email.toLowerCase();
    }

    if (user.email) {
      const existingUserByEmail = await this._userRepository.findOne({
        where: { email: user.email },
      });

      if (existingUserByEmail) {
        throw new HttpException('El email ya está en uso', HttpStatus.CONFLICT);
      }
    }

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

    const personType = await this.resolvePersonType(
      typeof user.identificationType === 'string'
        ? user.identificationType
        : (identificationType as any)?.identificationTypeId,
    );

    let organizational = null;
    if (user.organizationalId) {
      organizational = await this._organizationalRepository.findOne({
        where: { organizationalId: user.organizationalId },
      });
      if (!organizational) {
        throw new BadRequestException('La organización asignada no existe');
      }
    }

    const userConfirm = {
      ...user,
      password: await bcrypt.hash(user.password, salt),
      roleType,
      identificationType,
      phoneCode,
      personType,
      ...(organizational && { organizational }),
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

    const {
      organizationalId,
      roleType,
      phoneCode,
      identificationType,
      personType,
      password,
      confirmPassword,
      ...restUserData
    } = userData;

    if (password) {
      if (password !== confirmPassword) {
        throw new HttpException(
          'Las contraseñas no coinciden',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : undefined;

    return await this._userRepository.update(
      { userId },
      {
        ...restUserData,
        ...(hashedPassword && { password: hashedPassword }),
        phoneCode: {
          phoneCodeId: phoneCode || userExist.phoneCode.phoneCodeId,
        },
        roleType: {
          roleTypeId: roleType || userExist.roleType.roleTypeId,
        },
        identificationType: {
          identificationTypeId:
            identificationType ||
            userExist.identificationType.identificationTypeId,
        },
        personType: await this.resolvePersonType(
          identificationType ||
            userExist.identificationType.identificationTypeId,
        ),
        ...(organizationalId !== undefined && {
          organizational:
            organizationalId === null
              ? null
              : await this._organizationalRepository.findOne({
                  where: { organizationalId },
                }),
        }),
      },
    );
  }

  private async resolvePersonType(identificationTypeId: string) {
    const NIT_ID = '3';
    const PERSONA_JURIDICA_ID = 2;
    const PERSONA_NATURAL_ID = 1;

    const personTypeId =
      identificationTypeId?.toString() === NIT_ID
        ? PERSONA_JURIDICA_ID
        : PERSONA_NATURAL_ID;

    return await this._personTypeRepository.findOne({
      where: { personTypeId },
    });
  }

  private validatePasswordMatch(password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new HttpException(
        'Las contraseñas no coinciden',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findOne(userId: string): Promise<UserDetailDto> {
    const user = await this._userRepository.findOne({
      where: { userId },
      relations: [
        'roleType',
        'identificationType',
        'phoneCode',
        'personType',
        'organizational',
      ],
    });

    if (!user) {
      throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
    }

    return mapUserDetail(user);
  }

  async findByParams(params: Record<string, any>): Promise<User> {
    return await this._userRepository.findOne({
      where: [params],
      relations: ['roleType', 'organizational'],
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
      where: [{ user: { userId: id } }, { employee: { userId: id } }],
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
    expiryDate.setMinutes(expiryDate.getMinutes() + 30);

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

  async findOrCreateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  }): Promise<User> {
    let user = await this._userRepository.findOne({
      where: { googleId: googleUser.googleId },
      relations: ['roleType', 'organizational'],
    });

    if (!user && googleUser.email) {
      user = await this._userRepository.findOne({
        where: { email: googleUser.email },
        relations: ['roleType', 'organizational'],
      });

      if (user) {
        await this._userRepository.update(
          { userId: user.userId },
          {
            googleId: googleUser.googleId,
            avatarUrl: googleUser.avatarUrl || user.avatarUrl,
          },
        );
        user.googleId = googleUser.googleId;
        user.avatarUrl = googleUser.avatarUrl || user.avatarUrl;
        return user;
      }
    }

    if (user) {
      if (googleUser.avatarUrl && user.avatarUrl !== googleUser.avatarUrl) {
        await this._userRepository.update(
          { userId: user.userId },
          { avatarUrl: googleUser.avatarUrl },
        );
        user.avatarUrl = googleUser.avatarUrl;
      }
      return user;
    }

    const clienteRoleType = await this._roleTypeRepository.findOne({
      where: { roleTypeId: '4a96be8d-308f-434f-9846-54e5db3e7d95' },
    });

    const identificationType = await this._identificationTypeRepository.findOne(
      { where: {} },
    );

    const phoneCode = await this._phoneCodeRepository.findOne({
      where: {},
    });

    const personType = await this._personTypeRepository.findOne({
      where: { personTypeId: 1 },
    });

    const randomPassword = await bcrypt.hash(
      crypto.randomBytes(32).toString('hex'),
      10,
    );

    const newUser = this._userRepository.create({
      googleId: googleUser.googleId,
      email: googleUser.email,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
      avatarUrl: googleUser.avatarUrl,
      password: randomPassword,
      identificationNumber: `GOOGLE-${googleUser.googleId.substring(0, 10)}`,
      phone: '0000000000',
      roleType: clienteRoleType,
      identificationType,
      phoneCode,
      personType,
      isActive: true,
    });

    const savedUser = await this._userRepository.save(newUser);

    return await this._userRepository.findOne({
      where: { userId: savedUser.userId },
      relations: ['roleType', 'organizational'],
    });
  }
}
