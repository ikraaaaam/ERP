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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar — bg-card adapts: white in light mode, deep navy in dark mode */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col
        bg-card dark:bg-[hsl(215_28%_7%)]
        border-r border-border
        transition-transform duration-300 lg:static lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo Header */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-border shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden border border-primary/30 shadow-sm">
            <img src="/logo.png" alt="Code Bondhu IT Logo" className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-none text-foreground">Code Bondhu IT</h1>
            <span className="text-[9px] text-primary font-semibold tracking-wider uppercase mt-0.5 block">IT Solutions & ERP</span>
          </div>
          <button 
            onClick={onClose}
            className="ml-auto rounded-lg p-1 text-muted-foreground hover:text-foreground lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-3 py-5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'}
              `}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer — User Profile */}
        {user && (
          <div className="border-t border-border p-3 shrink-0">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
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
