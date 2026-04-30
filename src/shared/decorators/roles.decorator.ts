import { SetMetadata } from '@nestjs/common';
import { RolesUser } from '../roles/RolesUser.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RolesUser[]) => SetMetadata(ROLES_KEY, roles);
