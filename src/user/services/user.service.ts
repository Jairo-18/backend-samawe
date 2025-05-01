import { UpdateUserDto } from './../dtos/user.dto';
import { Role, IdentificationType } from './../models/user.model';
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

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly identificationTypeRepository: IdentificationTypeRepository,
  ) {}

  async create(user: CreateUserDto): Promise<{ rowId: string }> {
    const userExist = await this.findByParams({
      id: user.userId,
      email: user.email,
    });

    this.validatePasswordMatch(user.password, user.confirmPassword);

    if (userExist) {
      throw new HttpException('El usuario ya existe', HttpStatus.CONFLICT);
    }

    const roleType = await this.roleRepository.findOne({
      where: { roleTypeId: user.roleType },
    });

    const identificationType = await this.identificationTypeRepository.findOne({
      where: { identificationTypeId: user.identificationType },
    });

    if (!roleType || !identificationType) {
      throw new HttpException(
        'Rol o tipo de identificación inválido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const res = await this.userRepository.insert({
      ...user,
      password: hashedPassword,
      roleType,
      identificationType,
    });

    return { rowId: res.identifiers[0].id };
  }

  async register(user: CreateUserDto): Promise<{ rowId: string }> {
    const salt = await bcrypt.genSalt();

    const userExist = await this.userRepository.findOne({
      where: [{ userId: user.userId }, { email: user.email }],
    });

    if (userExist) {
      throw new HttpException('El usuario ya existe', HttpStatus.CONFLICT);
    }

    this.validatePasswordMatch(user.password, user.confirmPassword);

    // Buscar el rol asignado o usar el rol por defecto
    const roleType =
      user.roleType && user.roleType.trim() !== ''
        ? await this.roleRepository.findOne({
            where: { roleTypeId: user.roleType },
          })
        : await this.roleRepository.findOne({
            where: { roleTypeId: '4a96be8d-308f-434f-9846-54e5db3e7d95' },
          }); // ID por defecto

    // Buscar tipo de identificación
    const identificationType =
      typeof user.identificationType === 'string'
        ? await this.identificationTypeRepository.findOne({
            where: { identificationTypeId: user.identificationType },
          })
        : user.identificationType;

    if (!roleType || !identificationType) {
      throw new HttpException(
        'Rol o tipo de identificación inválido',
        HttpStatus.NOT_FOUND,
      );
    }

    const userConfirm = {
      ...user,
      password: await bcrypt.hash(user.password, salt),
      roleType,
      identificationType,
    };

    const res = await this.userRepository.insert(userConfirm);
    return { rowId: res.identifiers[0].id };
  }

  async update(userId: string, userData: UpdateUserDto) {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
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
    let roleEntity: Role | undefined;
    if (userData.RoleType && typeof userData.RoleType === 'object') {
      roleEntity = await this.roleRepository.findOne({
        where: { roleTypeId: userData.RoleType },
      });
      if (!roleEntity) {
        throw new NotFoundException('Rol no encontrado');
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

    // Actualizar propiedades
    const updatedUser = this.userRepository.merge(user, {
      ...userData,
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
    const user = await this.userRepository.findOne({ where: { userId } });
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
