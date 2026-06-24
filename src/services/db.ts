import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { 
  Product, Customer, Supplier, Purchase, Sale, StockMovement, 
  ActivityLog, DatabaseStatus, UserRole, ProductStatus
} from '../types';
import { 
  mockProducts, mockCustomers, mockSuppliers, 
  mockPurchases, mockSales, mockStockMovements, mockActivityLogs 
} from './mockData';

// Dynamic Database State Indicator
export const getDatabaseStatus = async (): Promise<DatabaseStatus> => {
  if (!isSupabaseConfigured) {
    return {
      isSupabase: false,
      connected: false,
      message: 'Local Database (Demo Data Active)'
    };
  }
  try {
    const { error } = await supabase!.from('products').select('count', { count: 'exact', head: true });
    if (error) throw error;
    return {
      isSupabase: true,
      connected: true,
      message: 'Supabase Cloud Connected'
    };
  } catch (err: any) {
    return {
      isSupabase: true,
      connected: false,
      message: `Supabase Offline Fallback: ${err.message || 'Connection Refused'}`
    };
  }
};

// HELPER: Get active local storage database or seed initial
const getLocalData = <T>(key: string, initial: T[]): T[] => {
  const data = localStorage.getItem(`erp_${key}`);
  if (!data) {
    localStorage.setItem(`erp_${key}`, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
};

const setLocalData = <T>(key: string, data: T[]): void => {
  localStorage.setItem(`erp_${key}`, JSON.stringify(data));
};

// LOCAL STORAGE INITIALIZATION
const initLocalStorage = () => {
  getLocalData('products', mockProducts);
  getLocalData('customers', mockCustomers);
  getLocalData('suppliers', mockSuppliers);
  getLocalData('purchases', mockPurchases);
  getLocalData('sales', mockSales);
  getLocalData('stock_movements', mockStockMovements);
  getLocalData('activity_logs', mockActivityLogs);
  
  // Seed a default admin profile
  getLocalData('users', [
    { id: 'user-admin', email: 'admin@erpnexus.com', name: 'System Admin', role: 'Admin' as UserRole },
    { id: 'user-staff', email: 'staff@erpnexus.com', name: 'Staff User', role: 'Staff' as UserRole }
  ]);
  
  // Active session
  if (!localStorage.getItem('erp_session')) {
    // Leave empty initially
  }
};

initLocalStorage();

// Activity logger helper
export const logActivity = async (action: string, details: string): Promise<void> => {
  const sessionUser = getActiveSession();
  const userName = sessionUser ? sessionUser.name : 'System';
  const userId = sessionUser ? sessionUser.id : 'system';

  const newLog: ActivityLog = {
    id: `log-${Date.now()}`,
    user_id: userId,
    user_name: userName,
    action,
    details,
    created_at: new Date().toISOString()
  };

  const status = await getDatabaseStatus();
  if (status.isSupabase && status.connected) {
    await supabase!.from('activity_logs').insert([{
      user_id: userId === 'system' ? null : userId,
      action,
      details
    }]);
  } else {
    const logs = getLocalData<ActivityLog>('activity_logs', mockActivityLogs);
    logs.unshift(newLog);
    setLocalData('activity_logs', logs.slice(0, 200)); // cap at 200 items locally
  }
};

// AUTHENTICATION LOGIC
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export const getActiveSession = (): SessionUser | null => {
  const session = localStorage.getItem('erp_session');
  return session ? JSON.parse(session) : null;
};

export const logoutUser = async (): Promise<void> => {
  const activeUser = getActiveSession();
  if (activeUser) {
    await logActivity('USER_LOGOUT', `${activeUser.name} signed out.`);
  }
  
  if (isSupabaseConfigured) {
    await supabase!.auth.signOut();
  }
  localStorage.removeItem('erp_session');
};

// Helper for status badge
const calculateProductStatus = (stock: number, minStock: number): ProductStatus => {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= minStock) return 'Low Stock';
  return 'In Stock';
};

// PRODUCTS DATABASE ADAPTER
export const dbProducts = {
  list: async (): Promise<Product[]> => {
    const status = await getDatabaseStatus();
    if (status.isSupabase && status.connected) {
      const { data, error } = await supabase!.from('products').select('*').order('name');
      if (error) throw error;
      return data || [];
    } else {
      return getLocalData<Product>('products', mockProducts).sort((a, b) => a.name.localeCompare(b.name));
    }
  },

  create: async (product: Omit<Product, 'id' | 'created_at' | 'status'>): Promise<Product> => {
    const status = await getDatabaseStatus();
    const prodStatus = calculateProductStatus(product.current_stock, product.minimum_stock);
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}`,
      status: prodStatus,
      created_at: new Date().toISOString()
    };

    if (status.isSupabase && status.connected) {
      const { data, error } = await supabase!.from('products').insert([{
        ...product,
        status: prodStatus
      }]).select().single();
      if (error) throw error;
      await logActivity('CREATE_PRODUCT', `Created product ${product.name} (SKU: ${product.sku}).`);
      return data;
    } else {
      const products = getLocalData<Product>('products', mockProducts);
      products.push(newProduct);
      setLocalData('products', products);
      await logActivity('CREATE_PRODUCT', `Created product ${product.name} (SKU: ${product.sku}).`);
      return newProduct;
    }
  },

  update: async (id: string, updates: Partial<Omit<Product, 'id' | 'created_at'>>): Promise<Product> => {
    const status = await getDatabaseStatus();
    
    // Resolve full product to recalculate status
    let currentProd: Product;
    if (status.isSupabase && status.connected) {
      const { data, error } = await supabase!.from('products').select('*').eq('id', id).single();
      if (error) throw error;
      currentProd = data;
    } else {
      const products = getLocalData<Product>('products', mockProducts);
      const found = products.find(p => p.id === id);
      if (!found) throw new Error('Product not found');
      currentProd = found;
    }

    const updatedStock = updates.current_stock !== undefined ? updates.current_stock : currentProd.current_stock;
    const updatedMinStock = updates.minimum_stock !== undefined ? updates.minimum_stock : currentProd.minimum_stock;
    const recalculatedStatus = calculateProductStatus(updatedStock, updatedMinStock);

    const mergedUpdates = {
      ...updates,
      status: recalculatedStatus
    };

    if (status.isSupabase && status.connected) {
      const { data, error } = await supabase!.from('products').update(mergedUpdates).eq('id', id).select().single();
      if (error) throw error;
      await logActivity('UPDATE_PRODUCT', `Updated product details for ${currentProd.name}.`);
      return data;
    } else {
      const products = getLocalData<Product>('products', mockProducts);
      const index = products.findIndex(p => p.id === id);
      const updatedProduct = { ...products[index], ...mergedUpdates } as Product;
      products[index] = updatedProduct;
      setLocalData('products', products);
      await logActivity('UPDATE_PRODUCT', `Updated product details for ${currentProd.name}.`);
      return updatedProduct;
    }
  },

  delete: async (id: string): Promise<void> => {
    const activeSession = getActiveSession();
    if (activeSession?.role !== 'Admin') {
      throw new Error('Unauthorized. Only Admins can delete items.');
    }

    const status = await getDatabaseStatus();
    
    let prodName = id;
    try {
      const prods = await dbProducts.list();
      const p = prods.find(item => item.id === id);
      if (p) prodName = p.name;
    } catch {}

    if (status.isSupabase && status.connected) {
      const { error } = await supabase!.from('products').delete().eq('id', id);
      if (error) throw error;
    } else {
      const products = getLocalData<Product>('products', mockProducts);
      const filtered = products.filter(p => p.id !== id);
      setLocalData('products', filtered);
    }
    await logActivity('DELETE_PRODUCT', `Deleted product: ${prodName}.`);
  }
};

// CUSTOMERS DATABASE ADAPTER
export const dbCustomers = {
  list: async (): Promise<Customer[]> => {
    const status = await getDatabaseStatus();
    if (status.isSupabase && status.connected) {
      const { data, error } = await supabase!.from('customers').select('*').order('name');
      if (error) throw error;
      return data || [];
    } else {
      return getLocalData<Customer>('customers', mockCustomers).sort((a, b) => a.name.localeCompare(b.name));
    }
  },

  create: async (customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> => {
    const status = await getDatabaseStatus();
    const newCust: Customer = {
      ...customer,
      id: `cust-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    if (status.isSupabase && status.connected) {
      const { data, error } = await supabase!.from('customers').insert([customer]).select().single();
      if (error) throw error;
      await logActivity('CREATE_CUSTOMER', `Added new customer: ${customer.name}.`);
      return data;
    } else {
      const customers = getLocalData<Customer>('customers', mockCustomers);
      customers.push(newCust);
      setLocalData('customers', customers);
      await logActivity('CREATE_CUSTOMER', `Added new customer: ${customer.name}.`);
      return newCust;
    }
  },

  update: async (id: string, updates: Partial<Omit<Customer, 'id' | 'created_at'>>): Promise<Customer> => {
    const status = await getDatabaseStatus();
    if (status.isSupabase && status.connected) {
      const { data, error } = await supabase!.from('customers').update(updates).eq('id', id).select().single();
      if (error) throw error;
      await logActivity('UPDATE_CUSTOMER', `Updated customer details for ID ${id}.`);
      return data;
    } else {
      const customers = getLocalData<Customer>('customers', mockCustomers);
      const index = customers.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Customer not found');
      const updated = { ...customers[index], ...updates } as Customer;
      customers[index] = updated;
      setLocalData('customers', customers);
      await logActivity('UPDATE_CUSTOMER', `Updated customer details for ${updated.name}.`);
      return updated;
    }
  },

  delete: async (id: string): Promise<void> => {
    const activeSession = getActiveSession();
    if (activeSession?.role !== 'Admin') {
      throw new Error('Unauthorized. Only Admins can delete records.');
    }
    const status = await getDatabaseStatus();
    if (status.isSupabase && status.connected) {
      const { error } = await supabase!.from('customers').delete().eq('id', id);
      if (error) throw error;
    } else {
      const customers = getLocalData<Customer>('customers', mockCustomers);
      const filtered = customers.filter(c => c.id !== id);
      setLocalData('customers', filtered);
    }
    await logActivity('DELETE_CUSTOMER', `Removed customer record ID ${id}.`);
  }
};

// SUPPLIERS DATABASE ADAPTER
export const dbSuppliers = {
  list: async (): Promise<Supplier[]> => {
    const status = await getDatabaseStatus();
    if (status.isSupabase && status.connected) {
      const { data, error } = await supabase!.from('suppliers').select('*').order('name');
      if (error) throw error;
      return data || [];
    } else {
      return getLocalData<Supplier>('suppliers', mockSuppliers).sort((a, b) => a.name.localeCompare(b.name));
    }
  },

  create: async (supplier: Omit<Supplier, 'id' | 'created_at'>): Promise<Supplier> => {
    const status = await getDatabaseStatus();
    const newSupp: Supplier = {
      ...supplier,
      id: `supp-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    if (status.isSupabase && status.connected) {
      const { data, error } = await supabase!.from('suppliers').insert([supplier]).select().single();
      if (error) throw error;
      await logActivity('CREATE_SUPPLIER', `Added supplier: ${supplier.company_name}.`);
      return data;
    } else {
      const suppliers = getLocalData<Supplier>('suppliers', mockSuppliers);
      suppliers.push(newSupp);
      setLocalData('suppliers', suppliers);
      await logActivity('CREATE_SUPPLIER', `Added supplier: ${supplier.company_name}.`);
      return newSupp;
    }
  },

  update: async (id: string, updates: Partial<Omit<Supplier, 'id' | 'created_at'>>): Promise<Supplier> => {
    const status = await getDatabaseStatus();
    if (status.isSupabase && status.connected) {
      const { data, error } = await supabase!.from('suppliers').update(updates).eq('id', id).select().single();
      if (error) throw error;
      await logActivity('UPDATE_SUPPLIER', `Updated supplier details for ID ${id}.`);
      return data;
    } else {
      const suppliers = getLocalData<Supplier>('suppliers', mockSuppliers);
      const index = suppliers.findIndex(s => s.id === id);
      if (index === -1) throw new Error('Supplier not found');
      const updated = { ...suppliers[index], ...updates } as Supplier;
      suppliers[index] = updated;
      setLocalData('suppliers', suppliers);
      await logActivity('UPDATE_SUPPLIER', `Updated supplier details for ${updated.company_name}.`);
      return updated;
    }
  },

  delete: async (id: string): Promise<void> => {
    const activeSession = getActiveSession();
    if (activeSession?.role !== 'Admin') {
      throw new Error('Unauthorized. Only Admins can delete records.');
    }
    const status = await getDatabaseStatus();
    if (status.isSupabase && status.connected) {
      const { error } = await supabase!.from('suppliers').delete().eq('id', id);
      if (error) throw error;
    } else {
      const suppliers = getLocalData<Supplier>('suppliers', mockSuppliers);
      const filtered = suppliers.filter(s => s.id !== id);
      setLocalData('suppliers', filtered);
    }
    await logActivity('DELETE_SUPPLIER', `Removed supplier record ID ${id}.`);
  }
};

// PURCHASES ADAPTER (STOCK INCREASE BUSINESS LOGIC)
export const dbPurchases = {
  list: async (): Promise<Purchase[]> => {
    const status = await getDatabaseStatus();
    if (status.isSupabase && status.connected) {
      // Supabase nested joins are complex but possible, let's keep it robust
      const { data, error } = await supabase!
        .from('purchases')
        .select(`
          *,
          suppliers (company_name),
          purchase_items (
            *,
            products (name)
          )
        `)
        .order('date', { ascending: false });
      if (error) throw error;
      
      return (data || []).map(p => ({
        ...p,
        supplier_name: p.suppliers?.company_name || 'Unknown Supplier',
        items: (p.purchase_items || []).map((item: any) => ({
          ...item,
          product_name: item.products?.name || 'Unknown Product'
        }))
      }));
    } else {
      const purchases = getLocalData<Purchase>('purchases', mockPurchases);
      const suppliers = getLocalData<Supplier>('suppliers', mockSuppliers);
      const products = getLocalData<Product>('products', mockProducts);

      return purchases.map(p => {
        const supp = suppliers.find(s => s.id === p.supplier_id);
        const resolvedItems = (p.items || []).map(item => {
          const prod = products.find(pr => pr.id === item.product_id);
          return {
            ...item,
            product_name: prod ? prod.name : 'Unknown Product'
          };
        });

        return {
          ...p,
          supplier_name: supp ? supp.company_name : 'Unknown Supplier',
          items: resolvedItems
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  },

  create: async (purchaseData: { supplier_id: string; date: string; items: { product_id: string; quantity: number; unit_cost: number }[] }): Promise<Purchase> => {
    const status = await getDatabaseStatus();
    const total_amount = purchaseData.items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    const purchaseId = `purch-${Date.now()}`;
    
    if (status.isSupabase && status.connected) {
      // Insert purchase, insert items, update stock, log stock movement
      const { data: purchase, error: pErr } = await supabase!
        .from('purchases')
        .insert([{ supplier_id: purchaseData.supplier_id, date: purchaseData.date, total_amount }])
        .select()
        .single();
      if (pErr) throw pErr;

      const itemsToInsert = purchaseData.items.map(item => ({
        purchase_id: purchase.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_amount: item.quantity * item.unit_cost
      }));

      const { error: itemsErr } = await supabase!.from('purchase_items').insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      // Update product stocks and log movements
      for (const item of purchaseData.items) {
        // Fetch current product to update stock
        const { data: prod } = await supabase!.from('products').select('current_stock, minimum_stock').eq('id', item.product_id).single();
        if (prod) {
          const newStock = prod.current_stock + item.quantity;
          const newProdStatus = calculateProductStatus(newStock, prod.minimum_stock);
          await supabase!.from('products').update({ current_stock: newStock, status: newProdStatus }).eq('id', item.product_id);
          
          // Log stock movement
          await supabase!.from('stock_movements').insert([{
            product_id: item.product_id,
            type: 'IN',
            quantity: item.quantity,
            reference_id: purchase.id,
            notes: `Purchased from supplier. PO ID: ${purchase.id}`
          }]);
        }
      }

      await logActivity('CREATE_PURCHASE', `Registered purchase order ${purchase.id} (Total: $${total_amount.toFixed(2)}).`);
      return purchase;
    } else {
      const purchases = getLocalData<Purchase>('purchases', mockPurchases);
      const products = getLocalData<Product>('products', mockProducts);
      const stockMovements = getLocalData<StockMovement>('stock_movements', mockStockMovements);

      const resolvedItems = purchaseData.items.map((item, idx) => ({
        id: `pi-${Date.now()}-${idx}`,
        purchase_id: purchaseId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_amount: item.quantity * item.unit_cost
      }));

      const newPurchase: Purchase = {
        id: purchaseId,
        supplier_id: purchaseData.supplier_id,
        date: purchaseData.date,
        total_amount,
        items: resolvedItems,
        created_at: new Date().toISOString()
      };

      purchases.push(newPurchase);
      setLocalData('purchases', purchases);

      // Business Logic: Increase stock and log movements
      purchaseData.items.forEach(item => {
        const prodIdx = products.findIndex(p => p.id === item.product_id);
        if (prodIdx !== -1) {
          const newStock = products[prodIdx].current_stock + item.quantity;
          products[prodIdx].current_stock = newStock;
          products[prodIdx].status = calculateProductStatus(newStock, products[prodIdx].minimum_stock);
        }

        const newMovement: StockMovement = {
          id: `m-${Date.now()}-${item.product_id}`,
          product_id: item.product_id,
          type: 'IN',
          quantity: item.quantity,
          reference_id: purchaseId,
          notes: `Purchased from supplier. PO ID: ${purchaseId}`,
          created_at: new Date().toISOString()
        };
        stockMovements.unshift(newMovement);
      });

      setLocalData('products', products);
      setLocalData('stock_movements', stockMovements);

      await logActivity('CREATE_PURCHASE', `Registered purchase order ${purchaseId} (Total: $${total_amount.toFixed(2)}).`);
      return newPurchase;
    }
  },

  delete: async (id: string): Promise<void> => {
    const activeSession = getActiveSession();
    if (activeSession?.role !== 'Admin') {
      throw new Error('Unauthorized. Only Admins can delete purchases.');
    }
    const status = await getDatabaseStatus();

    // Revert stock logic before deletion? Standard practice is delete deletes the history, but doesn't necessarily reverse stock unless specifically asked.
    // For safety, let's just delete the history log.
    if (status.isSupabase && status.connected) {
      const { error } = await supabase!.from('purchases').delete().eq('id', id);
      if (error) throw error;
    } else {
      const purchases = getLocalData<Purchase>('purchases', mockPurchases);
      const filtered = purchases.filter(p => p.id !== id);
      setLocalData('purchases', filtered);
    }
    await logActivity('DELETE_PURCHASE', `Deleted purchase order record: ${id}.`);
  },

  update: async (id: string, purchaseData: { supplier_id: string; date: string; items: { product_id: string; quantity: number; unit_cost: number }[] }): Promise<void> => {
    const status = await getDatabaseStatus();
    const total_amount = purchaseData.items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    
    if (status.isSupabase && status.connected) {
      const { data: oldItems } = await supabase!.from('purchase_items').select('*').eq('purchase_id', id);
      if (oldItems) {
        for (const item of oldItems) {
          const { data: prod } = await supabase!.from('products').select('current_stock, minimum_stock').eq('id', item.product_id).single();
          if (prod) {
            const revertedStock = Math.max(0, prod.current_stock - item.quantity);
            await supabase!.from('products').update({ current_stock: revertedStock, status: calculateProductStatus(revertedStock, prod.minimum_stock) }).eq('id', item.product_id);
          }
        }
      }
      
      await supabase!.from('purchase_items').delete().eq('purchase_id', id);
      await supabase!.from('purchases').update({ supplier_id: purchaseData.supplier_id, date: purchaseData.date, total_amount }).eq('id', id);
      
      const itemsToInsert = purchaseData.items.map(item => ({
        purchase_id: id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_amount: item.quantity * item.unit_cost
      }));
      await supabase!.from('purchase_items').insert(itemsToInsert);
      
      for (const item of purchaseData.items) {
        const { data: prod } = await supabase!.from('products').select('current_stock, minimum_stock').eq('id', item.product_id).single();
        if (prod) {
          const newStock = prod.current_stock + item.quantity;
          await supabase!.from('products').update({ current_stock: newStock, status: calculateProductStatus(newStock, prod.minimum_stock) }).eq('id', item.product_id);
        }
      }
      
      await logActivity('UPDATE_PURCHASE', `Updated purchase order PO ${id}.`);
    } else {
      const purchases = getLocalData<Purchase>('purchases', mockPurchases);
      const products = getLocalData<Product>('products', mockProducts);
      const oldPurchase = purchases.find(p => p.id === id);
      
      if (oldPurchase) {
        (oldPurchase.items || []).forEach(item => {
          const prodIdx = products.findIndex(p => p.id === item.product_id);
          if (prodIdx !== -1) {
            const revertedStock = Math.max(0, products[prodIdx].current_stock - item.quantity);
            products[prodIdx].current_stock = revertedStock;
            products[prodIdx].status = calculateProductStatus(revertedStock, products[prodIdx].minimum_stock);
          }
        });
        
        purchaseData.items.forEach(item => {
          const prodIdx = products.findIndex(p => p.id === item.product_id);
          if (prodIdx !== -1) {
            const newStock = products[prodIdx].current_stock + item.quantity;
            products[prodIdx].current_stock = newStock;
            products[prodIdx].status = calculateProductStatus(newStock, products[prodIdx].minimum_stock);
          }
        });
        
        const resolvedItems = purchaseData.items.map((item, idx) => ({
          id: `pi-${Date.now()}-${idx}`,
          purchase_id: id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          total_amount: item.quantity * item.unit_cost
        }));
        
        const oldPurchaseIdx = purchases.findIndex(p => p.id === id);
        purchases[oldPurchaseIdx] = {
          ...purchases[oldPurchaseIdx],
          supplier_id: purchaseData.supplier_id,
          date: purchaseData.date,
          total_amount,
          items: resolvedItems
        };
        
        setLocalData('products', products);
        setLocalData('purchases', purchases);
      }
      await logActivity('UPDATE_PURCHASE', `Updated purchase order PO ${id} locally.`);
    }
  }
};

// SALES ADAPTER (STOCK DEDUCTION & VALIDATION)
export const dbSales = {
  list: async (): Promise<Sale[]> => {
    const status = await getDatabaseStatus();
    if (status.isSupabase && status.connected) {
      const { data, error } = await supabase!
        .from('sales')
        .select(`
          *,
          customers (name),
          sale_items (
            *,
            products (name)
          )
        `)
        .order('date', { ascending: false });
      if (error) throw error;

      return (data || []).map(s => ({
        ...s,
        customer_name: s.customers?.name || 'Walk-in Customer',
        items: (s.sale_items || []).map((item: any) => ({
          ...item,
          product_name: item.products?.name || 'Unknown Product'
        }))
      }));
    } else {
      const sales = getLocalData<Sale>('sales', mockSales);
      const customers = getLocalData<Customer>('customers', mockCustomers);
      const products = getLocalData<Product>('products', mockProducts);

      return sales.map(s => {
        const cust = customers.find(c => c.id === s.customer_id);
        const resolvedItems = (s.items || []).map(item => {
          const prod = products.find(pr => pr.id === item.product_id);
          return {
            ...item,
            product_name: prod ? prod.name : 'Unknown Product'
          };
        });

        return {
          ...s,
          customer_name: cust ? cust.name : 'Walk-in Customer',
          items: resolvedItems
        };
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
  },

  create: async (saleData: { customer_id: string; date: string; discount: number; tax: number; items: { product_id: string; quantity: number; unit_price: number }[] }): Promise<Sale> => {
    const status = await getDatabaseStatus();
    const subtotal = saleData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const total_amount = Math.max(0, subtotal - saleData.discount + saleData.tax);
    const saleId = `sale-${Date.now()}`;

    // PRE-CHECK: Stock validation
    const products = await dbProducts.list();
    for (const item of saleData.items) {
      const prod = products.find(p => p.id === item.product_id);
      if (!prod) throw new Error('Product not found.');
      if (prod.current_stock < item.quantity) {
        throw new Error(`Insufficient stock for "${prod.name}". Current Stock: ${prod.current_stock}, Requested: ${item.quantity}`);
      }
    }

    if (status.isSupabase && status.connected) {
      const { data: sale, error: sErr } = await supabase!
        .from('sales')
        .insert([{ 
          customer_id: saleData.customer_id || null, 
          date: saleData.date, 
          discount: saleData.discount, 
          tax: saleData.tax, 
          total_amount 
        }])
        .select()
        .single();
      if (sErr) throw sErr;

      const itemsToInsert = saleData.items.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.quantity * item.unit_price
      }));

      const { error: itemsErr } = await supabase!.from('sale_items').insert(itemsToInsert);
      if (itemsErr) throw itemsErr;

      // Update product stocks and log movements
      for (const item of saleData.items) {
        const { data: prod } = await supabase!.from('products').select('current_stock, minimum_stock').eq('id', item.product_id).single();
        if (prod) {
          const newStock = Math.max(0, prod.current_stock - item.quantity);
          const newProdStatus = calculateProductStatus(newStock, prod.minimum_stock);
          await supabase!.from('products').update({ current_stock: newStock, status: newProdStatus }).eq('id', item.product_id);

          // Log stock movement
          await supabase!.from('stock_movements').insert([{
            product_id: item.product_id,
            type: 'OUT',
            quantity: item.quantity,
            reference_id: sale.id,
            notes: `Sold to customer. Invoice ID: ${sale.id}`
          }]);
        }
      }

      await logActivity('CREATE_SALE', `Created sale invoice ${sale.id} (Grand Total: $${total_amount.toFixed(2)}).`);
      return sale;
    } else {
      const sales = getLocalData<Sale>('sales', mockSales);
      const prods = getLocalData<Product>('products', mockProducts);
      const stockMovements = getLocalData<StockMovement>('stock_movements', mockStockMovements);

      const resolvedItems = saleData.items.map((item, idx) => ({
        id: `si-${Date.now()}-${idx}`,
        sale_id: saleId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.quantity * item.unit_price
      }));

      const newSale: Sale = {
        id: saleId,
        customer_id: saleData.customer_id,
        date: saleData.date,
        discount: saleData.discount,
        tax: saleData.tax,
        total_amount,
        items: resolvedItems,
        created_at: new Date().toISOString()
      };

      sales.push(newSale);
      setLocalData('sales', sales);

      // Business Logic: Reduce stock and log movements
      saleData.items.forEach(item => {
        const prodIdx = prods.findIndex(p => p.id === item.product_id);
        if (prodIdx !== -1) {
          const newStock = Math.max(0, prods[prodIdx].current_stock - item.quantity);
          prods[prodIdx].current_stock = newStock;
          prods[prodIdx].status = calculateProductStatus(newStock, prods[prodIdx].minimum_stock);
        }

        const newMovement: StockMovement = {
          id: `m-${Date.now()}-${item.product_id}`,
          product_id: item.product_id,
          type: 'OUT',
          quantity: item.quantity,
          reference_id: saleId,
          notes: `Sold to customer. Invoice ID: ${saleId}`,
          created_at: new Date().toISOString()
        };
        stockMovements.unshift(newMovement);
      });

      setLocalData('products', prods);
      setLocalData('stock_movements', stockMovements);

      await logActivity('CREATE_SALE', `Created sale invoice ${saleId} (Grand Total: $${total_amount.toFixed(2)}).`);
      return newSale;
    }
  },

  delete: async (id: string): Promise<void> => {
    const activeSession = getActiveSession();
    if (activeSession?.role !== 'Admin') {
      throw new Error('Unauthorized. Only Admins can delete sales.');
    }
    const status = await getDatabaseStatus();

    if (status.isSupabase && status.connected) {
      const { error } = await supabase!.from('sales').delete().eq('id', id);
      if (error) throw error;
    } else {
      const sales = getLocalData<Sale>('sales', mockSales);
      const filtered = sales.filter(s => s.id !== id);
      setLocalData('sales', filtered);
    }
    await logActivity('DELETE_SALE', `Deleted sales record: ${id}.`);
  },

  update: async (id: string, saleData: { customer_id: string; date: string; discount: number; tax: number; items: { product_id: string; quantity: number; unit_price: number }[] }): Promise<void> => {
    const status = await getDatabaseStatus();
    const subtotal = saleData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const total_amount = Math.max(0, subtotal - saleData.discount + saleData.tax);
    
    const products = await dbProducts.list();
    const sales = getLocalData<Sale>('sales', mockSales);
    const oldSale = sales.find(s => s.id === id);
    
    const tempProducts = products.map(p => ({ ...p }));
    if (oldSale) {
      (oldSale.items || []).forEach(item => {
        const prod = tempProducts.find(p => p.id === item.product_id);
        if (prod) {
          prod.current_stock += item.quantity;
        }
      });
    }
    
    for (const item of saleData.items) {
      const prod = tempProducts.find(p => p.id === item.product_id);
      if (!prod) throw new Error('Product not found.');
      if (prod.current_stock < item.quantity) {
        throw new Error(`Insufficient stock for "${prod.name}" in updated sale. Available: ${prod.current_stock}, Requested: ${item.quantity}`);
      }
    }

    if (status.isSupabase && status.connected) {
      if (oldSale?.items) {
        for (const item of oldSale.items) {
          const { data: prod } = await supabase!.from('products').select('current_stock, minimum_stock').eq('id', item.product_id).single();
          if (prod) {
            const revertedStock = prod.current_stock + item.quantity;
            await supabase!.from('products').update({ current_stock: revertedStock, status: calculateProductStatus(revertedStock, prod.minimum_stock) }).eq('id', item.product_id);
          }
        }
      }
      
      await supabase!.from('sale_items').delete().eq('sale_id', id);
      await supabase!.from('sales').update({ customer_id: saleData.customer_id || null, date: saleData.date, discount: saleData.discount, tax: saleData.tax, total_amount }).eq('id', id);
      
      const itemsToInsert = saleData.items.map(item => ({
        sale_id: id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_amount: item.quantity * item.unit_price
      }));
      await supabase!.from('sale_items').insert(itemsToInsert);
      
      for (const item of saleData.items) {
        const { data: prod } = await supabase!.from('products').select('current_stock, minimum_stock').eq('id', item.product_id).single();
        if (prod) {
          const newStock = Math.max(0, prod.current_stock - item.quantity);
          await supabase!.from('products').update({ current_stock: newStock, status: calculateProductStatus(newStock, prod.minimum_stock) }).eq('id', item.product_id);
        }
      }
      
      await logActivity('UPDATE_SALE', `Updated sales invoice ${id} (Grand Total: $${total_amount.toFixed(2)}).`);
    } else {
      const sales = getLocalData<Sale>('sales', mockSales);
      const prods = getLocalData<Product>('products', mockProducts);
      const oldSaleIdx = sales.findIndex(s => s.id === id);
      
      if (oldSaleIdx !== -1) {
        const oldSale = sales[oldSaleIdx];
        (oldSale.items || []).forEach(item => {
          const prodIdx = prods.findIndex(p => p.id === item.product_id);
          if (prodIdx !== -1) {
            const revertedStock = prods[prodIdx].current_stock + item.quantity;
            prods[prodIdx].current_stock = revertedStock;
            prods[prodIdx].status = calculateProductStatus(revertedStock, prods[prodIdx].minimum_stock);
          }
        });
        
        saleData.items.forEach(item => {
          const prodIdx = prods.findIndex(p => p.id === item.product_id);
          if (prodIdx !== -1) {
            const newStock = Math.max(0, prods[prodIdx].current_stock - item.quantity);
            prods[prodIdx].current_stock = newStock;
            prods[prodIdx].status = calculateProductStatus(newStock, prods[prodIdx].minimum_stock);
          }
        });
        
        const resolvedItems = saleData.items.map((item, idx) => ({
          id: `si-${Date.now()}-${idx}`,
          sale_id: id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_amount: item.quantity * item.unit_price
        }));
        
        sales[oldSaleIdx] = {
          ...sales[oldSaleIdx],
          customer_id: saleData.customer_id,
          date: saleData.date,
          discount: saleData.discount,
          tax: saleData.tax,
          total_amount,
          items: resolvedItems
        };
        
        setLocalData('products', prods);
        setLocalData('sales', sales);
      }
      await logActivity('UPDATE_SALE', `Updated sales invoice ${id} locally.`);
    }
  }
};

// STOCK MOVEMENTS ADAPTER
export const dbStockMovements = {
  list: async (): Promise<StockMovement[]> => {
    const status = await getDatabaseStatus();
    if (status.isSupabase && status.connected) {
      const { data, error } = await supabase!
        .from('stock_movements')
        .select('*, products(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      return (data || []).map(m => ({
        ...m,
        product_name: m.products?.name || 'Unknown Product'
      }));
    } else {
      const movements = getLocalData<StockMovement>('stock_movements', mockStockMovements);
      const products = getLocalData<Product>('products', mockProducts);

      return movements.map(m => {
        const prod = products.find(p => p.id === m.product_id);
        return {
          ...m,
          product_name: prod ? prod.name : 'Unknown Product'
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }
};

// AUDIT TRAIL LOGS ADAPTER
export const dbActivityLogs = {
  list: async (): Promise<ActivityLog[]> => {
    const status = await getDatabaseStatus();
    if (status.isSupabase && status.connected) {
      const { data, error } = await supabase!
        .from('activity_logs')
        .select('*, profiles(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;

      return (data || []).map(log => ({
        ...log,
        user_name: log.profiles?.name || 'System / External API'
      }));
    } else {
      return getLocalData<ActivityLog>('activity_logs', mockActivityLogs)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }
};

// GLOBAL SEARCH ADAPTER
export interface GlobalSearchResult {
  id: string;
  type: 'Product' | 'Customer' | 'Supplier' | 'Sale' | 'Purchase';
  title: string;
  subtitle: string;
  url: string;
}

export const runGlobalSearch = async (query: string): Promise<GlobalSearchResult[]> => {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase().trim();

  // List all data locally or from dynamic APIs
  const products = await dbProducts.list();
  const customers = await dbCustomers.list();
  const suppliers = await dbSuppliers.list();
  const sales = await dbSales.list();
  const purchases = await dbPurchases.list();

  const results: GlobalSearchResult[] = [];

  // Match Products
  products.forEach(p => {
    if (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) {
      results.push({
        id: p.id,
        type: 'Product',
        title: p.name,
        subtitle: `SKU: ${p.sku} | Stock: ${p.current_stock} | $${p.selling_price.toFixed(2)}`,
        url: `/products?search=${encodeURIComponent(p.sku)}`
      });
    }
  });

  // Match Customers
  customers.forEach(c => {
    if (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))) {
      results.push({
        id: c.id,
        type: 'Customer',
        title: c.name,
        subtitle: `Email: ${c.email} | Phone: ${c.phone}`,
        url: `/customers?search=${encodeURIComponent(c.name)}`
      });
    }
  });

  // Match Suppliers
  suppliers.forEach(s => {
    if (s.name.toLowerCase().includes(q) || s.company_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)) {
      results.push({
        id: s.id,
        type: 'Supplier',
        title: s.company_name,
        subtitle: `Contact: ${s.name} | Phone: ${s.phone}`,
        url: `/suppliers?search=${encodeURIComponent(s.company_name)}`
      });
    }
  });

  // Match Sales
  sales.forEach(s => {
    if (s.id.toLowerCase().includes(q) || (s.customer_name && s.customer_name.toLowerCase().includes(q))) {
      results.push({
        id: s.id,
        type: 'Sale',
        title: `Invoice #${s.id.substring(0, 8)}`,
        subtitle: `Customer: ${s.customer_name || 'Walk-in'} | Total: $${s.total_amount.toFixed(2)}`,
        url: `/sales?search=${encodeURIComponent(s.id)}`
      });
    }
  });

  // Match Purchases
  purchases.forEach(p => {
    if (p.id.toLowerCase().includes(q) || (p.supplier_name && p.supplier_name.toLowerCase().includes(q))) {
      results.push({
        id: p.id,
        type: 'Purchase',
        title: `PO #${p.id.substring(0, 8)}`,
        subtitle: `Supplier: ${p.supplier_name} | Total: $${p.total_amount.toFixed(2)}`,
        url: `/purchases?search=${encodeURIComponent(p.id)}`
      });
    }
  });

  return results.slice(0, 10); // cap results
};
