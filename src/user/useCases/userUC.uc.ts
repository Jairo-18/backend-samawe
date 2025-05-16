import { UserService } from '../services/user.service';
import {
  ChangePasswordDto,
  CreateUserDto,
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

  async changePassword(userId: string, body: ChangePasswordDto) {
    return await this._userService.changePassword(userId, body);
  }

  async delete(id: string) {
    return await this._userService.delete(id);
  }
}
