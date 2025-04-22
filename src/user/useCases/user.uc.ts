import {
  ChangePasswordDto,
  CreateUserDto,
  UpdateUserDto,
} from '../dtos/user.dto';

import { UserService } from './../services/user/user.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserUC {
  constructor(private readonly userService: UserService) {}

  async create(user: CreateUserDto) {
    return await this.userService.create(user);
  }

  async register(user: CreateUserDto) {
    return await this.userService.register(user);
  }

  async findAll() {
    return await this.userService.findAll();
  }

  async findOne(id: string) {
    return await this.userService.findOne(id);
  }

  async initData(userId: string) {
    return await this.userService.initData(userId);
  }

  async update(id: string, userData: UpdateUserDto) {
    return await this.userService.update(id, userData);
  }

  async changePassword(userId: string, body: ChangePasswordDto) {
    return await this.userService.changePassword(userId, body);
  }

  async delete(id: string) {
    return await this.userService.delete(id);
  }
}
