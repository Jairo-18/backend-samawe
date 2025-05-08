import { RoleType } from './../../shared/entities/roleType.entity';
import { PhoneCode } from './../../shared/entities/phoneCode.entity';
import { PhoneCodeRepository } from './../../shared/repositories/phoneCode.repository';
import { UpdateUserDto } from './../dtos/user.dto';
import { IdentificationType } from './../models/user.model';
import { CreateUserDto, ChangePasswordDto } from '../dtos/user.dto';
import { IdentificationTypeRepository } from '../../shared/repositories/identificationType.repository';
import { RoleRepository } from '../../shared/repositories/role.repository';
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
import { hash } from 'bcrypt';
@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
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

  async update(userId: string, userData: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Encriptar contraseña si se envía
    if (userData.password) {
      userData.password = await hash(userData.password, 10); // Encriptar la contraseña con bcrypt
    }

    // Validación de email único
    if (userData.email && userData.email !== user.email) {
      const emailExists = await this.userRepository.findOne({
        where: { email: userData.email },
      });
      if (emailExists) {
        throw new BadRequestException('El email ya está en uso');
      }
    }

    // Resolver Role si se envía
    let roleEntity: RoleType | undefined;
    if (userData.roleType && typeof userData.roleType === 'object') {
      roleEntity = await this.roleRepository.findOne({
        where: { roleTypeId: userData.roleType },
      });
      if (!roleEntity) {
        throw new NotFoundException('Rol no encontrado');
      }
    }

    // Resolver PhoneCode si se envía
    let phoneCodeEntity: PhoneCode | undefined;
    if (userData.phoneCode) {
      phoneCodeEntity = await this.phoneCodeRepository.findOne({
        where: { phoneCodeId: userData.phoneCode },
      });
      if (!phoneCodeEntity) {
        throw new NotFoundException('Código telefónico no encontrado');
      }
    }

    // Resolver IdentificationType si se envía
    let identificationTypeEntity: IdentificationType | undefined;
    if (
      userData.identificationType &&
      typeof userData.identificationType === 'object'
    ) {
      identificationTypeEntity =
        await this.identificationTypeRepository.findOne({
          where: { identificationTypeId: userData.identificationType },
        });
      if (!identificationTypeEntity) {
        throw new NotFoundException('Tipo de identificación no encontrado');
      }
    }

    // Validar número de identificación único si se envía
    if (userData.identificationNumber && identificationTypeEntity) {
      // Log de depuración
      console.log('identificationNumber:', userData.identificationNumber);
      console.log(
        'identificationTypeId:',
        identificationTypeEntity?.identificationTypeId,
      );

      // Usamos QueryBuilder para mayor flexibilidad en la consulta
      const existingIdentification = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.identificationType', 'identificationType')
        .where('user.identificationNumber = :identificationNumber', {
          identificationNumber: userData.identificationNumber,
        })
        .andWhere(
          'identificationType.identificationTypeId = :identificationTypeId',
          {
            identificationTypeId: identificationTypeEntity.identificationTypeId,
          },
        )
        .andWhere('user.userId != :userId', { userId }) // Asegurarnos de que no sea el mismo usuario
        .getOne();

      if (existingIdentification) {
        console.log(
          'Ya existe un usuario con este número de identificación y tipo.',
        );
        throw new BadRequestException(
          'Ya existe un usuario con este número de identificación y tipo.',
        );
      }
    }

    // Validación de número de teléfono único (por código)
    if (userData.phone && phoneCodeEntity) {
      const existingPhone = await this.userRepository.findOne({
        where: {
          phone: userData.phone,
          phoneCode: { phoneCodeId: phoneCodeEntity.phoneCodeId },
          userId: Not(userId), // Asegurarnos de que no sea el mismo usuario
        },
        relations: ['phoneCode'],
      });

      if (existingPhone) {
        throw new BadRequestException(
          'Ya existe un usuario con este número de teléfono y código.',
        );
      }
    }

    // Actualizar propiedades
    const updatedUser = this.userRepository.merge(user, {
      ...userData,
      phoneCode: phoneCodeEntity ?? user.phoneCode,
      roleType: roleEntity ?? user.roleType,
      identificationType: identificationTypeEntity ?? user.identificationType,
    });

    return await this.userRepository.save(updatedUser);
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

  async findOne(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
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
