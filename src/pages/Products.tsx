import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as zod from 'zod';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  X, 
  AlertCircle, 
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { dbProducts } from '../services/db';
import type { Product } from '../types';
import type { SessionUser } from '../services/db';


// Validation Schema for Product Forms
const productSchema = zod.object({
  name: zod.string().min(2, { message: 'Name must be at least 2 characters.' }),
  sku: zod.string().min(3, { message: 'SKU must be at least 3 characters.' }),
  category: zod.string().min(2, { message: 'Category must be at least 2 characters.' }),
  purchase_price: zod.preprocess(val => Number(val), zod.number().min(0, { message: 'Price cannot be negative.' })),
  selling_price: zod.preprocess(val => Number(val), zod.number().min(0, { message: 'Price cannot be negative.' })),
  current_stock: zod.preprocess(val => Number(val), zod.number().int().min(0, { message: 'Stock cannot be negative.' })),
  minimum_stock: zod.preprocess(val => Number(val), zod.number().int().min(0, { message: 'Minimum stock limit cannot be negative.' })),
  description: zod.string().optional()
});

// Custom lightweight zod resolver helper
const zodResolver = (schema: any) => async (values: any) => {
  try {
    const data = schema.parse(values);
    return { values: data, errors: {} };
  } catch (err: any) {
    const errors: any = {};
    if (err.errors) {
      err.errors.forEach((e: any) => {
        const field = e.path[0];
        errors[field] = {
          message: e.message,
          type: e.code
        };
      });
    }
    return { values: {}, errors };
  }
};

export const Products: React.FC = () => {
  const { user } = useOutletContext<{ user: SessionUser | null }>();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  
  // Sort state
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'current_stock' | 'selling_price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Modal forms states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  // Form Hooks
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<zod.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      current_stock: 0,
      minimum_stock: 10
    }
  });

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await dbProducts.list();
      setProducts(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Update search from params (e.g. from global search)
  useEffect(() => {
    const searchVal = searchParams.get('search');
    if (searchVal) setSearch(searchVal);
  }, [searchParams]);

  // Handle Form Submit (Create or Update)
  const onSubmit = async (data: zod.infer<typeof productSchema>) => {
    try {
      if (editingProduct) {
        // Staff/Admin can edit
        await dbProducts.update(editingProduct.id, {
          name: data.name,
          sku: data.sku,
          category: data.category,
          purchase_price: data.purchase_price,
          selling_price: data.selling_price,
          current_stock: data.current_stock,
          minimum_stock: data.minimum_stock,
          description: data.description || null
        });
        showAlert('success', `Product "${data.name}" successfully updated.`);
      } else {
        // Staff/Admin can create
        await dbProducts.create({
          name: data.name,
          sku: data.sku,
          category: data.category,
          purchase_price: data.purchase_price,
          selling_price: data.selling_price,
          current_stock: data.current_stock,
          minimum_stock: data.minimum_stock,
          description: data.description || null
        });
        showAlert('success', `Product "${data.name}" added to inventory.`);
      }
      setIsModalOpen(false);
      reset();
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      showAlert('error', err.message || 'Operation failed.');
    }
  };

  // Handle Delete (Only Admin allowed)
  const handleDelete = async (id: string, name: string) => {
    if (user?.role !== 'Admin') {
      showAlert('error', 'Security Block: Only Admins possess permissions to delete inventory items.');
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete "${name}"?`)) {
      try {
        await dbProducts.delete(id);
        showAlert('success', `Product "${name}" deleted.`);
        fetchProducts();
      } catch (err: any) {
        showAlert('error', err.message || 'Deletion failed.');
      }
    }
  };

  const showAlert = (type: 'success' | 'error', text: string) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  const openAddModal = () => {
    reset({
      name: '',
      sku: '',
      category: '',
      purchase_price: 0,
      selling_price: 0,
      current_stock: 0,
      minimum_stock: 10,
      description: ''
    });
    setEditingProduct(null);
    setShowCustomCategory(false);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setValue('name', product.name);
    setValue('sku', product.sku);
    setValue('category', product.category);
    setValue('purchase_price', product.purchase_price);
    setValue('selling_price', product.selling_price);
    setValue('current_stock', product.current_stock);
    setValue('minimum_stock', product.minimum_stock);
    setValue('description', product.description || '');
    setShowCustomCategory(false);
    setIsModalOpen(true);
  };

  const handleSort = (field: 'name' | 'sku' | 'current_stock' | 'selling_price') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Categories resolver for filter dropdown
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  // Filtering & Sorting math
  const filteredProducts = products
    .filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.sku.toLowerCase().includes(search.toLowerCase()) ||
                          p.category.toLowerCase().includes(search.toLowerCase());
      
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchStatus = selectedStatus === 'All' || p.status === selectedStatus;

      return matchSearch && matchCategory && matchStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
      else if (sortBy === 'sku') comparison = a.sku.localeCompare(b.sku);
      else if (sortBy === 'current_stock') comparison = a.current_stock - b.current_stock;
      else if (sortBy === 'selling_price') comparison = a.selling_price - b.selling_price;

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Pagination bounds
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentProducts = filteredProducts.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Notifications banner */}
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
          <h1 className="text-2xl font-bold tracking-tight">Products Catalog</h1>
          <p className="text-sm text-muted-foreground">Manage system inventories, price structures, and minimum stock alerts.</p>
        </div>
        {user?.role === 'Admin' && (
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/15 hover:bg-primary-hover transition-all"
          >
            <Plus className="h-4.5 w-4.5" />
            Add Product
          </button>
        )}
      </div>

      {/* Filters & search panel */}
      <div className="grid gap-4 md:grid-cols-4 rounded-2xl border border-border bg-card p-4 shadow-premium">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products by name, SKU, category..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-input bg-muted/20 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-input bg-muted/20 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-card"
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-input bg-muted/20 px-3 py-2.5 text-sm outline-none focus:border-primary focus:bg-card"
          >
            <option value="All">All Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4 cursor-pointer hover:text-foreground" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1.5">
                    Product Details <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-foreground" onClick={() => handleSort('sku')}>
                  <div className="flex items-center gap-1.5">
                    SKU <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-foreground text-right" onClick={() => handleSort('selling_price')}>
                  <div className="flex items-center justify-end gap-1.5">
                    Selling Price <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Cost Price</th>
                <th className="px-6 py-4 cursor-pointer hover:text-foreground text-right" onClick={() => handleSort('current_stock')}>
                  <div className="flex items-center justify-end gap-1.5">
                    Stock <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {loading ? (
                Array.from({ length: itemsPerPage }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="h-4 bg-muted rounded w-2/3 mb-1"></div>
                      <div className="h-3 bg-muted rounded w-1/3"></div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="h-4 bg-muted rounded w-1/3 ml-auto"></div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="h-4 bg-muted rounded w-1/3 ml-auto"></div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="h-4 bg-muted rounded w-1/2 ml-auto"></div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="h-5 bg-muted rounded-full w-16 mx-auto"></div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="h-8 bg-muted rounded w-12 mx-auto"></div>
                    </td>
                  </tr>
                ))
              ) : currentProducts.length > 0 ? (
                currentProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-semibold text-foreground block">{prod.name}</span>
                        <span className="text-xs text-muted-foreground">{prod.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{prod.sku}</td>
                    <td className="px-6 py-4 text-right font-semibold">${prod.selling_price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-muted-foreground">${prod.purchase_price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-medium">
                      <span className={`${prod.current_stock <= prod.minimum_stock ? 'text-amber-600 font-bold' : ''}`}>
                        {prod.current_stock}
                      </span>
                      <span className="text-[10px] text-muted-foreground"> / {prod.minimum_stock} min</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold
                        ${prod.status === 'In Stock' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : ''}
                        ${prod.status === 'Low Stock' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : ''}
                        ${prod.status === 'Out of Stock' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : ''}
                      `}>
                        {prod.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user?.role === 'Admin' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(prod)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                            title="Edit Details"
                          >
                            <Edit3 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(prod.id, prod.name)}
                            className="rounded-lg p-1.5 text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all"
                            title="Delete Item"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 italic font-semibold">View Only</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No products matching search criteria were found in catalog.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-muted/20">
            <span className="text-xs text-muted-foreground font-semibold">
              Showing page {page} of {totalPages} ({filteredProducts.length} items)
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

      {/* Staff restrictions notification */}
      {user?.role !== 'Admin' && (
        <div className="flex items-center gap-2 rounded-2xl border border-blue-500/10 bg-blue-500/5 px-4 py-3 text-xs text-blue-700 dark:text-blue-400">
          <Info className="h-4 w-4 shrink-0" />
          <span>You are logged in as a <strong>{user?.role}</strong> profile. You have write/edit access but <strong>delete permissions</strong> are restricted to Admin profiles.</span>
        </div>
      )}

      {/* Product Drawer/Modal Form */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl border border-border bg-card p-5 shadow-2xl animate-slide-up my-auto max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
              <div>
                <h3 className="font-bold text-foreground text-lg">{editingProduct ? 'Edit Product Details' : 'Add New Product'}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Please fill details matching standard inventory specs.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
              {/* Product Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Product Title</label>
                <input
                  type="text"
                  placeholder="e.g., Ergonomic Wireless Mouse"
                  {...register('name')}
                  className="w-full rounded-xl border border-input bg-card px-3 py-1.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                {errors.name && (
                  <p className="text-[10px] text-red-500 mt-0.5">{errors.name.message}</p>
                )}
              </div>

              {/* SKU, Category & Minimum Warning Stock (3 columns) */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Stock Keeping Unit (SKU)</label>
                  <input
                    type="text"
                    placeholder="EL-MSE-012"
                    {...register('sku')}
                    className="w-full rounded-xl border border-input bg-card px-3 py-1.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                  {errors.sku && (
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.sku.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Category</label>
                  {!showCustomCategory ? (
                    <select
                      {...register('category')}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setShowCustomCategory(true);
                          setValue('category', '');
                        }
                      }}
                      className="w-full rounded-xl border border-input bg-[#1f2937] px-2 py-1.5 text-xs text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 animate-fade-in"
                    >
                      <option value="">-- Choose Category --</option>
                      {Array.from(new Set(['Electronics', 'Furniture', 'Office Supplies', 'Industrial Tools', 'Apparel', ...products.map(p => p.category)])).filter(Boolean).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__NEW__" className="text-primary font-bold">+ Create...</option>
                    </select>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. Kitchen"
                        {...register('category')}
                        className="w-full rounded-xl border border-input bg-card px-2 py-1.5 text-xs outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomCategory(false);
                          setValue('category', '');
                        }}
                        className="rounded-xl border border-border bg-card px-2 text-[10px] font-semibold hover:bg-muted"
                      >
                        Sel
                      </button>
                    </div>
                  )}
                  {errors.category && (
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.category.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Min warning Stock</label>
                  <input
                    type="number"
                    placeholder="10"
                    {...register('minimum_stock')}
                    className="w-full rounded-xl border border-input bg-card px-3 py-1.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                  {errors.minimum_stock && (
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.minimum_stock.message}</p>
                  )}
                </div>
              </div>

              {/* Cost Price, Selling Price & Initial Stock (3 columns) */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="12.50"
                    {...register('purchase_price')}
                    className="w-full rounded-xl border border-input bg-card px-3 py-1.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                  {errors.purchase_price && (
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.purchase_price.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="25.00"
                    {...register('selling_price')}
                    className="w-full rounded-xl border border-input bg-card px-3 py-1.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                  {errors.selling_price && (
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.selling_price.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Initial Stock Count</label>
                  <input
                    type="number"
                    placeholder="40"
                    disabled={!!editingProduct}
                    {...register('current_stock')}
                    className="w-full rounded-xl border border-input bg-card px-3 py-1.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-60"
                  />
                  {errors.current_stock && (
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.current_stock.message}</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Short Description</label>
                <input
                  type="text"
                  placeholder="Optional details, manufacturing specifications..."
                  {...register('description')}
                  className="w-full rounded-xl border border-input bg-card px-3.5 py-1.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-border mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-hover shadow-md shadow-primary/10"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
export default Products;
