import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PasswordService {
  generateHash(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, 10);
  }

  compare(plainPassword: string, hashPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashPassword);
  }
}
