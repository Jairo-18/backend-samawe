import { UserService } from '../services/user.service';
import {
  ChangePasswordDto,
  CreateUserDto,
  RecoveryPasswordDto,
  UpdateUserDto,
} from '../dtos/user.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserUC {
  constructor(private readonly _userService: UserService) {}

  async create(user: CreateUserDto) {
    return await this._userService.create(user);
  }

  async register(user: CreateUserDto) {
    return await this._userService.register(user);
  }

  async findAll() {
    return await this._userService.findAll();
  }

  async findOne(id: string) {
    return await this._userService.findOne(id);
  }

  async initData(userId: string) {
    return await this._userService.initData(userId);
  }

  async update(id: string, userData: UpdateUserDto) {
    return await this._userService.update(id, userData);
  }

  async changePassword(body: ChangePasswordDto, id: string) {
    return await this._userService.changePassword(body, id);
  }

  async recoveryPassword(body: RecoveryPasswordDto) {
    return await this._userService.recoveryPassword(body);
  }

  async delete(id: string) {
    return await this._userService.delete(id);
  }
}
