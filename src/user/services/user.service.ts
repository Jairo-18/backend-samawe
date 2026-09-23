import { InvoiceRepository } from './../../shared/repositories/invoice.repository';
import { INVALID_ACCESS_DATA_MESSAGE } from './../../auth/constants/messages.constants';
import {
  NOT_FOUND_MESSAGE,
  PASSWORDS_NOT_MATCH,
} from './../../shared/constants/messages.constant';
import { RoleTypeRepository } from './../../shared/repositories/roleType.repository';
import { UpdateUserModel, UserFiltersModel } from './../models/user.model';
import { PhoneCodeRepository } from './../../shared/repositories/phoneCode.repository';
import {
  CreateUserDto,
  ChangePasswordDto,
  RecoveryPasswordDto,
} from './../dtos/user.dto';
import { IdentificationTypeRepository } from '../../shared/repositories/identificationType.repository';
import { MunicipalityRepository } from '../../shared/repositories/municipality.repository';
import { UserRepository } from '../../shared/repositories/user.repository';
import { User } from '../../shared/entities/user.entity';
import { PersonTypeRepository } from '../../shared/repositories/personType.repository';
import { OrganizationalRepository } from '../../shared/repositories/organizational.repository';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PasswordService } from './password.service';
import { Not } from 'typeorm';
import {
  mapUserDetail,
  UserDetailDto,
} from './../../shared/mappers/entity-mappers';
import { MailsService } from '../../shared/services/mails.service';
import { MailTemplateService } from '../../shared/services/mail-template.service';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from '../../local-storage/services/local-storage.service';
import {
  FACTUS_TRIBUTE_NO_APLICA,
  JURIDICA_REQUIRES_NIT_MESSAGE,
  defaultLegalOrganizationCode,
  isValidPersonTypeForDocument,
  normalizeLegalOrganizationCode,
  normalizeTributeCode,
  personTypeCodeFor,
} from '../../shared/constants/factusCustomer.constants';

@Injectable()
export class UserService {
  constructor(
    private readonly _userRepository: UserRepository,
    private readonly _roleTypeRepository: RoleTypeRepository,
    private readonly _identificationTypeRepository: IdentificationTypeRepository,
    private readonly _municipalityRepository: MunicipalityRepository,
    private readonly _phoneCodeRepository: PhoneCodeRepository,
    private readonly _passwordService: PasswordService,
    private readonly _invoiceRepository: InvoiceRepository,
    private readonly _personTypeRepository: PersonTypeRepository,
    private readonly _organizationalRepository: OrganizationalRepository,
    private readonly _mailsService: MailsService,
    private readonly _mailTemplateService: MailTemplateService,
    private readonly _configService: ConfigService,
    private readonly _localStorageService: LocalStorageService,
  ) {}

  async create(user: CreateUserDto, creatorRole: string): Promise<{ rowId: string }> {
    const RESTRICTED_ROLES = ['ADMIN', 'SUPERADMIN'];
    const PRIVILEGED_CREATORS = ['ADMIN', 'SUPERADMIN'];

    const targetRole = await this._roleTypeRepository.findOne({
      where: { roleTypeId: user.roleType },
    });

    if (
      targetRole &&
      RESTRICTED_ROLES.includes(targetRole.code) &&
      !PRIVILEGED_CREATORS.includes(creatorRole)
    ) {
      throw new HttpException(
        'No tienes permisos para crear usuarios con este rol',
        HttpStatus.FORBIDDEN,
      );
    }
    if (user.email) {
      const existingUserByEmail = await this._userRepository.findOne({
        where: { email: user.email },
      });

      if (existingUserByEmail) {
        throw new HttpException(
          'El correo electrónico ya está en uso',
          HttpStatus.CONFLICT,
        );
      }
    }

    const identificationType = await this._identificationTypeRepository.findOne({
      where: { identificationTypeId: user.identificationType },
    });
    // Desglosa el NIT (número + dv) antes de cualquier validación, para que el
    // chequeo de duplicados compare contra el número ya limpio que se persiste.
    const { identificationNumber, factusDv } = this.breakdownIdentification(
      identificationType?.factusCode,
      user.identificationNumber,
    );

    const existingUserByIdentification = await this._userRepository.findOne({
      where: {
        identificationType: { identificationTypeId: user.identificationType },
        identificationNumber,
      },
    });

    if (existingUserByIdentification) {
      throw new HttpException(
        'Ya existe un usuario registrado con este número de identificación',
        HttpStatus.CONFLICT,
      );
    }

    // Solo tiene sentido buscar duplicados si HAY número: el teléfono es
    // opcional (el `phoneCode` no, define la nacionalidad). Con
    // `phone: undefined` TypeORM descarta esa clave del WHERE y la consulta
    // quedaría "cualquier usuario con este prefijo de país", de modo que el
    // segundo cliente sin teléfono chocaría con el primero.
    const phoneNumber = user.phone?.trim();
    if (phoneNumber) {
      const existingPhoneUser = await this._userRepository.findOne({
        where: {
          phoneCode: { phoneCodeId: user.phoneCode },
          phone: phoneNumber,
        },
      });

      if (existingPhoneUser) {
        throw new HttpException(
          'Este número de teléfono ya está en uso',
          HttpStatus.CONFLICT,
        );
      }
    }

    this.validatePasswordMatch(user.password, user.confirmPassword);

    const roleType = await this._roleTypeRepository.findOne({
      where: { roleTypeId: user.roleType },
    });

    const phoneCode = await this._phoneCodeRepository.findOne({
      where: { phoneCodeId: user.phoneCode },
    });

    if (!roleType || !identificationType || !phoneCode) {
      throw new HttpException(
        'Rol, tipo de identificación o código telefónico inválido',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Los dos ejes Factus del cliente. Independientes entre sí: una persona
    // natural puede ser responsable de IVA y una jurídica puede no serlo.
    const factusLegalOrganizationCode = await this.resolveLegalOrganizationCode(
      user.identificationType,
      user.factusLegalOrganizationCode,
    );
    const factusTributeCode =
      normalizeTributeCode(user.factusTributeCode) ?? FACTUS_TRIBUTE_NO_APLICA;
    const personType = await this.resolvePersonType(
      factusLegalOrganizationCode,
    );

    const hashedPassword = await bcrypt.hash(user.password, 10);

    let organizational = null;
    if (user.organizationalId) {
      organizational = await this._organizationalRepository.findOne({
        where: { organizationalId: user.organizationalId },
      });
      if (!organizational) {
        throw new BadRequestException('La organización asignada no existe');
      }
    }

    // Ubicación DANE (solo clientes de Colombia). Deriva el municipio y, de él,
    // el factusMunicipalityCode que usa la factura electrónica.
    const location = await this.resolveLocation(
      user.departmentId,
      user.municipalityId,
    );

    const res = await this._userRepository.insert({
      ...user,
      identificationNumber,
      factusDv,
      factusLegalOrganizationCode,
      factusTributeCode,
      departmentId: location.departmentId,
      municipalityId: location.municipalityId,
      factusMunicipalityCode: location.factusMunicipalityCode,
      password: hashedPassword,
      roleType,
      identificationType,
      phoneCode,
      personType,
      isEmailVerified: true,
      ...(organizational && { organizational }),
    });

    return { rowId: res.identifiers[0].id };
  }

  async register(user: CreateUserDto): Promise<{ rowId: string }> {
    const salt = await bcrypt.genSalt();

    if (!user.email || user.email.trim() === '') {
      user.email = null;
    } else {
      user.email = user.email.toLowerCase();
    }

    if (user.email) {
      const existingUserByEmail = await this._userRepository.findOne({
        where: { email: user.email },
      });

      if (existingUserByEmail) {
        if (existingUserByEmail.isEmailVerified) {
          throw new HttpException(
            'El correo electrónico ya está en uso',
            HttpStatus.CONFLICT,
          );
        }

        const tokenExpired =
          !existingUserByEmail.emailVerificationTokenExpiry ||
          existingUserByEmail.emailVerificationTokenExpiry < new Date();

        if (!tokenExpired) {
          throw new HttpException(
            {
              message:
                'Ya tienes un registro pendiente. Revisa tu correo y verifica tu cuenta.',
              code: 'PENDING_VERIFICATION',
            },
            HttpStatus.CONFLICT,
          );
        }

        const newToken = await this.generateEmailVerificationToken(
          existingUserByEmail.userId,
        );
        const frontendUrl =
          this._configService.get<string>('APP_FRONTEND_URL') ||
          'https://ecohotesamawe.com';
        const org = await this._organizationalRepository.findOne({
          where: {},
          relations: ['medias', 'medias.mediaType'],
        });
        await this._mailsService.sendEmail({
          to: existingUserByEmail.email,
          subject: 'Verifica tu correo electrónico',
          body: this._mailTemplateService.verifyEmailTemplate(
            `${frontendUrl}/auth/verify-email?token=${newToken}&userId=${existingUserByEmail.userId}`,
            existingUserByEmail.firstName,
            existingUserByEmail.lastName,
            org,
          ),
        });
        throw new HttpException(
          {
            message:
              'Tu enlace de verificación había expirado. Te enviamos uno nuevo, revisa tu correo.',
            code: 'VERIFICATION_RESENT',
          },
          HttpStatus.CONFLICT,
        );
      }
    }

    const existingUserByIdentification = await this._userRepository.findOne({
      where: {
        identificationType: { identificationTypeId: user.identificationType },
        identificationNumber: user.identificationNumber,
      },
    });

    if (existingUserByIdentification) {
      throw new HttpException(
        'Ya existe un usuario registrado con este número de identificación',
        HttpStatus.CONFLICT,
      );
    }

    // Solo tiene sentido buscar duplicados si HAY número: el teléfono es
    // opcional (el `phoneCode` no, define la nacionalidad). Con
    // `phone: undefined` TypeORM descarta esa clave del WHERE y la consulta
    // quedaría "cualquier usuario con este prefijo de país", de modo que el
    // segundo cliente sin teléfono chocaría con el primero.
    const phoneNumber = user.phone?.trim();
    if (phoneNumber) {
      const existingPhoneUser = await this._userRepository.findOne({
        where: {
          phoneCode: { phoneCodeId: user.phoneCode },
          phone: phoneNumber,
        },
      });

      if (existingPhoneUser) {
        throw new HttpException(
          'Este número de teléfono ya está en uso',
          HttpStatus.CONFLICT,
        );
      }
    }

    this.validatePasswordMatch(user.password, user.confirmPassword);

    const roleType = await this._roleTypeRepository.findOne({
      where: { code: 'USER' },
    });

    const identificationType =
      typeof user.identificationType === 'string'
        ? await this._identificationTypeRepository.findOne({
            where: { identificationTypeId: user.identificationType },
          })
        : user.identificationType;

    const phoneCode = await this._phoneCodeRepository.findOne({
      where: { phoneCodeId: user.phoneCode },
    });

    if (!roleType || !identificationType || !phoneCode) {
      throw new HttpException(
        'Rol, tipo de identificación o código de teléfono inválido',
        HttpStatus.NOT_FOUND,
      );
    }

    // `identificationType` ya está resuelto aquí, así que el default sale de su
    // `factusCode` sin otra consulta. El registro público no ofrece el selector,
    // pero se respeta lo que llegue por si se usa el endpoint desde otro sitio.
    const factusLegalOrganizationCode =
      normalizeLegalOrganizationCode(user.factusLegalOrganizationCode) ??
      defaultLegalOrganizationCode(identificationType.factusCode);
    if (
      !isValidPersonTypeForDocument(
        factusLegalOrganizationCode,
        identificationType.factusCode,
      )
    ) {
      throw new BadRequestException(JURIDICA_REQUIRES_NIT_MESSAGE);
    }
    const factusTributeCode =
      normalizeTributeCode(user.factusTributeCode) ?? FACTUS_TRIBUTE_NO_APLICA;
    const personType = await this.resolvePersonType(
      factusLegalOrganizationCode,
    );

    const org = user.organizationalId
      ? await this._organizationalRepository.findOne({
          where: { organizationalId: user.organizationalId },
          relations: ['medias', 'medias.mediaType'],
        })
      : await this._organizationalRepository.findOne({
          where: {},
          relations: ['medias', 'medias.mediaType'],
        });

    if (user.organizationalId && !org) {
      throw new BadRequestException('La organización asignada no existe');
    }

    const userConfirm = {
      ...user,
      password: await bcrypt.hash(user.password, salt),
      roleType,
      identificationType,
      phoneCode,
      personType,
      factusLegalOrganizationCode,
      factusTributeCode,
      isActive: true,
      isEmailVerified: false,
      organizational: org,
    };

    await this._userRepository.insert(userConfirm);

    try {
      const token = await this.generateEmailVerificationToken(user.userId);
      const frontendUrl =
        this._configService.get<string>('APP_FRONTEND_URL') ||
        'https://ecohotesamawe.com';
      await this._mailsService.sendEmail({
        to: user.email,
        subject: 'Verifica tu correo electrónico',
        body: this._mailTemplateService.verifyEmailTemplate(
          `${frontendUrl}/auth/verify-email?token=${token}&userId=${user.userId}`,
          user.firstName,
          user.lastName,
          org,
        ),
      });
    } catch (error) {
      console.error('Error sending verification email:', error);
    }

    return { rowId: user.userId };
  }

  async update(userId: string, userData: UpdateUserModel) {
    const userExist = await this.findOne(userId);
    if (userData.email) {
      const emailExist = await this._userRepository.findOne({
        where: { userId: Not(userId), email: userData.email },
      });

      if (emailExist) {
        throw new HttpException(
          'Ya existe un usuario registrado con este correo electrónico',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (userData.identificationType || userData.identificationNumber) {
      const identificationNumberExist = await this._userRepository.findOne({
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
          'Ya existe un usuario registrado con ese tipo y número de identificación',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (userData.phoneCode || userData.phone) {
      const phoneExist = await this._userRepository.findOne({
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
          'Ya existe un usuario registrado con ese tipo y número de teléfono',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (!userExist) {
      throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
    }

    const {
      organizationalId,
      roleType,
      phoneCode,
      identificationType,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      personType,
      password,
      confirmPassword,
      departmentId,
      municipalityId,
      factusTributeCode,
      factusLegalOrganizationCode,
      ...restUserData
    } = userData;

    // Tipo de documento efectivo: el nuevo si vino, si no el que ya tenía.
    const effectiveIdentificationTypeId =
      identificationType || userExist.identificationType.identificationTypeId;

    // Organización legal efectiva. `factusLegalOrganizationCode` manda; si no
    // viene en el payload se conserva lo guardado, y solo si tampoco hay nada
    // se deduce del tipo de documento. Así, editar cualquier otro campo del
    // usuario no le cambia el tipo de persona por debajo.
    //
    // `resolveLegalOrganizationCode` recibe el candidato en vez de llamarse
    // solo como respaldo, porque es quien valida la regla "jurídica ⇒ NIT": si
    // se saltara, cambiar el documento a cédula dejando el tipo guardado en
    // jurídica pasaría sin que nadie lo mire.
    const effectiveLegalOrganizationCode =
      await this.resolveLegalOrganizationCode(
        effectiveIdentificationTypeId,
        normalizeLegalOrganizationCode(factusLegalOrganizationCode) ??
          normalizeLegalOrganizationCode(
            userExist.factusLegalOrganizationCode,
          ),
      );

    const effectiveTributeCode =
      normalizeTributeCode(factusTributeCode) ??
      normalizeTributeCode(userExist.factusTributeCode) ??
      FACTUS_TRIBUTE_NO_APLICA;

    // La ubicación solo se toca si vino en el payload (departamento o municipio).
    // Para extranjeros el front envía ambos en null → se limpia y el
    // factusMunicipalityCode vuelve a null (la factura usa el municipio del negocio).
    const locationProvided =
      departmentId !== undefined || municipalityId !== undefined;
    const location = locationProvided
      ? await this.resolveLocation(departmentId, municipalityId)
      : undefined;

    if (password) {
      if (password !== confirmPassword) {
        throw new HttpException(
          'Las contraseñas no coinciden',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : undefined;

    // Si llega un nuevo número de identificación, lo desglosamos según el tipo
    // de documento efectivo (el nuevo, o el que ya tenía el usuario).
    let identificationBreakdown:
      | { identificationNumber: string; factusDv: string | null }
      | undefined;
    if (userData.identificationNumber !== undefined) {
      const idType = await this._identificationTypeRepository.findOne({
        where: { identificationTypeId: effectiveIdentificationTypeId },
      });
      identificationBreakdown = this.breakdownIdentification(
        idType?.factusCode,
        userData.identificationNumber,
      );
    }

    return await this._userRepository.update(
      { userId },
      {
        ...restUserData,
        ...(identificationBreakdown && {
          identificationNumber: identificationBreakdown.identificationNumber,
          factusDv: identificationBreakdown.factusDv,
        }),
        ...(location && {
          departmentId: location.departmentId,
          municipalityId: location.municipalityId,
          factusMunicipalityCode: location.factusMunicipalityCode,
        }),
        ...(hashedPassword && { password: hashedPassword }),
        phoneCode: {
          phoneCodeId: phoneCode || userExist.phoneCode.phoneCodeId,
        },
        roleType: {
          roleTypeId: roleType || userExist.roleType.roleTypeId,
        },
        identificationType: {
          identificationTypeId: effectiveIdentificationTypeId,
        },
        // El tipo de persona se deriva de la organización legal, no del
        // documento: son la misma decisión expresada dos veces y tienen que
        // quedar coherentes en la misma escritura.
        factusLegalOrganizationCode: effectiveLegalOrganizationCode,
        factusTributeCode: effectiveTributeCode,
        personType: await this.resolvePersonType(
          effectiveLegalOrganizationCode,
        ),
        ...(organizationalId !== undefined && {
          organizational:
            organizationalId === null
              ? null
              : await this._organizationalRepository.findOne({
                  where: { organizationalId },
                }),
        }),
      },
    );
  }

  /**
   * Resuelve la ubicación DANE del cliente a partir de los ids enviados por el
   * front. Solo aplica a clientes de Colombia; para extranjeros llegan en null/
   * undefined y se devuelve todo en null (la factura usa el municipio del
   * negocio). Si hay municipio, deriva de él el departamento y el
   * `factusMunicipalityCode` (el código DANE que necesita la factura electrónica),
   * garantizando que municipio y departamento siempre queden coherentes.
   */
  private async resolveLocation(
    departmentId?: number | null,
    municipalityId?: number | null,
  ): Promise<{
    departmentId: number | null;
    municipalityId: number | null;
    factusMunicipalityCode: string | null;
  }> {
    if (municipalityId) {
      const municipality = await this._municipalityRepository.findOne({
        where: { municipalityId },
      });
      if (!municipality) {
        throw new BadRequestException('El municipio seleccionado no existe');
      }
      return {
        departmentId: municipality.departmentId,
        municipalityId: municipality.municipalityId,
        factusMunicipalityCode: municipality.code,
      };
    }
    // Sin municipio: puede haber departamento elegido (aún sin municipio) o nada.
    return {
      departmentId: departmentId ?? null,
      municipalityId: null,
      factusMunicipalityCode: null,
    };
  }

  /**
   * Organización legal efectiva del usuario (`legal_organization_code` de
   * Factus: '1' jurídica, '2' natural).
   *
   * El orden importa: manda lo que el formulario haya elegido y, solo si no
   * viene nada, se deduce del tipo de documento. Antes se deducía SIEMPRE, y
   * por eso una persona natural con NIT —un independiente inscrito en el RUT,
   * caso normal en el documento soporte— salía hacia la DIAN como empresa.
   */
  private async resolveLegalOrganizationCode(
    identificationTypeId: string,
    provided?: unknown,
  ): Promise<string> {
    const idType = await this._identificationTypeRepository.findOne({
      where: { identificationTypeId },
    });

    const explicit = normalizeLegalOrganizationCode(provided);
    const code = explicit ?? defaultLegalOrganizationCode(idType?.factusCode);

    // La única regla que la DIAN sí impone: una jurídica va con NIT. Se corta
    // aquí, al guardar, y no al emitir — un 422 en mitad de una factura es el
    // peor momento para enterarse.
    if (!isValidPersonTypeForDocument(code, idType?.factusCode)) {
      throw new BadRequestException(JURIDICA_REQUIRES_NIT_MESSAGE);
    }

    return code;
  }

  /**
   * `PersonType` que corresponde a una organización legal. Se busca por `code`
   * ('NAT'/'JUR') porque los `personTypeId` los asigna un SERIAL y difieren
   * entre bases; el id solo queda como respaldo por si un re-seed dejó el
   * `code` en null.
   */
  private async resolvePersonType(legalOrganizationCode: string) {
    const code = personTypeCodeFor(legalOrganizationCode);

    const byCode = await this._personTypeRepository.findOne({
      where: { code },
    });
    if (byCode) return byCode;

    const FALLBACK_ID_BY_CODE: Record<string, number> = { NAT: 1, JUR: 2 };
    return await this._personTypeRepository.findOne({
      where: { personTypeId: FALLBACK_ID_BY_CODE[code] },
    });
  }

  /**
   * Desglosa el número de identificación según el tipo de documento.
   * Para NIT (factusCode '31') el recepcionista puede escribir el NIT con o sin
   * guion/dígito de verificación (p. ej. "900123456-7" o "900123456"); aquí
   * dejamos en identificationNumber ÚNICAMENTE el número (sin dv ni guion) y
   * calculamos el dv con el algoritmo oficial de la DIAN, ignorando el dv que se
   * haya tecleado (así nunca se envía uno equivocado a Factus).
   * Para los demás documentos se devuelve el número sin espacios y sin dv.
   */
  private breakdownIdentification(
    factusCode: string | undefined | null,
    rawNumber: string,
  ): { identificationNumber: string; factusDv: string | null } {
    const cleaned = String(rawNumber ?? '').replace(/\s+/g, '');
    if (factusCode !== '31') {
      return { identificationNumber: cleaned, factusDv: null };
    }
    const numberPart = (
      cleaned.includes('-') ? cleaned.split('-')[0] : cleaned
    ).replace(/\D/g, '');
    return {
      identificationNumber: numberPart,
      factusDv: this.computeNitDv(numberPart),
    };
  }

  /** Dígito de verificación de un NIT según el algoritmo oficial de la DIAN. */
  private computeNitDv(nit: string): string {
    const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
    const digits = nit.replace(/\D/g, '');
    const reversed = digits.split('').reverse();
    let sum = 0;
    for (let i = 0; i < reversed.length && i < weights.length; i++) {
      sum += parseInt(reversed[i], 10) * weights[i];
    }
    const mod = sum % 11;
    const dv = mod > 1 ? 11 - mod : mod;
    return String(dv);
  }

  private validatePasswordMatch(password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new HttpException(
        'Las contraseñas no coinciden',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findOne(userId: string): Promise<UserDetailDto> {
    const user = await this._userRepository.findOne({
      where: { userId },
      relations: [
        'roleType',
        'identificationType',
        'phoneCode',
        'personType',
        'organizational',
        'department',
        'municipality',
      ],
    });

    if (!user) {
      throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
    }

    return mapUserDetail(user);
  }

  async findByParams(params: Record<string, any>): Promise<User> {
    return await this._userRepository.findOne({
      where: [params],
      relations: ['roleType', 'organizational'],
    });
  }

  async initData(userId: string) {
    const user = await this._userRepository.findOne({
      where: { userId: userId },
    });

    if (!user) {
      throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async changePassword(body: ChangePasswordDto, id: string) {
    const user = await this._userRepository.findOne({
      where: { userId: id },
    });
    if (!user) {
      throw new HttpException(NOT_FOUND_MESSAGE, HttpStatus.NOT_FOUND);
    }

    if (body.newPassword !== body.confirmNewPassword) {
      throw new HttpException(PASSWORDS_NOT_MATCH, HttpStatus.CONFLICT);
    }
    const passwordMatch = await this._passwordService.compare(
      body.oldPassword,
      user.password,
    );

    if (!passwordMatch) {
      throw new HttpException(
        'Contraseña incorrecta.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this._userRepository.update(
      { userId: id },
      { password: await this._passwordService.generateHash(body.newPassword) },
    );
  }

  async delete(id: string): Promise<void> {
    const user = await this.findOne(id);

    const existsInInvoices = await this._invoiceRepository.exist({
      where: [{ user: { userId: id } }, { employee: { userId: id } }],
    });

    if (existsInInvoices) {
      const fullName = `${user.firstName} ${user.lastName}`;
      throw new BadRequestException(
        `El usuario ${fullName} está asociado a una factura y no puede eliminarse.`,
      );
    }

    await this._userRepository.delete(id);
  }

  async findOneByParams(
    params: UserFiltersModel,
    login: boolean = false,
    errors: boolean = true,
  ): Promise<User> {
    const user = await this._userRepository.findOne({
      where: { ...params.where },
      ...(params.relations?.length && { relations: params.relations }),
    });
    if (!user && errors) {
      if (!login) {
        throw new HttpException(NOT_FOUND_MESSAGE, HttpStatus.NOT_FOUND);
      } else {
        throw new UnauthorizedException(INVALID_ACCESS_DATA_MESSAGE);
      }
    }
    return user;
  }

  async generateEmailVerificationToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 30);

    await this._userRepository.update(userId, {
      emailVerificationToken: token,
      emailVerificationTokenExpiry: expiry,
    });

    return token;
  }

  async verifyEmail(token: string, userId: string): Promise<void> {
    const user = await this._userRepository.findOne({
      where: { userId, emailVerificationToken: token },
    });

    if (!user) {
      throw new HttpException('Token inválido', HttpStatus.BAD_REQUEST);
    }

    if (user.emailVerificationTokenExpiry < new Date()) {
      throw new HttpException(
        'El enlace de verificación ha expirado',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this._userRepository.update(
      { userId },
      {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      },
    );
  }

  /**
   * Devuelve un token de recuperación válido, **reutilizando el vigente** si lo
   * hay.
   *
   * El token vive en una sola columna del usuario, así que generar uno nuevo
   * invalida el anterior. Cuando esto generaba siempre uno nuevo, dos
   * solicitudes seguidas —doble clic, dos pestañas, o pedirlo otra vez porque
   * el correo tardó— dejaban muertos todos los enlaces menos el último: quien
   * abría el primer correo que le llegó leía "el enlace ha expirado o ya fue
   * utilizado" sin haberlo usado nunca.
   *
   * Reutilizar es además lo correcto de cara al usuario: los dos correos
   * llevan el mismo enlace y cualquiera de ellos funciona.
   *
   * El margen evita el caso tonto de entregar un enlace que caduca en segundos:
   * si al vigente le queda menos que eso, se emite uno nuevo con los 30 minutos
   * completos.
   */
  async generateResetToken(userId: string): Promise<string> {
    const MIN_REMAINING_MS = 5 * 60 * 1000;

    const current = await this._userRepository.findOne({
      where: { userId },
      select: ['userId', 'resetToken', 'resetTokenExpiry'],
    });

    if (
      current?.resetToken &&
      current.resetTokenExpiry &&
      current.resetTokenExpiry.getTime() - Date.now() > MIN_REMAINING_MS
    ) {
      return current.resetToken;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 30);

    await this._userRepository.update(userId, {
      resetToken: token,
      resetTokenExpiry: expiryDate,
    });

    return token;
  }

  async recoveryPassword(body: RecoveryPasswordDto) {
    const user = await this._userRepository.findOne({
      where: { userId: body.userId, resetToken: body.resetToken },
    });
    if (!user) {
      throw new HttpException(
        'El enlace ha expirado o ya fue utilizado',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (user.resetTokenExpiry < new Date()) {
      throw new HttpException(
        'El enlace ha expirado o ya fue utilizado',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (body.newPassword !== body.confirmNewPassword) {
      throw new HttpException(PASSWORDS_NOT_MATCH, HttpStatus.CONFLICT);
    }
    await this._userRepository.update(
      { userId: body.userId },
      {
        password: await this._passwordService.generateHash(body.newPassword),
        resetToken: null,
        resetTokenExpiry: null,
      },
    );
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<void> {
    const user = await this._userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
    }

    if (user.avatarUrl) {
      const uploadsIndex = user.avatarUrl.indexOf('/uploads/');
      if (uploadsIndex !== -1) {
        const oldPublicId = user.avatarUrl.substring(
          uploadsIndex + '/uploads/'.length,
        );
        await this._localStorageService.deleteImage(oldPublicId);
      }
    }

    const { imageUrl } = await this._localStorageService.saveImage(
      file,
      'users',
    );
    await this._userRepository.update({ userId }, { avatarUrl: imageUrl });
  }

  async deleteAvatar(userId: string): Promise<void> {
    const user = await this._userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new HttpException('El usuario no existe', HttpStatus.NOT_FOUND);
    }

    if (user.avatarUrl) {
      const uploadsIndex = user.avatarUrl.indexOf('/uploads/');
      if (uploadsIndex !== -1) {
        const publicId = user.avatarUrl.substring(
          uploadsIndex + '/uploads/'.length,
        );
        await this._localStorageService.deleteImage(publicId);
      }
    }

    await this._userRepository.update({ userId }, { avatarUrl: null });
  }

  async findByRoles(roleNames: string[]): Promise<User[]> {
    return this._userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roleType', 'roleType')
      .where('roleType.name IN (:...roleNames)', { roleNames })
      .getMany();
  }

  async findOrCreateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  }): Promise<User> {
    let user = await this._userRepository.findOne({
      where: { googleId: googleUser.googleId },
      relations: ['roleType', 'organizational'],
    });

    if (!user && googleUser.email) {
      user = await this._userRepository.findOne({
        where: { email: googleUser.email },
        relations: ['roleType', 'organizational'],
      });

      if (user) {
        await this._userRepository.update(
          { userId: user.userId },
          {
            googleId: googleUser.googleId,
            avatarUrl: googleUser.avatarUrl || user.avatarUrl,
            isEmailVerified: true,
            emailVerificationToken: null,
            emailVerificationTokenExpiry: null,
          },
        );
        user.googleId = googleUser.googleId;
        user.avatarUrl = googleUser.avatarUrl || user.avatarUrl;
        user.isEmailVerified = true;
        return user;
      }
    }

    if (user) {
      if (googleUser.avatarUrl && !user.avatarUrl) {
        await this._userRepository.update(
          { userId: user.userId },
          { avatarUrl: googleUser.avatarUrl },
        );
        user.avatarUrl = googleUser.avatarUrl;
      }
      return user;
    }

    const clienteRoleType = await this._roleTypeRepository.findOne({
      where: { roleTypeId: '4a96be8d-308f-434f-9846-54e5db3e7d95' },
    });

    const identificationType = await this._identificationTypeRepository.findOne(
      { where: {} },
    );

    const phoneCode = await this._phoneCodeRepository.findOne({
      where: {},
    });

    const personType = await this._personTypeRepository.findOne({
      where: { personTypeId: 1 },
    });

    const randomPassword = await bcrypt.hash(
      crypto.randomBytes(32).toString('hex'),
      10,
    );

    const newUser = this._userRepository.create({
      googleId: googleUser.googleId,
      email: googleUser.email,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
      avatarUrl: googleUser.avatarUrl,
      password: randomPassword,
      identificationNumber: `GOOGLE-${googleUser.googleId.substring(0, 10)}`,
      phone: '0000000000',
      roleType: clienteRoleType,
      identificationType,
      phoneCode,
      personType,
      isActive: true,
      isEmailVerified: true,
    });

    const savedUser = await this._userRepository.save(newUser);

    return await this._userRepository.findOne({
      where: { userId: savedUser.userId },
      relations: ['roleType', 'organizational'],
    });
  }
}
