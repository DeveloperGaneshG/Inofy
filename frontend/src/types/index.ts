export type Role = 'ADMIN' | 'CASHIER';
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI';
export type BillStatus = 'PENDING' | 'PAID' | 'CANCELLED';

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
  price: number;
  costPrice: number;
  stock: number;
  lowStockAlert: number;
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
  totalPrice: number;
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

export interface InventoryReport {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalStockValue: number;
  products: Product[];
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
}
