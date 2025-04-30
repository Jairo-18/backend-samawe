import { RolesUser } from './../../../shared/roles/RolesUser.enum';
import { RoleRepository } from './../../../shared/repositories/role.repository';
import { UserRepository } from './../../../shared/repositories/user.repository';
import { RefreshTokenBodyDto, SignOutBodyDto } from './../../dtos/auth.dto';
import {
  TokenPayloadModel,
  UserAuthModel,
} from '../../models/authentication.model';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../../user/services/user.service';
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
  ) {}

  async signIn(credentials: Partial<UserAuthModel>) {
    // Buscar el usuario por el email
    const user = await this.usersService.findByParams({
      email: credentials.email,
    });

    // Si el usuario no existe, lanzamos una excepción
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Comparamos las contraseñas
    const passwordMatch = await bcrypt.compare(
      credentials.password,
      user.password,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Si el usuario no tiene un rol asignado, le asignamos el rol por defecto
    if (
      !user.roleType ||
      !Object.values(RolesUser).includes(user.roleType?.name as RolesUser)
    ) {
      const defaultRoleType = await this.roleRepository.findOne({
        where: { name: RolesUser.USER },
      });

      if (!defaultRoleType) {
        throw new NotFoundException(
          'El rol por defecto no existe en la base de datos',
        );
      }

      // Asignar el rol por defecto
      user.roleType = defaultRoleType;

      // Guardar el usuario con el rol actualizado
      await this.userRepository.save(user);
    }

    // Crear el payload con el email del usuario
    const payload = { email: user.email, sub: user.userId, id: user.userId };

    // Generamos los tokens de acceso y refresco
    const tokens = this.generateTokens(payload);

    // Retornamos los tokens y el usuario con el rol
    return {
      tokens: { ...tokens },
      user: {
        id: user.userId,
        role: {
          roleId: user.roleType.roleTypeId,
          name: user.roleType.name,
        },
      },
    };
  }

  // Función para validar la sesión (usada en el refresh token)
  async validateSession({ userId, token }: { userId: string; token: string }) {
    const user = await this.usersService.findOne(userId); // Buscamos el usuario por ID
    let payload;

    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
    } catch (_e) {
      throw new UnauthorizedException('No autorizado');
    }

    if (!user) {
      throw new UnauthorizedException('No autorizado');
    }

    return user;
  }

  // Función para generar los tokens (acceso y refresco)
  generateTokens(payload: TokenPayloadModel): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('jwt.expiresIn'),
      secret: this.configService.get<string>('jwt.secret'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('jwt.refreshTokenExpiresIn'),
      secret: this.configService.get<string>('jwt.secret'),
    });

    return { accessToken, refreshToken };
  }

  // Función para refrescar el token
  async refreshToken(body: RefreshTokenBodyDto) {
    let payload;

    try {
      payload = this.jwtService.verify(body.refreshToken, {
        secret: this.configService.get<string>('jwt.secret'),
      });
    } catch (_e) {
      throw new UnauthorizedException('No autorizado');
    }

    const user = await this.validateSession({
      userId: payload.sub,
      token: body.refreshToken,
    });

    if (!user) {
      throw new UnauthorizedException('No autorizado');
    }

    const tokens = this.generateTokens({
      email: user.email,
      id: user.userId,
      sub: user.userId,
    });

    return {
      tokens: { ...tokens },
      user: {
        id: user.userId,
        role: {
          roleId: user.roleType.roleTypeId, // Suponiendo que `Role` tiene una propiedad `id`
          name: user.roleType.name, // Y `Role` tiene una propiedad `name`
        },
      },
    };
  }

  // Función para cerrar sesión (sign out)
  async signOut(body: SignOutBodyDto) {
    return; // No es necesario hacer nada para el logout en este caso
  }
}
