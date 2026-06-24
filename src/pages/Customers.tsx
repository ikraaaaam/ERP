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
  FileText,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { dbCustomers } from '../services/db';
import type { SessionUser } from '../services/db';
import type { Customer } from '../types';

// Validation Schema for Customer Forms
const customerSchema = zod.object({
  name: zod.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: zod.string().email({ message: 'Provide a valid email address.' }).or(zod.literal('')),
  phone: zod.string().min(6, { message: 'Phone number is too short.' }).or(zod.literal('')),
  address: zod.string().or(zod.literal('')),
  notes: zod.string().optional()
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

export const Customers: React.FC = () => {
  const { user } = useOutletContext<{ user: SessionUser | null }>();
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Search filter
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Modal forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form hooks
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<zod.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await dbCustomers.list();
      setCustomers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    const searchVal = searchParams.get('search');
    if (searchVal) setSearch(searchVal);
  }, [searchParams]);

  const onSubmit = async (data: zod.infer<typeof customerSchema>) => {
    try {
      if (editingCustomer) {
        await dbCustomers.update(editingCustomer.id, {
          name: data.name,
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          notes: data.notes || null
        });
        showAlert('success', `Customer details for "${data.name}" successfully updated.`);
      } else {
        await dbCustomers.create({
          name: data.name,
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          notes: data.notes || null
        });
        showAlert('success', `Customer "${data.name}" successfully added to CRM.`);
      }
      setIsModalOpen(false);
      reset();
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      showAlert('error', err.message || 'Operation failed.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (user?.role !== 'Admin') {
      showAlert('error', 'Security Block: Only Admins possess permissions to delete CRM profiles.');
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete customer "${name}"?`)) {
      try {
        await dbCustomers.delete(id);
        showAlert('success', `Customer "${name}" removed from CRM.`);
        fetchCustomers();
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
      email: '',
      phone: '',
      address: '',
      notes: ''
    });
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setValue('name', c.name);
    setValue('email', c.email);
    setValue('phone', c.phone);
    setValue('address', c.address);
    setValue('notes', c.notes || '');
    setIsModalOpen(true);
  };

  // Filter criteria
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  );

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const currentCustomers = filteredCustomers.slice((page - 1) * itemsPerPage, page * itemsPerPage);

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
          <h1 className="text-2xl font-bold tracking-tight">Customers Database</h1>
          <p className="text-sm text-muted-foreground">Manage corporate accounts, client logs, and buyer directories.</p>
        </div>
        {user?.role === 'Admin' && (
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/15 hover:bg-primary-hover transition-all"
          >
            <Plus className="h-4.5 w-4.5" />
            New Customer
          </button>
        )}
      </div>

      {/* Filter/Search Control */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-premium">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search customers by name, email, phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-input bg-muted/20 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      {/* Customers List / Table representation */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-premium">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">Customer Details</th>
                <th className="px-6 py-4">Contact Channels</th>
                <th className="px-6 py-4">Corporate Address</th>
                <th className="px-6 py-4">Notes / Ledger Info</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-32 rounded bg-muted" /></td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-3 w-40 rounded bg-muted" />
                        <div className="h-3 w-28 rounded bg-muted" />
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-3 w-24 rounded bg-muted" /></td>
                    <td className="px-6 py-4"><div className="h-3 w-36 rounded bg-muted" /></td>
                    <td className="px-6 py-4"><div className="mx-auto h-8 w-16 rounded bg-muted" /></td>
                  </tr>
                ))
              ) : currentCustomers.length > 0 ? (
                currentCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground">{c.name}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-xs">
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                            <a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>
                          </div>
                        )}
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {c.address ? (
                        <div className="flex items-start gap-1.5 max-w-[200px]">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{c.address}</span>
                        </div>
                      ) : (
                        <span className="italic text-muted-foreground/50">No address logged</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {c.notes ? (
                        <div className="flex items-start gap-1.5 max-w-[240px]">
                          <FileText className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{c.notes}</span>
                        </div>
                      ) : (
                        <span className="italic text-muted-foreground/50">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user?.role === 'Admin' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(c)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                            title="Edit Customer"
                          >
                            <Edit3 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            className="rounded-lg p-1.5 text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-all"
                            title="Delete Customer"
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
                    No customers registered.
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
              Showing page {page} of {totalPages} ({filteredCustomers.length} clients)
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

      {/* Customer Form Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl animate-slide-up my-auto max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div>
                <h3 className="font-bold text-foreground text-lg">{editingCustomer ? 'Edit Customer Info' : 'New Customer Profile'}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Please provide valid customer details.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Customer Name</label>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Work Email</label>
                  <input
                    type="email"
                    placeholder="sarah@cyberdyne.org"
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
                    placeholder="+1 (555) 019-2834"
                    {...register('phone')}
                    className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                  {errors.phone && (
                    <p className="text-[10px] text-red-500 mt-0.5">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Billing / Shipping Address</label>
                <input
                  type="text"
                  placeholder="123 Corporate Blvd, Tech City, CA"
                  {...register('address')}
                  className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Internal Account Notes</label>
                <textarea
                  placeholder="E.g., Prefers specific tax references. Orders bulky products."
                  {...register('notes')}
                  rows={3}
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
                  {editingCustomer ? 'Save Profile' : 'Create Profile'}
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
export default Customers;
