export interface AccessSessionsModel {
  userId: string;
  accessToken: string;
  id: string;
}

export interface AccessSessionsFiltersModel {
  id?: string;
  userId?: string;
  accessToken?: string;
}
