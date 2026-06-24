export type UserRole = 'Admin' | 'Staff';

export interface Profile {
  id: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export type ProductStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  current_stock: number;
  minimum_stock: number;
  description: string | null;
  status: ProductStatus;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company_name: string;
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product_name?: string; // resolved locally for displays
  quantity: number;
  unit_cost: number;
  total_amount: number;
}

export interface Purchase {
  id: string;
  supplier_id: string;
  supplier_name?: string; // resolved for UI convenience
  date: string;
  total_amount: number;
  items?: PurchaseItem[];
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name?: string; // resolved locally for displays
  quantity: number;
  unit_price: number;
  total_amount: number;
}

export interface Sale {
  id: string;
  customer_id: string;
  customer_name?: string; // resolved for UI convenience
  date: string;
  discount: number;
  tax: number;
  total_amount: number;
  items?: SaleItem[];
  created_at: string;
}

export type MovementType = 'IN' | 'OUT';

export interface StockMovement {
  id: string;
  product_id: string;
  product_name?: string; // resolved locally
  type: MovementType;
  quantity: number;
  reference_id: string; // purchase_id or sale_id
  notes: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name?: string;
  action: string;
  details: string | null;
  created_at: string;
}

export interface DatabaseStatus {
  isSupabase: boolean;
  connected: boolean;
  message: string;
}
