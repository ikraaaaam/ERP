import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Trash2, 
  X, 
  AlertCircle, 
  Eye,
  Calendar,
  DollarSign,
  ListPlus,
  Printer,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  Pencil
} from 'lucide-react';
import { 
  dbSales, 
  dbCustomers, 
  dbProducts
} from '../services/db';
import type { SessionUser } from '../services/db';
import type { Sale, Customer, Product } from '../types';
import confetti from 'canvas-confetti';

export const Sales: React.FC = () => {
  const { user } = useOutletContext<{ user: SessionUser | null }>();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form State for dynamic checkout
  const [customerId, setCustomerId] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().substring(0, 10));
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [items, setItems] = useState<{ product_id: string; quantity: number; unit_price: number }[]>([
    { product_id: '', quantity: 1, unit_price: 0 }
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [saleList, custList, prodList] = await Promise.all([
        dbSales.list(),
        dbCustomers.list(),
        dbProducts.list()
      ]);
      setSales(saleList);
      setCustomers(custList);
      setProducts(prodList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItemRow = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    const next = [...items];
    next.splice(idx, 1);
    setItems(next);
  };

  const handleItemChange = (idx: number, field: string, val: string | number) => {
    const next = [...items];
    if (field === 'product_id') {
      next[idx].product_id = val as string;
      const prod = products.find(p => p.id === val);
      if (prod) {
        next[idx].unit_price = prod.selling_price;
      }
    } else if (field === 'quantity') {
      next[idx].quantity = Math.max(1, Number(val));
    } else if (field === 'unit_price') {
      next[idx].unit_price = Math.max(0, Number(val));
    }
    setItems(next);
  };

  // Perform stock check helper
  const checkStockSufficiency = (productId: string, quantity: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return true;
    
    // Add back the quantity previously checked out if editing this product in the same sale log
    let previouslySold = 0;
    if (editingSale) {
      const oldItem = editingSale.items?.find(item => item.product_id === productId);
      if (oldItem) previouslySold = oldItem.quantity;
    }
    
    return (prod.current_stock + previouslySold) >= quantity;
  };

  const openAddModal = () => {
    setEditingSale(null);
    setCustomerId('');
    setSaleDate(new Date().toISOString().substring(0, 10));
    setDiscount(0);
    setTax(0);
    setItems([{ product_id: '', quantity: 1, unit_price: 0 }]);
    setIsCreateOpen(true);
  };

  const openEditModal = (s: Sale) => {
    setEditingSale(s);
    setCustomerId(s.customer_id || '');
    setSaleDate(new Date(s.date).toISOString().substring(0, 10));
    setDiscount(s.discount);
    setTax(s.tax);
    setItems(s.items ? s.items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    })) : [{ product_id: '', quantity: 1, unit_price: 0 }]);
    setIsCreateOpen(true);
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(item => item.product_id !== '');
    if (validItems.length === 0) {
      showAlert('error', 'Please add at least one valid product.');
      return;
    }

    // Verify stock availability
    for (const item of validItems) {
      if (!checkStockSufficiency(item.product_id, item.quantity)) {
        const prod = products.find(p => p.id === item.product_id);
        const previouslySold = editingSale?.items?.find(oi => oi.product_id === item.product_id)?.quantity || 0;
        const totalAvail = (prod?.current_stock || 0) + previouslySold;
        showAlert('error', `Insufficient stock for "${prod?.name || 'Item'}". Available: ${totalAvail}, Requested: ${item.quantity}`);
        return;
      }
    }

    try {
      if (editingSale) {
        if (user?.role !== 'Admin') {
          showAlert('error', 'Security Block: Only Admins can modify historical logs.');
          return;
        }
        await dbSales.update(editingSale.id, {
          customer_id: customerId || '',
          date: new Date(saleDate).toISOString(),
          discount,
          tax,
          items: validItems
        });
        showAlert('success', 'Sales invoice successfully updated. Product stocks re-calculated.');
      } else {
        const createdSale = await dbSales.create({
          customer_id: customerId || '', // empty triggers walk-in
          date: new Date(saleDate).toISOString(),
          discount,
          tax,
          items: validItems
        });

        // Celebrate success!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0ea5e9', '#ffffff', '#1e293b']
        });

        showAlert('success', 'Sale successfully checked out. Stock levels automatically reduced.');
        // Automatically open the invoice for previewing/printing
        setTimeout(() => {
          openInvoiceModal(createdSale);
        }, 1000);
      }
      setIsCreateOpen(false);
      setEditingSale(null);
      
      // Reset checkout forms
      setItems([{ product_id: '', quantity: 1, unit_price: 0 }]);
      setDiscount(0);
      setTax(0);
      setCustomerId('');
      
      loadData();
    } catch (err: any) {
      showAlert('error', err.message || 'Checkout failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (user?.role !== 'Admin') {
      showAlert('error', 'Security Block: Only Admins possess permissions to delete transactions.');
      return;
    }
    if (window.confirm('Are you sure you want to permanently delete this sales log? (This will NOT reverse the stock reduction).')) {
      try {
        await dbSales.delete(id);
        showAlert('success', 'Sales log successfully removed.');
        loadData();
      } catch (err: any) {
        showAlert('error', err.message || 'Deletion failed.');
      }
    }
  };

  const openInvoiceModal = async (sale: Sale) => {
    // Resolve complete items with name
    const resolvedItems = sale.items?.map(item => {
      const p = products.find(pr => pr.id === item.product_id);
      return {
        ...item,
        product_name: p ? p.name : (item.product_name || 'Unknown Product')
      };
    });

    const fullSale = {
      ...sale,
      items: resolvedItems
    };

    setSelectedSale(fullSale);
    setIsInvoiceOpen(true);
  };

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  // Filter lists
  const filteredSales = sales.filter(s => 
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    (s.customer_name && s.customer_name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const currentSales = filteredSales.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const getGrandTotal = () => {
    return Math.max(0, getSubtotal() - discount + tax);
  };

  return (
    <div className="space-y-6">
      {/* Alert toast */}
      {alertMsg && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md animate-slide-up
          ${alertMsg.type === 'success' 
            ? 'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400' 
            : 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400'
          }
        `}>
          {alertMsg.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-500" />
          )}
          <span className="text-xs font-semibold">{alertMsg.text}</span>
          <button onClick={() => setAlertMsg(null)} className="ml-2 hover:opacity-75">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales & Billing</h1>
          <p className="text-sm text-muted-foreground">Manage client billing accounts, checkout point of sale, and print premium invoices.</p>
        </div>
        {user?.role === 'Admin' && (
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/15 hover:bg-primary-hover transition-all"
          >
            <Plus className="h-4.5 w-4.5" />
            Point of Sale Checkout
          </button>
        )}
      </div>

      {/* Filters Search */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-premium">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search sales by Invoice, Customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-input bg-muted/20 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      {/* Sales Invoices Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Client Name</th>
                <th className="px-6 py-4">Billing Date</th>
                <th className="px-6 py-4 text-right">Items Count</th>
                <th className="px-6 py-4 text-right">Invoice total</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-muted font-mono" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-32 rounded bg-muted" /></td>
                    <td className="px-6 py-4"><div className="h-3.5 w-20 rounded bg-muted" /></td>
                    <td className="px-6 py-4 text-right"><div className="ml-auto h-4 w-12 rounded bg-muted" /></td>
                    <td className="px-6 py-4 text-right"><div className="ml-auto h-4 w-16 rounded bg-muted" /></td>
                    <td className="px-6 py-4"><div className="mx-auto h-8 w-16 rounded bg-muted" /></td>
                  </tr>
                ))
              ) : currentSales.length > 0 ? (
                currentSales.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-primary text-xs">
                      #{s.id.substring(0, 10).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {s.customer_name || <span className="text-muted-foreground italic text-xs">Walk-in Customer</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(s.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {s.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-green-600 dark:text-green-400">
                      ${s.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openInvoiceModal(s)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                          title="Preview Invoice"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>
                        {user?.role === 'Admin' && (
                          <>
                            <button
                              onClick={() => openEditModal(s)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-all"
                              title="Edit Sales Invoice"
                            >
                              <Pencil className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(s.id)}
                              className="rounded-lg p-1.5 text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all"
                              title="Delete Invoice Log"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No sales invoices generated.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/20">
            <span className="text-xs text-muted-foreground font-semibold">
              Showing page {page} of {totalPages} ({filteredSales.length} invoices)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border bg-card p-1.5 hover:bg-muted disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-border bg-card p-1.5 hover:bg-muted disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {user?.role !== 'Admin' && (
        <div className="flex items-center gap-2 rounded-2xl border border-blue-500/10 bg-blue-500/5 px-4 py-3 text-xs text-blue-700 dark:text-blue-400">
          <Info className="h-4 w-4 shrink-0" />
          <span>You are logged in as a <strong>{user?.role}</strong> profile. Update and delete operations are restricted to Admin profiles.</span>
        </div>
      )}

      {/* POS CHECKOUT / EDIT MODAL */}
      {isCreateOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl animate-slide-up my-auto max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div>
                <h3 className="font-bold text-foreground text-lg">{editingSale ? 'Edit Sales Invoice' : 'Point of Sale Checkout'}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingSale ? 'Modifying this invoice automatically recalculates stock levels.' : 'Draft client items cart. Sales checkout reduces active stocks.'}
                </p>
              </div>
              <button onClick={() => { setIsCreateOpen(false); setEditingSale(null); }} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCheckout} className="space-y-4">
              {/* Customer & Date */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Client Profile</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  >
                    <option value="">-- Anonymous / Walk-in Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Billing Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                    <input
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full rounded-xl border border-input bg-card py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                </div>
              </div>

              {/* Items details table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cart Items</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    <ListPlus className="h-4 w-4" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-2.5">
                  {items.map((item, idx) => {
                    const selectedProd = products.find(p => p.id === item.product_id);
                    const stockSuff = item.product_id ? checkStockSufficiency(item.product_id, item.quantity) : true;
                    
                    return (
                      <div key={idx} className="space-y-1.5 rounded-2xl border border-border/60 p-3 bg-muted/10">
                        <div className="flex gap-2 items-center">
                          {/* Product select */}
                          <div className="flex-1 min-w-[150px]">
                            <select
                              value={item.product_id}
                              onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                              className="w-full rounded-lg border border-input bg-[#1f2937] text-white px-2 py-1.5 text-xs outline-none focus:border-primary"
                            >
                              <option value="">-- Choose Product --</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (Stock: {p.current_stock})</option>
                              ))}
                            </select>
                          </div>

                          {/* Quantity */}
                          <div className="w-20">
                            <input
                              type="number"
                              min="1"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-full rounded-lg border border-input bg-card px-2 py-1.5 text-xs text-right outline-none focus:border-primary"
                            />
                          </div>

                          {/* Price */}
                          <div className="w-28">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Price ($)"
                              value={item.unit_price || ''}
                              onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                              className="w-full rounded-lg border border-input bg-card px-2 py-1.5 text-xs text-right outline-none focus:border-primary"
                            />
                          </div>

                          {/* Row Total */}
                          <div className="w-24 text-right font-semibold text-xs text-foreground px-2">
                            ${(item.quantity * item.unit_price).toFixed(2)}
                          </div>

                          {/* Delete row */}
                          <button
                            type="button"
                            disabled={items.length === 1}
                            onClick={() => handleRemoveItemRow(idx)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Stock alert warning */}
                        {item.product_id && !stockSuff && selectedProd && (
                          <div className="flex items-center gap-1.5 text-[10px] text-rose-500 font-bold">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>
                              Warning: Insufficient inventory. Available: {selectedProd.current_stock + (editingSale?.items?.find(oi => oi.product_id === item.product_id)?.quantity || 0)} units.
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Discount / Tax */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Fixed Discount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discount || ''}
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Fixed Flat Tax ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tax || ''}
                    onChange={(e) => setTax(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              {/* Total calculations Summary */}
              <div className="rounded-2xl border border-border/80 bg-muted/40 p-4 space-y-2 mt-6">
                <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                  <span>Cart Subtotal</span>
                  <span>${getSubtotal().toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-center text-xs font-medium text-rose-500">
                    <span>Discount Deduction</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                    <span>Tax Surcharge</span>
                    <span>+${tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-border/60 pt-2 font-bold text-lg text-green-600 dark:text-green-400">
                  <span>Grand Total</span>
                  <span className="flex items-center">
                    <DollarSign className="h-4.5 w-4.5 shrink-0" />
                    {getGrandTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => { setIsCreateOpen(false); setEditingSale(null); }}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover shadow-md shadow-primary/15"
                >
                  {editingSale ? 'Save Changes' : 'Checkout Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* PROFESSIONAL INVOICE PREVIEW MODAL */}
      {isInvoiceOpen && selectedSale && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto no-print">
          <div className="relative w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl animate-slide-up my-auto max-h-[90vh] overflow-y-auto scrollbar-thin">
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div>
                <h3 className="font-bold text-foreground text-lg">Sales Invoice Document</h3>
                <span className="text-xs text-muted-foreground">Trace billing and download PDF format.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold hover:bg-muted transition-colors"
                >
                  <Printer className="h-4 w-4 text-primary" />
                  Print / Save PDF
                </button>
                <button onClick={() => setIsInvoiceOpen(false)} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* PRINTABLE INVOICE CONTENT */}
            <div id="printable-invoice" className="p-4 space-y-6 print-card text-foreground">
              {/* Header: Company vs Invoice */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-primary tracking-tight">Code Bondhu IT</h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5">IT Solutions & Enterprise ERP</p>
                  <p className="text-[10px] text-muted-foreground">Dhaka, Bangladesh</p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Invoice Receipt</h3>
                  <span className="text-sm font-mono font-bold text-foreground mt-1 block">
                    #{selectedSale.id.substring(0, 8).toUpperCase()}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Date: {new Date(selectedSale.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                </div>
              </div>

              {/* Client Bill To */}
              <div className="border-t border-b border-border py-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Bill To:</span>
                  <span className="text-sm font-bold text-foreground mt-1 block">
                    {selectedSale.customer_name || 'Walk-in Customer'}
                  </span>
                  <span className="text-xs text-muted-foreground block">Cash Transactions</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Payment Status:</span>
                  <span className="inline-block mt-1 text-xs font-bold text-green-600 bg-green-500/10 rounded-md px-2.5 py-0.5">
                    PAID IN FULL
                  </span>
                </div>
              </div>

              {/* Table of items */}
              <div className="rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-3">Product Description</th>
                      <th className="px-4 py-3 text-right">Quantity</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium text-foreground">
                    {selectedSale.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-semibold block">{item.product_name || 'Unknown Product'}</span>
                            <span className="text-[9px] text-muted-foreground">ID: #{item.product_id.substring(0, 6)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">${item.unit_price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-bold">${item.total_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Math breakdown */}
              <div className="w-full flex justify-end">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground font-medium">
                    <span>Subtotal Cost</span>
                    <span>
                      ${(selectedSale.total_amount + selectedSale.discount - selectedSale.tax).toFixed(2)}
                    </span>
                  </div>
                  {selectedSale.discount > 0 && (
                    <div className="flex justify-between text-rose-500 font-medium">
                      <span>Discount deduction</span>
                      <span>-${selectedSale.discount.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedSale.tax > 0 && (
                    <div className="flex justify-between text-muted-foreground font-medium">
                      <span>Tax surcharge</span>
                      <span>+${selectedSale.tax.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 font-bold text-sm text-green-600 dark:text-green-400">
                    <span>Grand Total Paid</span>
                    <span>${selectedSale.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Footer clause */}
              <div className="text-center border-t border-border pt-4 mt-6">
                <p className="text-[10px] text-muted-foreground font-semibold">Thank you for your business!</p>
                <p className="text-[9px] text-muted-foreground/60 mt-0.5">For billing support, contact accounts@codebondhu.com</p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Global PRINT ONLY layout styles (invisible on screen) */}
      {isInvoiceOpen && selectedSale && createPortal(
        <div className="hidden print:block p-8 space-y-6 print-card text-black bg-white min-h-screen">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-black">Code Bondhu IT</h2>
              <p className="text-[10px] text-gray-500">IT Solutions & Enterprise ERP</p>
              <p className="text-[10px] text-gray-500">Dhaka, Bangladesh</p>
            </div>
            <div className="text-right">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Invoice Receipt</h3>
              <span className="text-sm font-mono font-bold text-black block">
                #{selectedSale.id.substring(0, 8).toUpperCase()}
              </span>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Date: {new Date(selectedSale.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
            </div>
          </div>

          <div className="border-t border-b border-gray-200 py-4 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Bill To:</span>
              <span className="text-sm font-bold text-black mt-1 block">
                {selectedSale.customer_name || 'Walk-in Customer'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Payment Status:</span>
              <span className="inline-block mt-1 text-xs font-bold text-black">
                PAID IN FULL
              </span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-xs text-black">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 font-bold">
                  <th className="px-4 py-3">Product Description</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-medium">
                {selectedSale.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <span className="font-semibold block">{item.product_name}</span>
                      <span className="text-[9px] text-gray-500">ID: #{item.product_id.substring(0, 6)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">${item.unit_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold">${item.total_amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="w-full flex justify-end">
            <div className="w-64 space-y-1.5 text-xs text-black">
              <div className="flex justify-between font-medium">
                <span>Subtotal Cost</span>
                <span>
                  ${(selectedSale.total_amount + selectedSale.discount - selectedSale.tax).toFixed(2)}
                </span>
              </div>
              {selectedSale.discount > 0 && (
                <div className="flex justify-between font-medium">
                  <span>Discount deduction</span>
                  <span>-${selectedSale.discount.toFixed(2)}</span>
                </div>
              )}
              {selectedSale.tax > 0 && (
                <div className="flex justify-between font-medium">
                  <span>Tax surcharge</span>
                  <span>+${selectedSale.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-sm">
                <span>Grand Total Paid</span>
                <span>${selectedSale.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="text-center border-t border-gray-200 pt-4 mt-6">
            <p className="text-[10px] text-gray-500 font-semibold">Thank you for your business!</p>
            <p className="text-[9px] text-gray-400 mt-0.5">Code Bondhu IT billing portal | accounts@codebondhu.com</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Sales;
