export const LEGAL_TYPE = {
  TERMS: 'terms',
  PRIVACY: 'privacy',
} as const;

export type LegalType = (typeof LEGAL_TYPE)[keyof typeof LEGAL_TYPE];
