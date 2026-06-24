import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Search, 
  Calendar,
  Package, 
  Users, 
  Truck, 
  ShoppingBag, 
  BarChart3,
  Download
} from 'lucide-react';
import { 
  dbProducts, 
  dbCustomers, 
  dbSuppliers, 
  dbPurchases, 
  dbSales 
} from '../services/db';
import type { Product, Customer, Supplier, Purchase, Sale } from '../types';

type ReportTab = 'products' | 'customers' | 'suppliers' | 'sales' | 'purchases';

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('products');
  const [loading, setLoading] = useState(true);

  // Raw dataset
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // Search & date filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodList, custList, suppList, purchList, saleList] = await Promise.all([
        dbProducts.list(),
        dbCustomers.list(),
        dbSuppliers.list(),
        dbPurchases.list(),
        dbSales.list()
      ]);
      setProducts(prodList);
      setCustomers(custList);
      setSuppliers(suppList);
      setPurchases(purchList);
      setSales(saleList);
    } catch (err) {
      console.error('Error compiling analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format Helper
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, { dateStyle: 'medium' });
  };

  // --- TABULAR DATA COMPILATION & FILTERING ---

  // 1. Products compile
  const compiledProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  // 2. Customers compile (Includes purchase count & total volume)
  const compiledCustomers = customers.map(c => {
    const clientSales = sales.filter(s => s.customer_id === c.id);
    const purchaseCount = clientSales.length;
    const totalSpent = clientSales.reduce((sum, s) => sum + s.total_amount, 0);
    return {
      ...c,
      purchaseCount,
      totalSpent
    };
  }).filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  // 3. Suppliers compile (Includes orders count & total cost volume)
  const compiledSuppliers = suppliers.map(s => {
    const vendorPurchases = purchases.filter(p => p.supplier_id === s.id);
    const ordersCount = vendorPurchases.length;
    const totalCost = vendorPurchases.reduce((sum, p) => sum + p.total_amount, 0);
    return {
      ...s,
      ordersCount,
      totalCost
    };
  }).filter(s => 
    s.company_name.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  // 4. Sales compile (Filtered by date range & search)
  const compiledSales = sales.filter(s => {
    const saleTime = new Date(s.date).getTime();
    const startLimit = new Date(startDate).getTime();
    // extend end date to end of day
    const endLimit = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;
    
    const matchDate = saleTime >= startLimit && saleTime <= endLimit;
    const matchSearch = s.id.toLowerCase().includes(search.toLowerCase()) ||
                        (s.customer_name && s.customer_name.toLowerCase().includes(search.toLowerCase()));

    return matchDate && matchSearch;
  });

  // 5. Purchases compile (Filtered by date range & search)
  const compiledPurchases = purchases.filter(p => {
    const purchTime = new Date(p.date).getTime();
    const startLimit = new Date(startDate).getTime();
    const endLimit = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;

    const matchDate = purchTime >= startLimit && purchTime <= endLimit;
    const matchSearch = p.id.toLowerCase().includes(search.toLowerCase()) ||
                        (p.supplier_name && p.supplier_name.toLowerCase().includes(search.toLowerCase()));

    return matchDate && matchSearch;
  });

  // Total summary calculators
  const salesSumVolume = compiledSales.reduce((sum, s) => sum + s.total_amount, 0);
  const purchasesSumVolume = compiledPurchases.reduce((sum, p) => sum + p.total_amount, 0);

  // --- EXPORT TO CSV ENGINE ---
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `ERP_Nexus_${activeTab}_report.csv`;

    switch (activeTab) {
      case 'products':
        headers = ['Product Name', 'SKU', 'Category', 'Cost Price ($)', 'Selling Price ($)', 'Current Stock', 'Min Stock', 'Valuation at Cost ($)', 'Valuation at Retail ($)', 'Status'];
        rows = compiledProducts.map(p => [
          p.name, p.sku, p.category, p.purchase_price.toFixed(2), p.selling_price.toFixed(2), 
          p.current_stock.toString(), p.minimum_stock.toString(), 
          (p.current_stock * p.purchase_price).toFixed(2), 
          (p.current_stock * p.selling_price).toFixed(2), p.status
        ]);
        break;

      case 'customers':
        headers = ['Customer Name', 'Email', 'Phone', 'Address', 'Orders Checked Out', 'Total Value Spent ($)'];
        rows = compiledCustomers.map(c => [
          c.name, c.email, c.phone, c.address, c.purchaseCount.toString(), c.totalSpent.toFixed(2)
        ]);
        break;

      case 'suppliers':
        headers = ['Company Name', 'Contact Agent', 'Email', 'Phone', 'Orders Dispatched', 'Total Cost Volume ($)'];
        rows = compiledSuppliers.map(s => [
          s.company_name, s.name, s.email, s.phone, s.ordersCount.toString(), s.totalCost.toFixed(2)
        ]);
        break;

      case 'sales':
        headers = ['Invoice ID', 'Customer Name', 'Date', 'Discount ($)', 'Tax Surcharge ($)', 'Grand Total ($)'];
        rows = compiledSales.map(s => [
          s.id, s.customer_name || 'Walk-in', s.date, s.discount.toFixed(2), s.tax.toFixed(2), s.total_amount.toFixed(2)
        ]);
        break;

      case 'purchases':
        headers = ['PO ID', 'Supplier Vendor', 'Date', 'Total Cost ($)'];
        rows = compiledPurchases.map(p => [
          p.id, p.supplier_name || 'Unknown', p.date, p.total_amount.toFixed(2)
        ]);
        break;
    }

    // Escape CSV values
    const escapeCSV = (str: string) => {
      if (str === null || str === undefined) return '';
      const escaped = str.replace(/"/g, '""');
      if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
        return `"${escaped}"`;
      }
      return escaped;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics & Financial Reports</h1>
          <p className="text-sm text-muted-foreground">Compile audit worksheets, export corporate ledgers, and check performance indexes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4 text-primary shrink-0" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white hover:bg-primary-hover shadow-md shadow-primary/10 transition-colors"
          >
            <Printer className="h-4 w-4 shrink-0" />
            Print Report Sheet
          </button>
        </div>
      </div>

      {/* Tabs list menu */}
      <div className="flex border-b border-border no-print overflow-x-auto space-x-1.5 scrollbar-thin">
        {[
          { id: 'products' as const, label: 'Products Stock', icon: Package },
          { id: 'customers' as const, label: 'CRM Portals', icon: Users },
          { id: 'suppliers' as const, label: 'Supplier Index', icon: Truck },
          { id: 'sales' as const, label: 'Sales Invoices', icon: ShoppingBag },
          { id: 'purchases' as const, label: 'Purchase Ledger', icon: BarChart3 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearch(''); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap
              ${activeTab === tab.id 
                ? 'border-primary text-primary font-bold' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <tab.icon className="h-4.5 w-4.5 shrink-0" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Options */}
      <div className="grid gap-4 sm:grid-cols-3 rounded-2xl border border-border bg-card p-4 shadow-premium no-print">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={`Filter ${activeTab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-input bg-muted/20 py-2.5 pl-10 pr-4 text-xs outline-none focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
          />
        </div>

        {/* Date Filters (Only shown for transaction tabs) */}
        {(activeTab === 'sales' || activeTab === 'purchases') ? (
          <>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-input bg-muted/20 py-2 pl-10 pr-4 text-xs outline-none focus:border-primary focus:bg-card"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-input bg-muted/20 py-2 pl-10 pr-4 text-xs outline-none focus:border-primary focus:bg-card"
              />
            </div>
          </>
        ) : (
          <div className="sm:col-span-2 flex items-center justify-end text-xs text-muted-foreground italic font-medium px-4">
            * Tab matches list indexes dynamically.
          </div>
        )}
      </div>

      {/* Valuation / Financial Aggregations details (Shown for purchases / sales) */}
      <div className="no-print">
        {activeTab === 'sales' && (
          <div className="rounded-2xl border border-border/60 bg-green-500/5 p-4 flex items-center justify-between border-l-4 border-l-green-500">
            <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">Aggregate Sales Volume</span>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">${salesSumVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {activeTab === 'purchases' && (
          <div className="rounded-2xl border border-border/60 bg-rose-500/5 p-4 flex items-center justify-between border-l-4 border-l-rose-500">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wide">Aggregate Purchase Cost</span>
            <span className="text-lg font-bold text-rose-500">${purchasesSumVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>

      {/* PRINT BANNER WRAPPER (Visible only when print triggers) */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">ERP Nexus Ledger Report Sheet</h1>
        <p className="text-xs text-gray-500 mt-1">Generated: {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })} | Tab: {activeTab.toUpperCase()}</p>
        {(activeTab === 'sales' || activeTab === 'purchases') && (
          <p className="text-xs text-gray-500">Date boundaries: {formatDate(startDate)} to {formatDate(endDate)}</p>
        )}
      </div>

      {/* REPORT CONTENT GRID TABLES */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-premium print-card">
        {loading && (
          <div className="p-12 text-center text-muted-foreground animate-pulse flex flex-col items-center gap-3">
            <BarChart3 className="h-10 w-10 text-primary" />
            <p className="font-semibold text-sm">Compiling statistical records...</p>
          </div>
        )}

        {!loading && activeTab === 'products' && (
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold">
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4">SKU</th>
                <th className="px-6 py-4 text-right">Cost</th>
                <th className="px-6 py-4 text-right">Retail</th>
                <th className="px-6 py-4 text-right">Stock</th>
                <th className="px-6 py-4 text-right">Asset Cost</th>
                <th className="px-6 py-4 text-right">Asset Retail</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium text-foreground">
              {compiledProducts.map(p => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-6 py-4">
                    <span className="font-semibold block">{p.name}</span>
                    <span className="text-[10px] text-muted-foreground">{p.category}</span>
                  </td>
                  <td className="px-6 py-4 font-mono">{p.sku}</td>
                  <td className="px-6 py-4 text-right">${p.purchase_price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">${p.selling_price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">{p.current_stock}</td>
                  <td className="px-6 py-4 text-right text-muted-foreground">${(p.current_stock * p.purchase_price).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-bold text-primary">${(p.current_stock * p.selling_price).toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5
                      ${p.status === 'In Stock' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : ''}
                      ${p.status === 'Low Stock' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : ''}
                      ${p.status === 'Out of Stock' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : ''}
                    `}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && activeTab === 'customers' && (
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold">
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4 text-right">Invoices Paid</th>
                <th className="px-6 py-4 text-right">Total Revenue Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium text-foreground">
              {compiledCustomers.map(c => (
                <tr key={c.id} className="hover:bg-muted/20">
                  <td className="px-6 py-4 font-semibold">{c.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{c.email || 'N/A'}</td>
                  <td className="px-6 py-4 text-muted-foreground">{c.phone || 'N/A'}</td>
                  <td className="px-6 py-4 text-right">{c.purchaseCount}</td>
                  <td className="px-6 py-4 text-right font-bold text-green-600 dark:text-green-400">${c.totalSpent.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && activeTab === 'suppliers' && (
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold">
                <th className="px-6 py-4">Company Name</th>
                <th className="px-6 py-4">Agent Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4 text-right">Acquisition Orders</th>
                <th className="px-6 py-4 text-right">Total Cost Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium text-foreground">
              {compiledSuppliers.map(s => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-6 py-4 font-semibold">{s.company_name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{s.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{s.email || 'N/A'}</td>
                  <td className="px-6 py-4 text-right">{s.ordersCount}</td>
                  <td className="px-6 py-4 text-right font-bold text-rose-500">${s.totalCost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && activeTab === 'sales' && (
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold">
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Billing Date</th>
                <th className="px-6 py-4 text-right">Discount</th>
                <th className="px-6 py-4 text-right">Tax</th>
                <th className="px-6 py-4 text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium text-foreground">
              {compiledSales.map(s => (
                <tr key={s.id} className="hover:bg-muted/20">
                  <td className="px-6 py-4 font-mono font-bold">#{s.id.substring(0, 10).toUpperCase()}</td>
                  <td className="px-6 py-4">{s.customer_name || <span className="italic text-muted-foreground">Walk-in</span>}</td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDate(s.date)}</td>
                  <td className="px-6 py-4 text-right text-rose-500">-${s.discount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right text-muted-foreground">+${s.tax.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-bold text-green-600 dark:text-green-400">${s.total_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && activeTab === 'purchases' && (
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold">
                <th className="px-6 py-4">PO ID</th>
                <th className="px-6 py-4">Supplier Vendor</th>
                <th className="px-6 py-4">Purchase Date</th>
                <th className="px-6 py-4 text-right">Acquisition Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium text-foreground">
              {compiledPurchases.map(p => (
                <tr key={p.id} className="hover:bg-muted/20">
                  <td className="px-6 py-4 font-mono font-bold">#{p.id.substring(0, 10).toUpperCase()}</td>
                  <td className="px-6 py-4 font-semibold">{p.supplier_name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{formatDate(p.date)}</td>
                  <td className="px-6 py-4 text-right font-bold text-rose-500">${p.total_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
export default Reports;
