export interface StateTypeClean {
  stateTypeId: number;
  name?: Record<string, string>;
  code?: string;
}

export interface CategoryTypeClean {
  categoryTypeId: number;
  name?: Record<string, string>;
  code?: string;
}

export interface BedTypeClean {
  bedTypeId: number;
  name?: Record<string, string>;
  code?: string;
}

export interface TaxeTypeClean {
  taxeTypeId: number;
  name?: Record<string, string>;
  percentage?: number;
}
