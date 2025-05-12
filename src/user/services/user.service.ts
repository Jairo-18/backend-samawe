import { RoleTypeRepository } from './../../shared/repositories/roleType.repository';
import { UpdateUserModel } from './../models/user.model';
import { PhoneCodeRepository } from './../../shared/repositories/phoneCode.repository';
import { CreateUserDto, ChangePasswordDto } from '../dtos/user.dto';
import { IdentificationTypeRepository } from '../../shared/repositories/identificationType.repository';
import { UserRepository } from '../../shared/repositories/user.repository';
import { User } from '../../shared/entities/user.entity';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Not } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private readonly roleRepository: RoleTypeRepository,
    private readonly identificationTypeRepository: IdentificationTypeRepository,
    private readonly phoneCodeRepository: PhoneCodeRepository,
  ) {}

  async create(user: CreateUserDto): Promise<{ rowId: string }> {
    // Validación por email
    const existingUserByEmail = await this.userRepository.findOne({
      where: { email: user.email },
    });

    if (existingUserByEmail) {
      throw new HttpException('El email ya está en uso', HttpStatus.CONFLICT);
    }

    // Validación por tipo + número de identificación
    const existingUserByIdentification = await this.userRepository.findOne({
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
    const existingPhoneUser = await this.userRepository.findOne({
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

    const roleType = await this.roleRepository.findOne({
      where: { roleTypeId: user.roleType },
    });

    const identificationType = await this.identificationTypeRepository.findOne({
      where: { identificationTypeId: user.identificationType },
    });

    const phoneCode = await this.phoneCodeRepository.findOne({
      where: { phoneCodeId: user.phoneCode },
    });

    if (!roleType || !identificationType || !phoneCode) {
      throw new HttpException(
        'Rol, tipo de identificación o código telefónico inválido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const res = await this.userRepository.insert({
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
    const existingUserByEmail = await this.userRepository.findOne({
      where: { email: user.email },
    });

    if (existingUserByEmail) {
      throw new HttpException('El email ya está en uso', HttpStatus.CONFLICT);
    }

    // Validación por tipo + número de identificación
    const existingUserByIdentification = await this.userRepository.findOne({
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
    const existingPhoneUser = await this.userRepository.findOne({
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
        ? await this.roleRepository.findOne({
            where: { roleTypeId: user.roleType },
          })
        : await this.roleRepository.findOne({
            where: { roleTypeId: '4a96be8d-308f-434f-9846-54e5db3e7d95' },
          });

    const identificationType =
      typeof user.identificationType === 'string'
        ? await this.identificationTypeRepository.findOne({
            where: { identificationTypeId: user.identificationType },
          })
        : user.identificationType;

    const phoneCode = await this.phoneCodeRepository.findOne({
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

    const res = await this.userRepository.insert(userConfirm);
    return { rowId: res.identifiers[0].id };
  }

  async update(userId: string, userData: UpdateUserModel) {
    const userExist = await this.findOne(userId);
    if (userData.email) {
      const emailExist = await this.userRepository.findOne({
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
      const identificationNumberExist = await this.userRepository.findOne({
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
      const phoneExist = await this.userRepository.findOne({
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

    return await this.userRepository.update(
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
    return await this.userRepository.find();
  }

  async findOne(userId: string): Promise<Partial<User>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...user } = await this.userRepository.findOne({
      where: { userId },
      relations: ['roleType', 'identificationType', 'phoneCode'],
    });

    if (!user) {
      throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async findByParams(params: Record<string, any>): Promise<User> {
    return await this.userRepository.findOne({
      where: [params],
      relations: ['roleType'],
    });
  }

  async initData(userId: string) {
    const user = await this.userRepository.findOne({
      where: { userId: userId },
    });

    if (!user) {
      throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async changePassword(userId: string, body: ChangePasswordDto) {
    const { currentPassword, newPassword } = body;

    const user = await this.findByParams({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la anterior',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(userId, { password: hashedPassword });

    return { message: 'Contraseña actualizada correctamente' };
  }

  async delete(id: string) {
    await this.findOne(id);
    return await this.userRepository.delete(id);
  }
}
