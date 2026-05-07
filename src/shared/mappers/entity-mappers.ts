import { Product } from '../entities/product.entity';
import { Accommodation } from '../entities/accommodation.entity';
import { Excursion } from '../entities/excursion.entity';
import { User } from '../entities/user.entity';

export interface TypeCleanDto {
  id: number | string;
  code: string;
  name: Record<string, string>;
}

export interface ProductDetailDto {
  productId: number;
  code: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  amount: number;
  priceBuy: number;
  priceSale: number;
  isActive: boolean;
  categoryType: { categoryTypeId: number; code: string; name: Record<string, string> } | null;
  unitOfMeasure: { unitOfMeasureId: number; code: string; name: Record<string, string> } | null;
  taxeType: { taxeTypeId: number; percentage: number; name: Record<string, string> } | null;
  images: { productImageId: number; imageUrl: string; publicId: string }[];
  organizationalId: string | null;
}

export function mapProductDetail(product: Product): ProductDetailDto {
  return {
    productId: product.productId,
    code: product.code,
    name: product.name,
    description: product.description,
    amount: product.amount,
    priceBuy: product.priceBuy,
    priceSale: product.priceSale,
    isActive: product.isActive,
    categoryType: product.categoryType
      ? {
          categoryTypeId: product.categoryType.categoryTypeId,
          code: product.categoryType.code,
          name: product.categoryType.name,
        }
      : null,
    unitOfMeasure: product.unitOfMeasure
      ? {
          unitOfMeasureId: product.unitOfMeasure.unitOfMeasureId,
          code: product.unitOfMeasure.code,
          name: product.unitOfMeasure.name,
        }
      : null,
    taxeType: product.taxeType
      ? {
          taxeTypeId: product.taxeType.taxeTypeId,
          percentage: product.taxeType.percentage,
          name: product.taxeType.name,
        }
      : null,
    images:
      product.images?.map((img) => ({
        productImageId: img.productImageId,
        imageUrl: img.imageUrl,
        publicId: img.publicId,
      })) ?? [],
    organizationalId: product.organizational?.organizationalId ?? null,
  };
}

export interface AccommodationDetailDto {
  accommodationId: number;
  code: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  amountPerson: number;
  amountRoom: number;
  amountBathroom: number;
  jacuzzi: boolean;
  priceBuy: number;
  priceSale: number;
  categoryType: { categoryTypeId: number; code: string; name: Record<string, string> } | null;
  bedType: { bedTypeId: number; code: string; name: Record<string, string> } | null;
  stateType: { stateTypeId: number; code: string; name: Record<string, string> } | null;
  taxeType: { taxeTypeId: number; percentage: number; name: Record<string, string> } | null;
  images: {
    accommodationImageId: number;
    imageUrl: string;
    publicId: string;
  }[];
  organizationalId: string | null;
}

export function mapAccommodationDetail(
  accommodation: Accommodation,
): AccommodationDetailDto {
  return {
    accommodationId: accommodation.accommodationId,
    code: accommodation.code,
    name: accommodation.name,
    description: accommodation.description,
    amountPerson: accommodation.amountPerson,
    amountRoom: accommodation.amountRoom,
    amountBathroom: accommodation.amountBathroom,
    jacuzzi: accommodation.jacuzzi,
    priceBuy: accommodation.priceBuy,
    priceSale: accommodation.priceSale,
    categoryType: accommodation.categoryType
      ? {
          categoryTypeId: accommodation.categoryType.categoryTypeId,
          code: accommodation.categoryType.code,
          name: accommodation.categoryType.name,
        }
      : null,
    bedType: accommodation.bedType
      ? {
          bedTypeId: accommodation.bedType.bedTypeId,
          code: accommodation.bedType.code,
          name: accommodation.bedType.name,
        }
      : null,
    stateType: accommodation.stateType
      ? {
          stateTypeId: accommodation.stateType.stateTypeId,
          code: accommodation.stateType.code,
          name: accommodation.stateType.name,
        }
      : null,
    taxeType: accommodation.taxeType
      ? {
          taxeTypeId: accommodation.taxeType.taxeTypeId,
          percentage: accommodation.taxeType.percentage,
          name: accommodation.taxeType.name,
        }
      : null,
    images:
      accommodation.images?.map((img) => ({
        accommodationImageId: img.accommodationImageId,
        imageUrl: img.imageUrl,
        publicId: img.publicId,
      })) ?? [],
    organizationalId: accommodation.organizational?.organizationalId ?? null,
  };
}

export interface MostRequestedAccommodationDto {
  accommodationId: number;
  code: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  amountPerson: number;
  amountRoom: number;
  amountBathroom: number;
  jacuzzi: boolean;
  priceSale: number;
  categoryType: { categoryTypeId: number; code: string; name: Record<string, string> } | null;
  bedType: { bedTypeId: number; code: string; name: Record<string, string> } | null;
  stateType: { stateTypeId: number; code: string; name: Record<string, string> } | null;
  images: {
    accommodationImageId: number;
    imageUrl: string;
    publicId: string;
  }[];
  organizationalId: string | null;
}

export function mapMostRequestedAccommodation(
  accommodation: Accommodation,
): MostRequestedAccommodationDto {
  return {
    accommodationId: accommodation.accommodationId,
    code: accommodation.code,
    name: accommodation.name,
    description: accommodation.description,
    amountPerson: accommodation.amountPerson,
    amountRoom: accommodation.amountRoom,
    amountBathroom: accommodation.amountBathroom,
    jacuzzi: accommodation.jacuzzi,
    priceSale: accommodation.priceSale,
    categoryType: accommodation.categoryType
      ? {
          categoryTypeId: accommodation.categoryType.categoryTypeId,
          code: accommodation.categoryType.code,
          name: accommodation.categoryType.name,
        }
      : null,
    bedType: accommodation.bedType
      ? {
          bedTypeId: accommodation.bedType.bedTypeId,
          code: accommodation.bedType.code,
          name: accommodation.bedType.name,
        }
      : null,
    stateType: accommodation.stateType
      ? {
          stateTypeId: accommodation.stateType.stateTypeId,
          code: accommodation.stateType.code,
          name: accommodation.stateType.name,
        }
      : null,
    images:
      accommodation.images?.map((img) => ({
        accommodationImageId: img.accommodationImageId,
        imageUrl: img.imageUrl,
        publicId: img.publicId,
      })) ?? [],
    organizationalId: accommodation.organizational?.organizationalId ?? null,
  };
}

export interface ExcursionDetailDto {
  excursionId: number;
  code: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  priceBuy: number;
  priceSale: number;
  categoryType: { categoryTypeId: number; code: string; name: Record<string, string> } | null;
  stateType: { stateTypeId: number; code: string; name: Record<string, string> } | null;
  taxeType: { taxeTypeId: number; percentage: number; name: Record<string, string> } | null;
  images: { excursionImageId: number; imageUrl: string; publicId: string }[];
  organizationalId: string | null;
}

export function mapExcursionDetail(excursion: Excursion): ExcursionDetailDto {
  return {
    excursionId: excursion.excursionId,
    code: excursion.code,
    name: excursion.name,
    description: excursion.description,
    priceBuy: excursion.priceBuy,
    priceSale: excursion.priceSale,
    categoryType: excursion.categoryType
      ? {
          categoryTypeId: excursion.categoryType.categoryTypeId,
          code: excursion.categoryType.code,
          name: excursion.categoryType.name,
        }
      : null,
    stateType: excursion.stateType
      ? {
          stateTypeId: excursion.stateType.stateTypeId,
          code: excursion.stateType.code,
          name: excursion.stateType.name,
        }
      : null,
    taxeType: excursion.taxeType
      ? {
          taxeTypeId: excursion.taxeType.taxeTypeId,
          percentage: excursion.taxeType.percentage,
          name: excursion.taxeType.name,
        }
      : null,
    images:
      excursion.images?.map((img) => ({
        excursionImageId: img.excursionImageId,
        imageUrl: img.imageUrl,
        publicId: img.publicId,
      })) ?? [],
    organizationalId: excursion.organizational?.organizationalId ?? null,
  };
}

export interface UserDetailDto {
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  identificationNumber: string;
  isActive: boolean;
  avatarUrl?: string;
  roleType: { roleTypeId: string; code: string; name: Record<string, string> } | null;
  identificationType: {
    identificationTypeId: string;
    code: string;
    name: Record<string, string>;
  } | null;
  phoneCode: { phoneCodeId: string; code: string; name: string } | null;
  personType: { personTypeId: number; code: string; name: Record<string, string> } | null;
  organizationalId: string | null;
}

export function mapUserDetail(user: User): UserDetailDto {
  return {
    userId: user.userId,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    identificationNumber: user.identificationNumber,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl ?? undefined,
    roleType: user.roleType
      ? {
          roleTypeId: user.roleType.roleTypeId,
          code: user.roleType.code,
          name: user.roleType.name,
        }
      : null,
    identificationType: user.identificationType
      ? {
          identificationTypeId: user.identificationType.identificationTypeId,
          code: user.identificationType.code,
          name: user.identificationType.name,
        }
      : null,
    phoneCode: user.phoneCode
      ? {
          phoneCodeId: user.phoneCode.phoneCodeId,
          code: user.phoneCode.code,
          name: user.phoneCode.name,
        }
      : null,
    personType: user.personType
      ? {
          personTypeId: user.personType.personTypeId,
          code: user.personType.code,
          name: user.personType.name,
        }
      : null,
    organizationalId: user.organizational?.organizationalId ?? null,
  };
}
