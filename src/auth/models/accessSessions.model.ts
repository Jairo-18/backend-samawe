export interface AccessSessionsModel {
  userId: string;
  accessToken: string;
  id: string;
  organizationalId?: string;
}

export interface AccessSessionsFiltersModel {
  id?: string;
  userId?: string;
  accessToken?: string;
  organizationalId?: string;
}
