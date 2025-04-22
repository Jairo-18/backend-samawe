import { User } from './../../../shared/entities/user.entity';
import { UserModel } from './../../models/user.model';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDto, CreateUserDto } from 'src/user/dtos/user.dto';
import { RoleRepository } from 'src/shared/repositories/role.repository';
import { IdentificationTypeRepository } from 'src/shared/repositories/identificationType.repository';
import { UserRepository } from 'src/shared/repositories/user.repository';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly identificationTypeRepository: IdentificationTypeRepository,
  ) {}

  async create(user: CreateUserDto): Promise<{ rowId: string }> {
    const userExist = await this.findByParams({
      id: user.id,
      email: user.email,
    });

    this.validatePasswordMatch(user.password, user.confirmPassword);

    if (userExist) {
      throw new HttpException('El usuario ya existe', HttpStatus.CONFLICT);
    }

    const role = await this.roleRepository.findOne({
      where: { roleId: user.role },
    });

    const identificationType = await this.identificationTypeRepository.findOne({
      where: { identificationTypeId: user.identificationType },
    });

    if (!role || !identificationType) {
      throw new HttpException(
        'Rol o tipo de identificación inválido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const res = await this.userRepository.insert({
      ...user,
      password: hashedPassword,
      role,
      identificationType,
    });

    return { rowId: res.identifiers[0].id };
  }

  async register(user: CreateUserDto): Promise<{ rowId: string }> {
    const salt = await bcrypt.genSalt();

    const userExist = await this.userRepository.findOne({
      where: [{ id: user.id }, { email: user.email }],
    });

    this.validatePasswordMatch(user.password, user.confirmPassword);

    // Asegúrate de que role e identificationType son objetos
    const role =
      typeof user.role === 'string'
        ? await this.roleRepository.findOne({ where: { roleId: user.role } })
        : user.role;

    const identificationType =
      typeof user.identificationType === 'string'
        ? await this.identificationTypeRepository.findOne({
            where: { identificationTypeId: user.identificationType },
          })
        : user.identificationType;

    if (!role || !identificationType) {
      throw new HttpException(
        'Rol o tipo de identificación inválido',
        HttpStatus.NOT_FOUND,
      );
    }

    const userConfirm = {
      ...user,
      password: await bcrypt.hash(user.password, salt),
      role,
      identificationType,
    };

    if (userExist) {
      throw new HttpException('El usuario ya existe', HttpStatus.CONFLICT);
    }

    const res = await this.userRepository.insert(userConfirm);
    return { rowId: res.identifiers[0].id };
  }

  async update(id: string, userData: Partial<UserModel>) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validación de email único
    if (userData.email && userData.email !== user.email) {
      const emailExists = await this.userRepository.findOne({
        where: { email: userData.email },
      });
      if (emailExists) {
        throw new BadRequestException(
          'El email ya está en uso por otro usuario',
        );
      }
    }

    // Resolver Role si se envía
    if (userData.role && typeof userData.role === 'string') {
      const roleEntity = await this.roleRepository.findOne({
        where: { roleId: userData.role },
      });
      if (!roleEntity) throw new NotFoundException('Rol no encontrado');
      userData.role = roleEntity;
    }

    // Resolver IdentificationType si se envía
    if (
      userData.identificationType &&
      typeof userData.identificationType === 'string'
    ) {
      const identificationTypeEntity =
        await this.identificationTypeRepository.findOne({
          where: { identificationTypeId: userData.identificationType },
        });
      if (!identificationTypeEntity) {
        throw new NotFoundException('Tipo de identificación no encontrado');
      }
      userData.identificationType = identificationTypeEntity;
    }

    // Aplicar los cambios al usuario
    Object.assign(user, userData);
    await this.userRepository.update(id, user);

    return { message: 'Usuario actualizado correctamente' };
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

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async findByParams(params: Record<string, any>): Promise<User> {
    return await this.userRepository.findOne({
      where: [params],
    });
  }

  async initData(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

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
