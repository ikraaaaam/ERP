import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History as HistoryIcon, 
  AlertTriangle, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Plus
} from 'lucide-react';
import { 
  dbProducts, 
  dbStockMovements 
} from '../services/db';
import type { Product, StockMovement } from '../types';

export const Inventory: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'ledger' | 'low-stock'>('ledger');

  // Search filter
  const [search, setSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodList, moveList] = await Promise.all([
        dbProducts.list(),
        dbStockMovements.list()
      ]);
      setProducts(prodList);
      setMovements(moveList);
    } catch (err) {
      console.error('Error loading logistics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-semibold">Auditing warehouse records...</p>
        </div>
      </div>
    );
  }

  // Logistics aggregations
  const totalValuationCost = products.reduce((sum, p) => sum + (p.current_stock * p.purchase_price), 0);
  const totalValuationRetail = products.reduce((sum, p) => sum + (p.current_stock * p.selling_price), 0);
  const potentialEarnings = Math.max(0, totalValuationRetail - totalValuationCost);

  const lowStockCount = products.filter(p => p.current_stock <= p.minimum_stock).length;
  const outOfStockCount = products.filter(p => p.current_stock === 0).length;

  // Filter Stock Ledger movements
  const filteredMovements = movements.filter(m => 
    (m.product_name && m.product_name.toLowerCase().includes(search.toLowerCase())) ||
    m.product_id.toLowerCase().includes(search.toLowerCase()) ||
    m.reference_id.toLowerCase().includes(search.toLowerCase()) ||
    (m.notes && m.notes.toLowerCase().includes(search.toLowerCase()))
  );

  // Filter Low Stock warnings
  const lowStockProducts = products
    .filter(p => p.current_stock <= p.minimum_stock)
    .filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );

  // Resolve active items list for current view & pagination
  const activeItems = activeTab === 'ledger' ? filteredMovements : lowStockProducts;
  const totalPages = Math.ceil(activeItems.length / itemsPerPage);
  const paginatedItems = activeItems.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logistics & Inventory</h1>
          <p className="text-sm text-muted-foreground">Audit stock ledger histories, review valuations, and check low inventory markers.</p>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Ledger
        </button>
      </div>

      {/* Valuation Metrics Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Cost valuation */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-premium">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Valuation at Cost</span>
            <DollarSign className="h-4.5 w-4.5 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mt-4">${totalValuationCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-xs text-muted-foreground mt-1">Capital locked in stock</p>
        </div>

        {/* Retail valuation */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-premium">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Valuation at Retail</span>
            <TrendingUp className="h-4.5 w-4.5 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mt-4">${totalValuationRetail.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-xs text-muted-foreground mt-1">Expected sales revenue</p>
        </div>

        {/* Potential Profit */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-premium">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Potential Profit</span>
            <DollarSign className="h-4.5 w-4.5 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mt-4">${potentialEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-xs text-muted-foreground mt-1">Unrealized retail margins</p>
        </div>

        {/* Low Stock Warnings */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-premium">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mt-4">{lowStockCount} Alert(s)</h3>
          <p className="text-xs text-muted-foreground mt-1">Includes {outOfStockCount} out of stock</p>
        </div>
      </div>

      {/* Structured Tabbed Section */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-premium flex flex-col">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border bg-muted/20 px-6 py-2 gap-3">
          <div className="flex border-b sm:border-b-0 border-border">
            <button
              onClick={() => { setActiveTab('ledger'); setSearch(''); setPage(1); }}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 -mb-[2px] sm:-mb-[10px] ${
                activeTab === 'ledger'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <HistoryIcon className="h-4 w-4" />
                <span>Warehouse Movements Ledger</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-medium">
                  {movements.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => { setActiveTab('low-stock'); setSearch(''); setPage(1); }}
              className={`ml-4 px-4 py-3 text-sm font-semibold border-b-2 transition-all duration-200 -mb-[2px] sm:-mb-[10px] ${
                activeTab === 'low-stock'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Low Stock Warnings</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  lowStockCount > 0 
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {lowStockCount}
                </span>
              </div>
            </button>
          </div>

          {/* Search Inputs */}
          <div className="relative w-full sm:w-64 mb-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={activeTab === 'ledger' ? 'Search ledger logs...' : 'Search low stock items...'}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-input bg-card py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </div>

        {/* Tab content view */}
        <div className="overflow-x-auto">
          {activeTab === 'ledger' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-4">Status Type</th>
                  <th className="px-6 py-4">Reference ID</th>
                  <th className="px-6 py-4">Product Title</th>
                  <th className="px-6 py-4">Log Notes</th>
                  <th className="px-6 py-4 text-right">Units Count</th>
                  <th className="px-6 py-4 text-center">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {paginatedItems.length > 0 ? (
                  (paginatedItems as StockMovement[]).map((m) => (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-0.5 rounded px-2 py-0.5 text-[10px] font-bold
                          ${m.type === 'IN' 
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400' 
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                          }
                        `}>
                          {m.type === 'IN' ? (
                            <>
                              <ArrowUpRight className="h-3 w-3 shrink-0" />
                              INCOMING
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="h-3 w-3 shrink-0" />
                              OUTGOING
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-xs text-primary">
                        #{m.reference_id.substring(0, 10).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">{m.product_name || `Product ID: ${m.product_id}`}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate" title={m.notes || undefined}>{m.notes}</td>
                      <td className="px-6 py-4 text-right font-bold text-foreground">
                        {m.type === 'IN' ? '+' : '-'}{m.quantity} Units
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-muted-foreground">
                        {new Date(m.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No stock movement histories found matching query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-4">Product Title</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Stock Keeping Unit (SKU)</th>
                  <th className="px-6 py-4 text-right">Warning Level</th>
                  <th className="px-6 py-4 text-right">Current Stock</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {paginatedItems.length > 0 ? (
                  (paginatedItems as Product[]).map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">{p.name}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{p.category}</td>
                      <td className="px-6 py-4 font-mono text-xs">{p.sku}</td>
                      <td className="px-6 py-4 text-right font-medium text-muted-foreground">{p.minimum_stock} Units</td>
                      <td className="px-6 py-4 text-right font-bold">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs
                          ${p.current_stock === 0 
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }
                        `}>
                          {p.current_stock === 0 ? 'Out of Stock' : `${p.current_stock} Units`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => navigate('/purchases')}
                          className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                        >
                          <Plus className="h-3 w-3" />
                          Replenish Stock
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      All inventory units exceed security thresholds. Levels are fully stable.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/20">
            <span className="text-xs text-muted-foreground font-semibold">
              Showing page {page} of {totalPages} ({activeItems.length} records)
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
    </div>
  );
};

export default Inventory;
