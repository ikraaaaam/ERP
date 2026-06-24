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
  User,
  ListPlus,
  ChevronLeft,
  ChevronRight,
  Info,
  Pencil
} from 'lucide-react';
import { 
  dbPurchases, 
  dbSuppliers, 
  dbProducts,
} from '../services/db';
import type { SessionUser } from '../services/db';
import type { Purchase, Supplier, Product } from '../types';

export const Purchases: React.FC = () => {
  const { user } = useOutletContext<{ user: SessionUser | null }>();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form State for dynamic acquisition
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().substring(0, 10));
  const [items, setItems] = useState<{ product_id: string; quantity: number; unit_cost: number }[]>([
    { product_id: '', quantity: 1, unit_cost: 0 }
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [purchList, suppList, prodList] = await Promise.all([
        dbPurchases.list(),
        dbSuppliers.list(),
        dbProducts.list()
      ]);
      setPurchases(purchList);
      setSuppliers(suppList);
      setProducts(prodList);
      if (suppList.length > 0 && !supplierId) setSupplierId(suppList[0].id);
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
    setItems([...items, { product_id: '', quantity: 1, unit_cost: 0 }]);
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
      // Pre-fill cost price from catalog
      const prod = products.find(p => p.id === val);
      if (prod) {
        next[idx].unit_cost = prod.purchase_price;
      }
    } else if (field === 'quantity') {
      next[idx].quantity = Math.max(1, Number(val));
    } else if (field === 'unit_cost') {
      next[idx].unit_cost = Math.max(0, Number(val));
    }
    setItems(next);
  };

  const openAddModal = () => {
    setEditingPurchase(null);
    setSupplierId(suppliers.length > 0 ? suppliers[0].id : '');
    setPurchaseDate(new Date().toISOString().substring(0, 10));
    setItems([{ product_id: '', quantity: 1, unit_cost: 0 }]);
    setIsCreateOpen(true);
  };

  const openEditModal = (p: Purchase) => {
    setEditingPurchase(p);
    setSupplierId(p.supplier_id);
    setPurchaseDate(new Date(p.date).toISOString().substring(0, 10));
    setItems(p.items ? p.items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_cost: item.unit_cost
    })) : [{ product_id: '', quantity: 1, unit_cost: 0 }]);
    setIsCreateOpen(true);
  };

  const handleSubmitAcquisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      showAlert('error', 'Select a supplier.');
      return;
    }

    // Filter out rows with unselected products
    const validItems = items.filter(item => item.product_id !== '');
    if (validItems.length === 0) {
      showAlert('error', 'Select at least one valid product.');
      return;
    }

    try {
      if (editingPurchase) {
        if (user?.role !== 'Admin') {
          showAlert('error', 'Security Block: Only Admins can modify historical logs.');
          return;
        }
        await dbPurchases.update(editingPurchase.id, {
          supplier_id: supplierId,
          date: new Date(purchaseDate).toISOString(),
          items: validItems
        });
        showAlert('success', 'Purchase order updated. Catalog stocks automatically recalculated.');
      } else {
        await dbPurchases.create({
          supplier_id: supplierId,
          date: new Date(purchaseDate).toISOString(),
          items: validItems
        });
        showAlert('success', 'Purchase order created. Product stocks automatically incremented.');
      }
      setIsCreateOpen(false);
      setEditingPurchase(null);
      // Reset form
      setItems([{ product_id: '', quantity: 1, unit_cost: 0 }]);
      loadData();
    } catch (err: any) {
      showAlert('error', err.message || 'Operation failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (user?.role !== 'Admin') {
      showAlert('error', 'Security Block: Only Admins possess permissions to delete transactions.');
      return;
    }
    if (window.confirm('Delete this purchase order record? (This will NOT reverse the stock levels).')) {
      try {
        await dbPurchases.delete(id);
        showAlert('success', 'Purchase record deleted.');
        loadData();
      } catch (err: any) {
        showAlert('error', err.message || 'Deletion failed.');
      }
    }
  };

  const openViewModal = (p: Purchase) => {
    setSelectedPurchase(p);
    setIsViewOpen(true);
  };

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Filter list
  const filteredPurchases = purchases.filter(p => 
    p.id.toLowerCase().includes(search.toLowerCase()) ||
    (p.supplier_name && p.supplier_name.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);
  const currentPurchases = filteredPurchases.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const getGrandTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
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
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-xs font-semibold">{alertMsg.text}</span>
          <button onClick={() => setAlertMsg(null)} className="ml-2 hover:opacity-75">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Logs</h1>
          <p className="text-sm text-muted-foreground">Register inventory replenishment logs and trace product acquisitions.</p>
        </div>
        {user?.role === 'Admin' && (
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/15 hover:bg-primary-hover transition-all"
          >
            <Plus className="h-4.5 w-4.5" />
            Create Purchase PO
          </button>
        )}
      </div>

      {/* Filters Search */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-premium">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search purchase logs by PO, supplier..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-input bg-muted/20 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      {/* Purchases log table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">PO Document ID</th>
                <th className="px-6 py-4">Supplier Vendor</th>
                <th className="px-6 py-4">Purchase Date</th>
                <th className="px-6 py-4 text-right">Items Count</th>
                <th className="px-6 py-4 text-right">Acquisition Cost</th>
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
              ) : currentPurchases.length > 0 ? (
                currentPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-primary text-xs">
                      #{p.id.substring(0, 10).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">{p.supplier_name}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(p.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {p.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-rose-500">
                      ${p.total_amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openViewModal(p)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                          title="View Details"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>
                        {user?.role === 'Admin' && (
                          <>
                            <button
                              onClick={() => openEditModal(p)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-primary transition-all"
                              title="Edit PO Order"
                            >
                              <Pencil className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="rounded-lg p-1.5 text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all"
                              title="Delete Log"
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
                    No purchase history found.
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
              Showing page {page} of {totalPages} ({filteredPurchases.length} logs)
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

      {/* CREATE/EDIT PURCHASE MODAL */}
      {isCreateOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl animate-slide-up my-auto max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div>
                <h3 className="font-bold text-foreground text-lg">{editingPurchase ? 'Edit Purchase Order' : 'Purchase Order Acquisition'}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {editingPurchase ? 'Modifying this order automatically recalculates catalog stocks.' : 'Creating this order increases catalog stock and registers stock movements.'}
                </p>
              </div>
              <button onClick={() => { setIsCreateOpen(false); setEditingPurchase(null); }} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAcquisition} className="space-y-4">
              {/* Supplier & Date */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Supplier Vendor</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.company_name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Acquisition Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground" />
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full rounded-xl border border-input bg-card py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Items Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Purchase Line Items</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    <ListPlus className="h-4 w-4" />
                    Add Row
                  </button>
                </div>

                <div className="space-y-2.5">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center rounded-2xl border border-border/60 p-3 bg-muted/10">
                      {/* Product select */}
                      <div className="flex-1 min-w-[150px]">
                        <select
                           value={item.product_id}
                          onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                          className="w-full rounded-lg border border-input bg-[#1f2937] text-white px-2 py-1.5 text-xs outline-none focus:border-primary"
                        >
                          <option value="">-- Choose Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
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

                      {/* Cost */}
                      <div className="w-28">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Cost ($)"
                          value={item.unit_cost || ''}
                          onChange={(e) => handleItemChange(idx, 'unit_cost', e.target.value)}
                          className="w-full rounded-lg border border-input bg-card px-2 py-1.5 text-xs text-right outline-none focus:border-primary"
                        />
                      </div>

                      {/* Row Total */}
                      <div className="w-24 text-right font-semibold text-xs text-foreground px-2">
                        ${(item.quantity * item.unit_cost).toFixed(2)}
                      </div>

                      {/* Delete Row button */}
                      <button
                        type="button"
                        disabled={items.length === 1}
                        onClick={() => handleRemoveItemRow(idx)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation summary */}
              <div className="flex justify-between items-center rounded-2xl bg-muted/40 p-4 border border-border/80 mt-6">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">Acquisition Valuation</span>
                  <span className="text-xs text-muted-foreground">{items.filter(item => item.product_id !== '').length} items loaded</span>
                </div>
                <div className="flex items-center gap-1 font-bold text-xl text-rose-500">
                  <DollarSign className="h-5 w-5 shrink-0" />
                  <span>{getGrandTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => { setIsCreateOpen(false); setEditingPurchase(null); }}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover shadow-md shadow-primary/15"
                >
                  {editingPurchase ? 'Save Changes' : 'Register Acquisition'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* VIEW PURCHASE MODAL */}
      {isViewOpen && selectedPurchase && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl animate-slide-up my-auto max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div>
                <h3 className="font-bold text-foreground text-lg">Purchase Order Details</h3>
                <span className="text-xs font-mono text-muted-foreground">PO ID: #{selectedPurchase.id}</span>
              </div>
              <button onClick={() => setIsViewOpen(false)} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Meta logs */}
              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-muted/20 p-4 border border-border/40">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Supplier Vendor</span>
                  <div className="flex items-center gap-1.5 mt-1 font-semibold text-foreground">
                    <User className="h-4 w-4 text-primary shrink-0" />
                    <span>{selectedPurchase.supplier_name}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Transaction Date</span>
                  <div className="flex items-center gap-1.5 mt-1 font-semibold text-foreground">
                    <Calendar className="h-4 w-4 text-primary shrink-0" />
                    <span>{new Date(selectedPurchase.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                  </div>
                </div>
              </div>

              {/* Items grid list */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">Items List</span>
                <div className="rounded-2xl border border-border overflow-hidden bg-card max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border font-bold text-muted-foreground">
                        <th className="px-4 py-2.5">Product Title</th>
                        <th className="px-4 py-2.5 text-right">Quantity</th>
                        <th className="px-4 py-2.5 text-right">Cost Price</th>
                        <th className="px-4 py-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-medium text-foreground">
                      {selectedPurchase.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2">{item.product_name || `Product ID: ${item.product_id}`}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">${item.unit_cost.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right">${item.total_amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial calculations */}
              <div className="flex justify-between items-center rounded-2xl bg-muted/40 p-4 border border-border/80">
                <span className="text-xs font-bold text-foreground">Grand Total Cost</span>
                <span className="text-lg font-bold text-rose-500">${selectedPurchase.total_amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border mt-6">
              <button
                onClick={() => setIsViewOpen(false)}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover shadow-md shadow-primary/10"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Purchases;
