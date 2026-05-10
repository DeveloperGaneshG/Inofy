export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER';
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI';
export type BillStatus = 'PENDING' | 'PAID' | 'CANCELLED';
export type PurchaseStatus = 'DRAFT' | 'RECEIVED' | 'CANCELLED';
export type StockMovementType = 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT';
export type ReturnType = 'REFUND' | 'EXCHANGE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  mrp?: number;
  price: number;
  costPrice: number;
  gstRate: number;
  stock: number;
  lowStockAlert: number;
  unitType: string;
  allowDecimalQty: boolean;
  categoryId: string;
  category: Category;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  createdAt: string;
}

export interface BillItem {
  id: string;
  billId: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReturnItem {
  id: string;
  returnId: string;
  billItemId: string;
  productId: string;
  product: Pick<Product, 'id' | 'name' | 'sku'>;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Return {
  id: string;
  returnNumber: string;
  billId: string;
  userId: string;
  user: Pick<User, 'id' | 'name'>;
  type: ReturnType;
  reason?: string;
  refundAmount: number;
  createdAt: string;
  items: ReturnItem[];
}

export interface Bill {
  id: string;
  billNumber: string;
  customerId?: string;
  customer?: Customer;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'email'>;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: BillStatus;
  createdAt: string;
  items: BillItem[];
  returns?: Return[];
}

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedData<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number; // percentage 0–100
  totalPrice: number; // quantity * unitPrice * (1 - discount/100)
}

export interface DailySalesReport {
  date: string;
  totalSales: number;
  totalOrders: number;
  totalItems: number;
}

export interface MonthlySalesReport {
  month: number;
  year: number;
  totalRevenue: number;
  totalOrders: number;
  dailyBreakdown: { date: string; revenue: number; orders: number }[];
}

export interface TopProduct {
  product: Product;
  totalQuantitySold: number;
  totalRevenue: number;
  totalOrders: number;
}

export interface RevenueReport {
  from: string;
  to: string;
  totalRevenue: number;
  totalTax: number;
  totalDiscount: number;
  totalSubtotal: number;
  totalOrders: number;
  dailyRevenue: { date: string; revenue: number }[];
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  isActive: boolean;
  createdAt: string;
  _count?: { purchases: number };
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  product: Product;
  quantity: number;
  costPrice: number;
  totalCost: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplier: Supplier;
  userId: string;
  user: Pick<User, 'id' | 'name'>;
  status: PurchaseStatus;
  notes?: string;
  totalAmount: number;
  receivedAt?: string;
  createdAt: string;
  items: PurchaseItem[];
  _count?: { items: number };
}

export interface StockMovement {
  id: string;
  productId: string;
  product: Pick<Product, 'id' | 'name' | 'sku'>;
  type: StockMovementType;
  quantity: number;
  referenceId?: string;
  referenceType?: string;
  note?: string;
  userId?: string;
  createdAt: string;
}

export type CreditTransactionType = 'CREDIT' | 'PAYMENT';

export interface CreditTransaction {
  id: string;
  customerId: string;
  type: CreditTransactionType;
  amount: number;
  description?: string;
  note?: string;
  runningBalance?: number;
  createdAt: string;
}

export interface CreditCustomer extends Customer {
  creditBalance: number;
  lastActivity: string | null;
}

export interface CreditCustomerDetail extends Customer {
  creditBalance: number;
  creditTransactions: CreditTransaction[];
}

export interface CreditSummary {
  totalOutstanding: number;
  debtorCount: number;
  clearedCount: number;
}

export interface InventoryReport {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
  products: Product[];
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
}

export type AdjustmentType = 'ADD' | 'REMOVE';
export type AdjustmentReason = 'DAMAGED' | 'THEFT' | 'COUNT_MISMATCH' | 'OPENING_STOCK' | 'OTHER';

export interface InventoryAdjustment {
  id: string;
  productId: string;
  product: Pick<Product, 'id' | 'name' | 'sku' | 'unitType'>;
  adjustmentType: AdjustmentType;
  reason: AdjustmentReason;
  quantity: number;
  notes?: string;
  userId: string;
  user: Pick<User, 'id' | 'name'>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  userId?: string;
  userName?: string;
  createdAt: string;
}
