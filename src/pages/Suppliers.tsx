import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as zod from 'zod';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  AlertCircle, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { dbSuppliers } from '../services/db';
import type { SessionUser } from '../services/db';
import type { Supplier } from '../types';

// Validation Schema for Supplier Forms
const supplierSchema = zod.object({
  name: zod.string().min(2, { message: 'Contact Name must be at least 2 characters.' }),
  company_name: zod.string().min(2, { message: 'Company Name must be at least 2 characters.' }),
  email: zod.string().email({ message: 'Provide a valid email address.' }).or(zod.literal('')),
  phone: zod.string().min(6, { message: 'Phone number is too short.' }).or(zod.literal('')),
  address: zod.string().or(zod.literal(''))
});

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

export const Suppliers: React.FC = () => {
  const { user } = useOutletContext<{ user: SessionUser | null }>();
  const [searchParams] = useSearchParams();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Modal forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form hooks
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<zod.infer<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await dbSuppliers.list();
      setSuppliers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const searchVal = searchParams.get('search');
    if (searchVal) setSearch(searchVal);
  }, [searchParams]);

  const onSubmit = async (data: zod.infer<typeof supplierSchema>) => {
    try {
      if (editingSupplier) {
        await dbSuppliers.update(editingSupplier.id, {
          name: data.name,
          company_name: data.company_name,
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || ''
        });
        showAlert('success', `Supplier details for "${data.company_name}" successfully updated.`);
      } else {
        await dbSuppliers.create({
          name: data.name,
          company_name: data.company_name,
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || ''
        });
        showAlert('success', `Supplier "${data.company_name}" successfully added.`);
      }
      setIsModalOpen(false);
      reset();
      setEditingSupplier(null);
      fetchSuppliers();
    } catch (err: any) {
      showAlert('error', err.message || 'Operation failed.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (user?.role !== 'Admin') {
      showAlert('error', 'Security Block: Only Admins possess permissions to delete vendor records.');
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete supplier "${name}"?`)) {
      try {
        await dbSuppliers.delete(id);
        showAlert('success', `Supplier "${name}" deleted.`);
        fetchSuppliers();
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
      company_name: '',
      email: '',
      phone: '',
      address: ''
    });
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setValue('name', s.name);
    setValue('company_name', s.company_name);
    setValue('email', s.email);
    setValue('phone', s.phone);
    setValue('address', s.address);
    setIsModalOpen(true);
  };

  // Filter criteria
  const filteredSuppliers = suppliers.filter(s => 
    s.company_name.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
    (s.phone && s.phone.includes(search))
  );

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const currentSuppliers = filteredSuppliers.slice((page - 1) * itemsPerPage, page * itemsPerPage);

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
          <h1 className="text-2xl font-bold tracking-tight">Suppliers Directory</h1>
          <p className="text-sm text-muted-foreground">Manage logistics vendors, manufacturing partners, and wholesale brokers.</p>
        </div>
        {user?.role === 'Admin' && (
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/15 hover:bg-primary-hover transition-all"
          >
            <Plus className="h-4.5 w-4.5" />
            Add Supplier
          </button>
        )}
      </div>

      {/* Filter/Search Control */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-premium">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search suppliers by company, agent, contact..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-input bg-muted/20 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      {/* Suppliers List Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">Company Partner</th>
                <th className="px-6 py-4">Contact Agent</th>
                <th className="px-6 py-4">Contact Channels</th>
                <th className="px-6 py-4">Corporate Office</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-32 rounded bg-muted" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 rounded bg-muted" /></td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-3 w-40 rounded bg-muted" />
                        <div className="h-3 w-28 rounded bg-muted" />
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-3.5 w-36 rounded bg-muted" /></td>
                    <td className="px-6 py-4"><div className="mx-auto h-8 w-16 rounded bg-muted" /></td>
                  </tr>
                ))
              ) : currentSuppliers.length > 0 ? (
                currentSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-foreground">{s.company_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-medium">{s.name}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs">
                        {s.email && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                            <a href={`mailto:${s.email}`} className="hover:underline">{s.email}</a>
                          </div>
                        )}
                        {s.phone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{s.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {s.address ? (
                        <div className="flex items-start gap-1.5 max-w-[220px]">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{s.address}</span>
                        </div>
                      ) : (
                        <span className="italic text-muted-foreground/50">No address logged</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user?.role === 'Admin' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(s)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                            title="Edit Supplier"
                          >
                            <Edit3 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.company_name)}
                            className="rounded-lg p-1.5 text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all"
                            title="Delete Supplier"
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
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No suppliers matching search criteria were found in catalog.
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
              Showing page {page} of {totalPages} ({filteredSuppliers.length} suppliers)
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
          <span>You are logged in as a <strong>{user?.role}</strong> profile. Delete operations are restricted to Admin profiles.</span>
        </div>
      )}

      {/* Supplier Form Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl animate-slide-up my-auto max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div>
                <h3 className="font-bold text-foreground text-lg">{editingSupplier ? 'Edit Supplier Details' : 'New Supplier Register'}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Please provide vendor logistical credentials.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Company Name</label>
                  <input
                    type="text"
                    placeholder="Nexus Electronics Corp"
                    {...register('company_name')}
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                  {errors.company_name && (
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.company_name.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Contact Agent Name</label>
                  <input
                    type="text"
                    placeholder="Sarah Connor"
                    {...register('name')}
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                  {errors.name && (
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.name.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Work Email</label>
                  <input
                    type="email"
                    placeholder="sales@nexuselectronics.com"
                    {...register('email')}
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                  {errors.email && (
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Phone Connection</label>
                  <input
                    type="text"
                    placeholder="+1 (800) 555-0199"
                    {...register('phone')}
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                  {errors.phone && (
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Office Address</label>
                <input
                  type="text"
                  placeholder="Silicon Tower, Floor 14, San Jose, CA"
                  {...register('address')}
                  className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-border mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
                >
                  {editingSupplier ? 'Save Supplier' : 'Register Supplier'}
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
export default Suppliers;
