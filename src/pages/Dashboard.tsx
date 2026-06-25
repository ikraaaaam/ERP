import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package,
  ArrowUpRight,
  AlertTriangle,
  ChevronRight,
  Activity
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { 
  dbProducts, 
  dbCustomers, 
  dbSuppliers, 
  dbPurchases, 
  dbSales 
} from '../services/db';
import type { Product, Customer, Supplier, Purchase, Sale } from '../types';

// ─── Mini Sparkline using SVG (no extra deps) ───────────────────────────────
const MiniSparkline: React.FC<{ data: number[]; color: string; negative?: boolean }> = ({ data, color }) => {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const pathD = `M${pts.join(' L')}`;
  const fillD = `M${pts[0]} L${pts.join(' L')} L${(data.length - 1) * (w / (data.length - 1))},${h} L0,${h} Z`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#spark-${color.replace('#','')})`} />
      <path d={pathD} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── KPI Card matching the ideal mockup ──────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  change: string;
  changePositive: boolean;
  sub: string;
  sparkData: number[];
  sparkColor: string;
  bottomLabel?: string;
  bottomValue?: string;
  onClick?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({ 
  label, value, change, changePositive, sub, sparkData, sparkColor, bottomLabel, bottomValue, onClick
}) => (
  <div
    onClick={onClick}
    className={`card-premium p-4 flex flex-col gap-1.5 min-h-[150px] ${onClick ? 'cursor-pointer group' : ''}`}
  >
    {/* Title row — full width, no truncation */}
    <div className="flex items-start justify-between gap-1">
      <p className="text-[11px] font-bold text-muted-foreground tracking-widest uppercase leading-tight">
        {label}
      </p>
      {onClick && (
        <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
      )}
    </div>

    {/* Change badge */}
    <span className={`text-[10px] font-bold w-fit px-1.5 py-0.5 rounded-md ${
      changePositive
        ? 'text-green-400 bg-green-400/10'
        : 'text-rose-400 bg-rose-400/10'
    }`}>
      {change}
    </span>

    {/* Big value */}
    <h3 className="text-[1.6rem] font-black text-foreground tracking-tight leading-none mt-0.5">
      {value}
    </h3>

    {/* Bottom: sub text + sparkline */}
    <div className="flex items-end justify-between mt-auto pt-1">
      <div className="text-[10px] text-muted-foreground leading-snug">
        <p>{sub}</p>
        {bottomLabel && (
          <p className="font-semibold text-foreground">{bottomValue}</p>
        )}
      </div>
      <MiniSparkline data={sparkData} color={sparkColor} negative={!changePositive} />
    </div>
  </div>
);




// ─── Custom Tooltip for charts ───────────────────────────────────────────────
const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-premium px-3 py-2 text-xs">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold text-foreground">${p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Progress bar for project status widget ──────────────────────────────────
const ProgressItem: React.FC<{ label: string; pct: number }> = ({ label, pct }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-xs">
      <span className="text-foreground font-medium">{label}</span>
      <span className="text-muted-foreground font-semibold">[{pct}%]</span>
    </div>
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div 
        className="h-full rounded-full bg-primary transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  </div>
);

// ─── Dashboard Component ─────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [p, c, s, pur, sal] = await Promise.all([
          dbProducts.list(),
          dbCustomers.list(),
          dbSuppliers.list(),
          dbPurchases.list(),
          dbSales.list()
        ]);
        setProducts(p); setCustomers(c); setSuppliers(s); setPurchases(pur); setSales(sal);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-semibold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ── Aggregations ──────────────────────────────────────────────────────────
  const lifetimeRevenue = sales.reduce((s, x) => s + x.total_amount, 0);

  // ── Last 8 days chart data ────────────────────────────────────────────────
  const getTrendsData = () => {
    const days = Array.from({ length: 8 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (7 - i));
      return d;
    });
    return days.map(date => {
      const ds = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const daySales = sales.filter(s => new Date(s.date).toDateString() === date.toDateString());
      const dayPurch = purchases.filter(p => new Date(p.date).toDateString() === date.toDateString());
      const salesSum = daySales.reduce((s, x) => s + x.total_amount, 0);
      const purchSum = dayPurch.reduce((s, x) => s + x.total_amount, 0);
      let cogsSum = 0;
      daySales.forEach(s => {
        if (s.items) s.items.forEach(item => {
          const prod = products.find(p => p.id === item.product_id);
          cogsSum += item.quantity * (prod ? prod.purchase_price : item.unit_price * 0.5);
        });
      });
      return {
        date: ds,
        Revenue: +salesSum.toFixed(2),
        Expenses: +purchSum.toFixed(2),
        Profit: +Math.max(0, salesSum - cogsSum).toFixed(2)
      };
    });
  };
  const chartData = getTrendsData();
  const revenueSparkline = chartData.map(d => d.Revenue);

  // ── Widgets ───────────────────────────────────────────────────────────────
  const lowStockProducts = products.filter(p => p.current_stock <= p.minimum_stock).sort((a, b) => a.current_stock - b.current_stock).slice(0, 5);
  const recentSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  const recentPurchases = [...purchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);

  const getTopSelling = () => {
    const map: Record<string, { product: Product; qty: number; total: number }> = {};
    sales.forEach(s => {
      if (s.items) s.items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        if (prod) {
          if (!map[prod.id]) map[prod.id] = { product: prod, qty: 0, total: 0 };
          map[prod.id].qty += item.quantity;
          map[prod.id].total += item.total_amount;
        }
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 5);
  };
  const topSelling = getTopSelling();

  const recentActivity = [
    ...recentSales.map(s => ({ id: s.id, type: 'SALE' as const, party: s.customer_name || 'Customer', amt: s.total_amount, date: s.date })),
    ...recentPurchases.map(p => ({ id: p.id, type: 'PURCHASE' as const, party: p.supplier_name || 'Supplier', amt: p.total_amount, date: p.date }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  };


  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Current date: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button 
          onClick={() => navigate('/sales')}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary-hover transition-all"
        >
          New Sale Checkout
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── 6 Core Metrics — Premium KPI Row ─────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">

        {/* 1. Sales — front and center */}
        <KpiCard
          label="Sales"
          value={sales.length.toLocaleString()}
          change={sales.length > 0 ? `+${sales.length}` : '—'}
          changePositive={true}
          sub="Invoices generated"
          sparkData={chartData.map((_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (7 - i));
            return sales.filter(s => new Date(s.date).toDateString() === d.toDateString()).length;
          })}
          sparkColor="#4ade80"
          bottomLabel="Total"
          bottomValue={`${sales.length} orders`}
          onClick={() => navigate('/sales')}
        />

        {/* 2. Revenue */}
        <KpiCard
          label="Revenue"
          value={fmt(lifetimeRevenue)}
          change="+12.5%"
          changePositive={true}
          sub="Lifetime earnings"
          sparkData={revenueSparkline}
          sparkColor="#4d9ef5"
          bottomLabel="Total"
          bottomValue={fmt(lifetimeRevenue)}
          onClick={() => navigate('/reports')}
        />

        {/* 3. Total Products */}
        <KpiCard
          label="Total Products"
          value={products.length.toLocaleString()}
          change={products.length > 0 ? `${products.length} SKUs` : '—'}
          changePositive={true}
          sub="Active catalog items"
          sparkData={Array.from({ length: 8 }, () => products.length)}
          sparkColor="#60a5fa"
          bottomLabel="Catalog"
          bottomValue={`${products.length} items`}
          onClick={() => navigate('/products')}
        />

        {/* 4. Customers */}
        <KpiCard
          label="Customers"
          value={customers.length.toLocaleString()}
          change={customers.length > 0 ? `+${customers.length}` : '—'}
          changePositive={true}
          sub="Client CRM accounts"
          sparkData={Array.from({ length: 8 }, () => customers.length)}
          sparkColor="#a78bfa"
          bottomLabel="CRM"
          bottomValue={`${customers.length} accounts`}
          onClick={() => navigate('/customers')}
        />

        {/* 5. Suppliers */}
        <KpiCard
          label="Suppliers"
          value={suppliers.length.toLocaleString()}
          change={suppliers.length > 0 ? `+${suppliers.length}` : '—'}
          changePositive={true}
          sub="Integrated partners"
          sparkData={Array.from({ length: 8 }, () => suppliers.length)}
          sparkColor="#fbbf24"
          bottomLabel="Partners"
          bottomValue={`${suppliers.length} vendors`}
          onClick={() => navigate('/suppliers')}
        />

        {/* 6. Purchases */}
        <KpiCard
          label="Purchases"
          value={purchases.length.toLocaleString()}
          change={purchases.length > 0 ? `+${purchases.length}` : '—'}
          changePositive={true}
          sub="Acquisition history"
          sparkData={chartData.map((_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (7 - i));
            return purchases.filter(p => new Date(p.date).toDateString() === d.toDateString()).length;
          })}
          sparkColor="#f87171"
          bottomLabel="History"
          bottomValue={`${purchases.length} POs`}
          onClick={() => navigate('/purchases')}
        />

      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Revenue Overview — full glowing area chart */}
        <div className="xl:col-span-2 card-premium p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground">Revenue Overview</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Last 8 days</p>
            </div>
            <span className="badge-blue">Area Chart</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <filter id="glow-sales">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                  <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4d9ef5" stopOpacity="0.35"/>
                    <stop offset="100%" stopColor="#4d9ef5" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#f87171" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  name="Revenue"
                  dataKey="Revenue"
                  stroke="#4d9ef5"
                  strokeWidth={2.5}
                  fill="url(#grad-revenue)"
                  dot={{ r: 3, fill: '#4d9ef5', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  filter="url(#glow-sales)"
                />
                <Area
                  type="monotone"
                  name="Expenses"
                  dataKey="Expenses"
                  stroke="#f87171"
                  strokeWidth={2}
                  fill="url(#grad-expense)"
                  dot={{ r: 2, fill: '#f87171', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Panel — Project Status + Recent Activity */}
        <div className="flex flex-col gap-4">

          {/* Top Selling as "Project Status" style */}
          <div className="card-premium p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-foreground text-sm">Top Products</h3>
                <p className="text-xs text-muted-foreground">{topSelling.length} active</p>
              </div>
            </div>
            {topSelling.length > 0 ? (
              <div className="space-y-3">
                {topSelling.map(({ product, qty }) => {
                  const maxQty = Math.max(...topSelling.map(t => t.qty), 1);
                  const pct = Math.round((qty / maxQty) * 100);
                  return (
                    <ProgressItem key={product.id} label={product.name.length > 18 ? product.name.substring(0, 18) + '…' : product.name} pct={pct} />
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">No sales data yet</div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="card-premium p-5 flex-1">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground text-sm">Recent Activity</h3>
              <button onClick={() => navigate('/reports')} className="text-[10px] font-bold text-primary flex items-center gap-0.5 hover:underline">
                See All <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-2.5 overflow-y-auto max-h-36">
              {recentActivity.length > 0 ? recentActivity.map((t, idx) => (
                <div key={`${t.type}-${t.id}-${idx}`} className="flex items-start gap-2.5">
                  <div className={`mt-0.5 h-5 w-5 shrink-0 rounded-full flex items-center justify-center ${
                    t.type === 'SALE' ? 'bg-green-500/10' : 'bg-rose-500/10'
                  }`}>
                    <Activity className={`h-2.5 w-2.5 ${t.type === 'SALE' ? 'text-green-400' : 'text-rose-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{t.party}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${t.type === 'SALE' ? 'text-green-400' : 'text-rose-400'}`}>
                    {t.type === 'SALE' ? '+' : '-'}${t.amt.toFixed(2)}
                  </span>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground text-center py-4">No transactions yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Monthly Bar Chart + Low Stock + Transactions ────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Monthly Sales bar chart */}
        <div className="xl:col-span-2 card-premium p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground">Net Margin Performance</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Daily profit breakdown</p>
            </div>
            <span className="badge-green">Profit</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar name="Net Profit" dataKey="Profit" fill="#4d9ef5" radius={[6, 6, 0, 0]} maxBarSize={28} />
                <Bar name="Revenue" dataKey="Revenue" fill="rgba(77,158,245,0.2)" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Warnings */}
        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="font-bold text-foreground text-sm">Low Stock Warnings</h3>
            </div>
            <span className="badge-amber">{products.filter(p => p.current_stock <= p.minimum_stock).length} Alert(s)</span>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-52">
            {lowStockProducts.length > 0 ? lowStockProducts.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-xl p-2.5 hover:bg-white/3 transition-colors border border-white/4">
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">SKU: {p.sku} · Min: {p.minimum_stock}</p>
                </div>
                <span className={`shrink-0 ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold
                  ${p.current_stock === 0 
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' 
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'}`
                }>
                  {p.current_stock === 0 ? 'Out' : `${p.current_stock} left`}
                </span>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-24 text-center">
                <Package className="h-7 w-7 text-muted-foreground/20 mb-2" />
                <p className="text-xs text-muted-foreground">All inventory levels stable</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
export default Dashboard;
