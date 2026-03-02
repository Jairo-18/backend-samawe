export interface OrderUpdate {
  notificationId?: string;
  invoiceId: number;
  code: string;
  state: string;
  stateCode: string;
  tableNumber?: string;
  updatedAt: Date | string;
  orderTime?: Date | string;
  readyTime?: Date | string;
  servedTime?: Date | string;
}
