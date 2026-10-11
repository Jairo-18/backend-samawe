import { Organizational } from '../../shared/entities/organizational.entity';

/**
 * Lo que la web pública puede ver de una organización.
 *
 * Es una LISTA BLANCA a propósito: el endpoint público devolvía la entidad
 * entera, y con ella `googleBusinessRefreshToken` (con él se opera el perfil de
 * Google Business del hotel), la configuración de Factus y el id del
 * representante legal. Un campo nuevo en `Organizational` NO sale aquí hasta que
 * alguien lo añada a mano — que es justo lo que se quiere.
 *
 * `legalName`, `identificationNumber` e `identificationType` sí van: el PDF de
 * cada factura los imprime (`invoicePrint.service.ts`) y el NIT de una empresa
 * es un dato público.
 */
export function toPublicOrganizational(org: Organizational) {
  return {
    organizationalId: org.organizationalId,
    name: org.name,
    legalName: org.legalName,
    slug: org.slug,
    identificationNumber: org.identificationNumber,
    identificationType: org.identificationType
      ? {
          identificationTypeId: org.identificationType.identificationTypeId,
          code: org.identificationType.code,
          name: org.identificationType.name,
        }
      : null,
    email: org.email,
    phone: org.phone,
    phoneCode: org.phoneCode
      ? {
          phoneCodeId: org.phoneCode.phoneCodeId,
          code: org.phoneCode.code,
          name: org.phoneCode.name,
        }
      : null,
    website: org.website,
    address: org.address,
    city: org.city,
    department: org.department,
    timezone: org.timezone,
    languageDefault: org.languageDefault,
    description: org.description,

    fontTitle: org.fontTitle,
    fontBody: org.fontBody,
    primaryColor: org.primaryColor,
    secondaryColor: org.secondaryColor,
    tertiaryColor: org.tertiaryColor,
    textColor: org.textColor,
    titleColor: org.titleColor,
    subtitleColor: org.subtitleColor,
    bgPrimaryColor: org.bgPrimaryColor,
    bgSecondaryColor: org.bgSecondaryColor,
    darkTitleColor: org.darkTitleColor,
    darkSubtitleColor: org.darkSubtitleColor,
    darkTextColor: org.darkTextColor,
    darkBgPrimaryColor: org.darkBgPrimaryColor,
    darkBgSecondaryColor: org.darkBgSecondaryColor,

    homeTitle: org.homeTitle,
    homeDescription: org.homeDescription,
    experienceTitle: org.experienceTitle,
    experienceDescription: org.experienceDescription,
    reservationTitle: org.reservationTitle,
    reservationDescription: org.reservationDescription,
    aboutUsTitle: org.aboutUsTitle,
    aboutUsDescription: org.aboutUsDescription,
    missionTitle: org.missionTitle,
    missionDescription: org.missionDescription,
    visionTitle: org.visionTitle,
    visionDescription: org.visionDescription,
    historyTitle: org.historyTitle,
    historyDescription: org.historyDescription,
    gastronomyTitle: org.gastronomyTitle,
    gastronomyDescription: org.gastronomyDescription,
    gastronomyHistoryTitle: org.gastronomyHistoryTitle,
    gastronomyHistoryDescription: org.gastronomyHistoryDescription,
    gastronomyKitchenTitle: org.gastronomyKitchenTitle,
    gastronomyKitchenDescription: org.gastronomyKitchenDescription,
    gastronomyIngredientsTitle: org.gastronomyIngredientsTitle,
    gastronomyIngredientsDescription: org.gastronomyIngredientsDescription,
    accommodationsTitle: org.accommodationsTitle,
    accommodationsDescription: org.accommodationsDescription,
    howToArriveDescription: org.howToArriveDescription,
    howToArrivePublicTransportDescription:
      org.howToArrivePublicTransportDescription,
    howToArrivePrivateTransportDescription:
      org.howToArrivePrivateTransportDescription,
    accessibilityDescription: org.accessibilityDescription,

    mapsUrl: org.mapsUrl,
    videoUrl: org.videoUrl,
    facebookUrl: org.facebookUrl,
    instagramUrl: org.instagramUrl,
    metaTitle: org.metaTitle,
    metaDescription: org.metaDescription,

    medias: (org.medias ?? []).map((m) => ({
      organizationalMediaId: m.organizationalMediaId,
      url: m.url,
      label: m.label,
      priority: m.priority,
      isActive: m.isActive,
      mediaType: m.mediaType
        ? {
            mediaTypeId: m.mediaType.mediaTypeId,
            code: m.mediaType.code,
            name: m.mediaType.name,
          }
        : null,
    })),
  };
}

export type PublicOrganizational = ReturnType<typeof toPublicOrganizational>;
