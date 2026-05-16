export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
}

export enum BillStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PurchaseStatus {
  DRAFT = 'DRAFT',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum StockMovementType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  RETURN = 'RETURN',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum CreditTransactionType {
  CREDIT = 'CREDIT',
  PAYMENT = 'PAYMENT',
}

export enum ReturnType {
  REFUND = 'REFUND',
  EXCHANGE = 'EXCHANGE',
}

export enum AdjustmentType {
  ADD = 'ADD',
  REMOVE = 'REMOVE',
}

export enum AdjustmentReason {
  DAMAGED = 'DAMAGED',
  THEFT = 'THEFT',
  COUNT_MISMATCH = 'COUNT_MISMATCH',
  OPENING_STOCK = 'OPENING_STOCK',
  OTHER = 'OTHER',
}
