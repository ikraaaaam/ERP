import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Truck, 
  ShoppingBag, 
  ShoppingCart, 
  History, 
  BarChart3,
  X,
  User,
  ShieldCheck
} from 'lucide-react';
import type { SessionUser } from '../../services/db';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: SessionUser | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user }) => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/products', label: 'Products', icon: Package },
    { to: '/inventory', label: 'Inventory', icon: History },
    { to: '/purchases', label: 'Purchases', icon: Truck },
    { to: '/sales', label: 'Sales', icon: ShoppingBag },
    { to: '/customers', label: 'Customers', icon: Users },
    { to: '/suppliers', label: 'Suppliers', icon: ShoppingCart },
    { to: '/reports', label: 'Analytics & Reports', icon: BarChart3 },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-darkgrey-950/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card text-card-foreground transition-transform duration-300 lg:static lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden border border-primary/20 shadow-md">
              <img src="/logo.png" alt="Code Bondhu IT Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none text-foreground">Code Bondhu IT</h1>
              <span className="text-[9px] text-primary font-semibold tracking-wider uppercase mt-1 block">IT Solutions & ERP</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group
                ${isActive 
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
              `}
            >
              <item.icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-105" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer User Info */}
        {user && (
          <div className="border-t border-border p-4 bg-muted/30">
            <div className="flex items-center gap-3 rounded-xl p-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-primary shrink-0" />
                  <span className="truncate">{user.role}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
export default Sidebar;
