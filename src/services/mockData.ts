import type { Product, Customer, Supplier, Purchase, Sale, StockMovement, ActivityLog } from '../types';


export const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Quantum Desk Lamp',
    sku: 'EL-LMP-001',
    category: 'Electronics',
    purchase_price: 24.50,
    selling_price: 49.99,
    current_stock: 45,
    minimum_stock: 15,
    description: 'Smart LED desk lamp with gesture control and ambient light sensing.',
    status: 'In Stock',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'prod-2',
    name: 'Ergonomic Mesh Chair',
    sku: 'OF-CHR-002',
    category: 'Office Supplies',
    purchase_price: 110.00,
    selling_price: 229.99,
    current_stock: 8,
    minimum_stock: 10,
    description: 'High-back mesh chair with adjustable armrests and lumbar support.',
    status: 'Low Stock',
    created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'prod-3',
    name: 'UltraWide Curved Monitor 34"',
    sku: 'EL-MON-003',
    category: 'Electronics',
    purchase_price: 320.00,
    selling_price: 549.99,
    current_stock: 14,
    minimum_stock: 5,
    description: 'Curved IPS display with 144Hz refresh rate and USB-C power delivery.',
    status: 'In Stock',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'prod-4',
    name: 'Titanium Screwdriver Set (24pc)',
    sku: 'TL-SD-004',
    category: 'Industrial Tools',
    purchase_price: 12.00,
    selling_price: 29.99,
    current_stock: 0,
    minimum_stock: 20,
    description: 'Heavy duty titanium coated precision screwdriver set in aluminum case.',
    status: 'Out of Stock',
    created_at: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'prod-5',
    name: 'Noise-Cancelling Headphones Pro',
    sku: 'EL-AUD-005',
    category: 'Electronics',
    purchase_price: 150.00,
    selling_price: 299.99,
    current_stock: 22,
    minimum_stock: 8,
    description: 'Active hybrid noise cancelling over-ear headphones with 40-hour battery.',
    status: 'In Stock',
    created_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'prod-6',
    name: 'Bamboo Standing Desk',
    sku: 'OF-DSK-006',
    category: 'Office Supplies',
    purchase_price: 250.00,
    selling_price: 450.00,
    current_stock: 12,
    minimum_stock: 8,
    description: 'Electric height adjustable desk with dual motors and memory preset keys.',
    status: 'In Stock',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'prod-7',
    name: 'Wireless Mechanical Keyboard',
    sku: 'EL-KEY-007',
    category: 'Electronics',
    purchase_price: 45.00,
    selling_price: 89.99,
    current_stock: 35,
    minimum_stock: 12,
    description: 'Hot-swappable tactile mechanical keyboard with multi-device Bluetooth pairing.',
    status: 'In Stock',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'prod-8',
    name: 'Heavy Duty Drill Press 550W',
    sku: 'TL-DRL-008',
    category: 'Industrial Tools',
    purchase_price: 180.00,
    selling_price: 349.99,
    current_stock: 4,
    minimum_stock: 5,
    description: 'Variable speed drill press with digital depth display and laser guide alignment.',
    status: 'Low Stock',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'Sarah Connor',
    email: 'sarah.c@cyberdyne.org',
    phone: '+1 (555) 382-9011',
    address: '4234 Tech Way, Los Angeles, CA',
    notes: 'Prefers express shipping. Enterprise client buying monitors and furniture.',
    created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cust-2',
    name: 'Bruce Wayne',
    email: 'bruce@waynecorp.com',
    phone: '+1 (555) 888-0000',
    address: '1007 Mountain Drive, Gotham City, NJ',
    notes: 'Premium account. Always bills via corporate expense lines.',
    created_at: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cust-3',
    name: 'Tony Stark',
    email: 'tony@starkindustries.com',
    phone: '+1 (555) 468-6879',
    address: '10880 Malibu Point, Malibu, CA',
    notes: 'Highly technical buyer. Orders precision tools and laboratory components.',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'cust-4',
    name: 'Peter Parker',
    email: 'peter@dailybugle.net',
    phone: '+1 (555) 774-3379',
    address: '20 Ingram St, Forest Hills, NY',
    notes: 'Freelance budget. Frequently buys accessories and lamps.',
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const mockSuppliers: Supplier[] = [
  {
    id: 'supp-1',
    name: 'Nexus Electronics Corp',
    email: 'orders@nexuselectronics.com',
    phone: '+1 (800) 555-0199',
    address: 'Silicon Tower, Floor 14, San Jose, CA',
    company_name: 'Nexus Electronics',
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'supp-2',
    name: 'Apex Woodworks Co.',
    email: 'sales@apexwood.com',
    phone: '+1 (800) 555-0144',
    address: '89 Timber Boulevard, Portland, OR',
    company_name: 'Apex Woodworks',
    created_at: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'supp-3',
    name: 'Stark Precision Foundry',
    email: 'supply@starkfoundry.com',
    phone: '+1 (800) 555-0182',
    address: '99 Reactor Road, Los Angeles, CA',
    company_name: 'Stark Foundry',
    created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Seed initial transaction history for rich charts (last 30 days)
export const mockPurchases: Purchase[] = [
  {
    id: 'purch-1',
    supplier_id: 'supp-1',
    supplier_name: 'Nexus Electronics Corp',
    date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    total_amount: 5475.00,
    items: [
      { id: 'pi-1', purchase_id: 'purch-1', product_id: 'prod-1', quantity: 50, unit_cost: 24.50, total_amount: 1225.00 },
      { id: 'pi-2', purchase_id: 'purch-1', product_id: 'prod-3', quantity: 10, unit_cost: 320.00, total_amount: 3200.00 },
      { id: 'pi-3', purchase_id: 'purch-1', product_id: 'prod-7', quantity: 23, unit_cost: 45.00, total_amount: 1050.00 }
    ],
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'purch-2',
    supplier_id: 'supp-2',
    supplier_name: 'Apex Woodworks Co.',
    date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    total_amount: 4700.00,
    items: [
      { id: 'pi-4', purchase_id: 'purch-2', product_id: 'prod-2', quantity: 10, unit_cost: 110.00, total_amount: 1100.00 },
      { id: 'pi-5', purchase_id: 'purch-2', product_id: 'prod-6', quantity: 12, unit_cost: 250.00, total_amount: 3600.00 }
    ],
    created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'purch-3',
    supplier_id: 'supp-3',
    supplier_name: 'Stark Precision Foundry',
    date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    total_amount: 720.00,
    items: [
      { id: 'pi-6', purchase_id: 'purch-3', product_id: 'prod-8', quantity: 4, unit_cost: 180.00, total_amount: 720.00 }
    ],
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const mockSales: Sale[] = [
  {
    id: 'sale-1',
    customer_id: 'cust-2',
    customer_name: 'Bruce Wayne',
    date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    discount: 50.00,
    tax: 120.00,
    total_amount: 1719.96,
    items: [
      { id: 'si-1', sale_id: 'sale-1', product_id: 'prod-3', quantity: 2, unit_price: 549.99, total_amount: 1099.98 },
      { id: 'si-2', sale_id: 'sale-1', product_id: 'prod-6', quantity: 1, unit_price: 450.00, total_amount: 450.00 },
      { id: 'si-3', sale_id: 'sale-1', product_id: 'prod-1', quantity: 2, unit_price: 49.99, total_amount: 99.98 }
    ],
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'sale-2',
    customer_id: 'cust-1',
    customer_name: 'Sarah Connor',
    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    discount: 0.00,
    tax: 48.00,
    total_amount: 647.98,
    items: [
      { id: 'si-4', sale_id: 'sale-2', product_id: 'prod-5', quantity: 2, unit_price: 299.99, total_amount: 599.98 }
    ],
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'sale-3',
    customer_id: 'cust-3',
    customer_name: 'Tony Stark',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    discount: 100.00,
    tax: 215.00,
    total_amount: 2914.94,
    items: [
      { id: 'si-5', sale_id: 'sale-3', product_id: 'prod-3', quantity: 4, unit_price: 549.99, total_amount: 2199.96 },
      { id: 'si-6', sale_id: 'sale-3', product_id: 'prod-5', quantity: 2, unit_price: 299.99, total_amount: 599.98 }
    ],
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'sale-4',
    customer_id: 'cust-4',
    customer_name: 'Peter Parker',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    discount: 5.00,
    tax: 15.00,
    total_amount: 199.97,
    items: [
      { id: 'si-7', sale_id: 'sale-4', product_id: 'prod-1', quantity: 2, unit_price: 49.99, total_amount: 99.98 },
      { id: 'si-8', sale_id: 'sale-4', product_id: 'prod-7', quantity: 1, unit_price: 89.99, total_amount: 89.99 }
    ],
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const mockStockMovements: StockMovement[] = [
  {
    id: 'm-1',
    product_id: 'prod-1',
    product_name: 'Quantum Desk Lamp',
    type: 'IN',
    quantity: 50,
    reference_id: 'purch-1',
    notes: 'Received initial purchase order.',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm-2',
    product_id: 'prod-3',
    product_name: 'UltraWide Curved Monitor 34"',
    type: 'IN',
    quantity: 10,
    reference_id: 'purch-1',
    notes: 'Received initial purchase order.',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm-3',
    product_id: 'prod-7',
    product_name: 'Wireless Mechanical Keyboard',
    type: 'IN',
    quantity: 23,
    reference_id: 'purch-1',
    notes: 'Received initial purchase order.',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm-4',
    product_id: 'prod-3',
    product_name: 'UltraWide Curved Monitor 34"',
    type: 'OUT',
    quantity: 2,
    reference_id: 'sale-1',
    notes: 'Sold to Bruce Wayne (Invoice: sale-1).',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm-5',
    product_id: 'prod-6',
    product_name: 'Bamboo Standing Desk',
    type: 'OUT',
    quantity: 1,
    reference_id: 'sale-1',
    notes: 'Sold to Bruce Wayne (Invoice: sale-1).',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm-6',
    product_id: 'prod-1',
    product_name: 'Quantum Desk Lamp',
    type: 'OUT',
    quantity: 2,
    reference_id: 'sale-1',
    notes: 'Sold to Bruce Wayne (Invoice: sale-1).',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm-7',
    product_id: 'prod-2',
    product_name: 'Ergonomic Mesh Chair',
    type: 'IN',
    quantity: 10,
    reference_id: 'purch-2',
    notes: 'Supplier replenishment.',
    created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm-8',
    product_id: 'prod-6',
    product_name: 'Bamboo Standing Desk',
    type: 'IN',
    quantity: 12,
    reference_id: 'purch-2',
    notes: 'Supplier replenishment.',
    created_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm-9',
    product_id: 'prod-5',
    product_name: 'Noise-Cancelling Headphones Pro',
    type: 'OUT',
    quantity: 2,
    reference_id: 'sale-2',
    notes: 'Sold to Sarah Connor (Invoice: sale-2).',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm-10',
    product_id: 'prod-8',
    product_name: 'Heavy Duty Drill Press 550W',
    type: 'IN',
    quantity: 4,
    reference_id: 'purch-3',
    notes: 'Procured equipment tools.',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm-11',
    product_id: 'prod-3',
    product_name: 'UltraWide Curved Monitor 34"',
    type: 'OUT',
    quantity: 4,
    reference_id: 'sale-3',
    notes: 'Sold to Tony Stark (Invoice: sale-3).',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm-12',
    product_id: 'prod-5',
    product_name: 'Noise-Cancelling Headphones Pro',
    type: 'OUT',
    quantity: 2,
    reference_id: 'sale-3',
    notes: 'Sold to Tony Stark (Invoice: sale-3).',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm-13',
    product_id: 'prod-1',
    product_name: 'Quantum Desk Lamp',
    type: 'OUT',
    quantity: 2,
    reference_id: 'sale-4',
    notes: 'Sold to Peter Parker (Invoice: sale-4).',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'm-14',
    product_id: 'prod-7',
    product_name: 'Wireless Mechanical Keyboard',
    type: 'OUT',
    quantity: 1,
    reference_id: 'sale-4',
    notes: 'Sold to Peter Parker (Invoice: sale-4).',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const mockActivityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    user_id: 'user-admin',
    user_name: 'Admin User',
    action: 'USER_LOGIN',
    details: 'Admin logged in from 192.168.1.50',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'log-2',
    user_id: 'user-admin',
    user_name: 'Admin User',
    action: 'CREATE_PRODUCT',
    details: 'Product EL-LMP-001 (Quantum Desk Lamp) was created.',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'log-3',
    user_id: 'user-admin',
    user_name: 'Admin User',
    action: 'CREATE_PURCHASE',
    details: 'Purchase order purch-1 created for supplier Nexus Electronics.',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'log-4',
    user_id: 'user-staff',
    user_name: 'Staff Member',
    action: 'CREATE_SALE',
    details: 'Sale sale-1 checked out for customer Bruce Wayne.',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'log-5',
    user_id: 'user-admin',
    user_name: 'Admin User',
    action: 'UPDATE_PRODUCT',
    details: 'Product OF-CHR-002 (Ergonomic Mesh Chair) updated.',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];
