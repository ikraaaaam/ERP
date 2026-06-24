import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Users, 
  DollarSign, 
  ArrowUpRight,
  AlertTriangle,
  TrendingUp,
  ShoppingBag,
  History as HistoryIcon,
  ChevronRight,
  Truck
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


export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // Load dashboard dataset
  useEffect(() => {
    const loadDashboardData = async () => {
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
        console.error('Error loading dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-semibold">Summarizing intelligence...</p>
        </div>
      </div>
    );
  }

  // --- STATS METRICS AGGREGATIONS ---
  const totalProducts = products.length;
  const totalCustomers = customers.length;
  const totalSuppliers = suppliers.length;
  const totalPurchases = purchases.length;
  const totalSales = sales.length;
  const lifetimeRevenue = sales.reduce((sum, s) => sum + s.total_amount, 0);



  // Revenue & Profit calculations
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Filter current month transactions
  const currentMonthSales = sales.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });


  const monthlyRevenue = currentMonthSales.reduce((sum, s) => sum + s.total_amount, 0);

  // Cost of Goods Sold (COGS) to calculate profit correctly
  // Loop through sales items, resolve buying price of products, compute profit
  let monthlyCOGS = 0;
  currentMonthSales.forEach(s => {
    if (s.items) {
      s.items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        if (prod) {
          monthlyCOGS += item.quantity * prod.purchase_price;
        } else {
          // fallback
          monthlyCOGS += item.quantity * (item.unit_price * 0.5);
        }
      });
    }
  });
  
  // --- RECHARTS TREND DATA PREPARATION ---
  // Group sales and purchases by date (last 7 days)
  const getTrendsData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d;
    }).reverse();

    return last7Days.map(date => {
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const daySales = sales.filter(s => {
        const sd = new Date(s.date);
        return sd.toDateString() === date.toDateString();
      });

      const dayPurchases = purchases.filter(p => {
        const pd = new Date(p.date);
        return pd.toDateString() === date.toDateString();
      });

      const salesSum = daySales.reduce((sum, s) => sum + s.total_amount, 0);
      const purchasesSum = dayPurchases.reduce((sum, p) => sum + p.total_amount, 0);
      
      // Calculate COGS for this day
      let cogsSum = 0;
      daySales.forEach(s => {
        if (s.items) {
          s.items.forEach(item => {
            const prod = products.find(p => p.id === item.product_id);
            cogsSum += item.quantity * (prod ? prod.purchase_price : item.unit_price * 0.5);
          });
        }
      });

      return {
        date: dateStr,
        Sales: Number(salesSum.toFixed(2)),
        Purchases: Number(purchasesSum.toFixed(2)),
        Profit: Number(Math.max(0, salesSum - cogsSum).toFixed(2))
      };
    });
  };

  const chartData = getTrendsData();

  // --- WIDGET DATA RESOLUTION ---
  // 1. Low stock products (stock <= minimum_stock)
  const lowStockProducts = products
    .filter(p => p.current_stock <= p.minimum_stock)
    .sort((a, b) => a.current_stock - b.current_stock)
    .slice(0, 5);

  // 2. Recent Sales
  const recentSales = sales.slice(0, 5);

  // 3. Recent Purchases
  const recentPurchases = purchases.slice(0, 5);

  // 4. Top Selling Products (based on sales quantities)
  const getTopSelling = () => {
    const productSalesMap: Record<string, { product: Product; qty: number; total: number }> = {};
    
    sales.forEach(s => {
      if (s.items) {
        s.items.forEach(item => {
          const prod = products.find(p => p.id === item.product_id);
          if (prod) {
            if (!productSalesMap[prod.id]) {
              productSalesMap[prod.id] = { product: prod, qty: 0, total: 0 };
            }
            productSalesMap[prod.id].qty += item.quantity;
            productSalesMap[prod.id].total += item.total_amount;
          }
        });
      }
    });

    return Object.values(productSalesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  };

  const topSelling = getTopSelling();

  // Metrics card config
  const cards = [
    { 
      label: 'Total Products', 
      val: totalProducts.toString(), 
      sub: 'Active catalog items', 
      icon: Package, 
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' 
    },
    { 
      label: 'Customers', 
      val: totalCustomers.toString(), 
      sub: 'Client accounts CRM', 
      icon: Users, 
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' 
    },
    { 
      label: 'Suppliers', 
      val: totalSuppliers.toString(), 
      sub: 'Integrated partners', 
      icon: Truck, 
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' 
    },
    { 
      label: 'Purchases', 
      val: totalPurchases.toString(), 
      sub: 'Acquisition history', 
      icon: HistoryIcon, 
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' 
    },
    { 
      label: 'Sales', 
      val: totalSales.toString(), 
      sub: 'Invoices generated', 
      icon: ShoppingBag, 
      color: 'text-green-500 bg-green-500/10 border-green-500/20' 
    },
    { 
      label: 'Revenue', 
      val: `$${lifetimeRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      sub: `Monthly: $${monthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 
      icon: DollarSign, 
      color: 'text-primary bg-primary/10 border-primary/20' 
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time health index of your commercial operations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/sales')}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/15 hover:bg-primary-hover transition-all"
          >
            New Sale Checkout
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((card, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-premium hover:shadow-premium-hover hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between min-h-[145px]">
            <div className="flex justify-between items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase truncate block flex-1" title={card.label}>
                {card.label}
              </span>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${card.color}`}>
                <card.icon className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-2">
              <h3 className="text-2xl font-black tracking-tight text-foreground truncate" title={card.val}>{card.val}</h3>
            </div>
            <div className="mt-4 border-t border-border/60 pt-2.5">
              <p className="text-[10px] text-muted-foreground font-semibold truncate" title={card.sub}>
                {card.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sales & Purchase Analytics */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-premium">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div>
              <h3 className="font-bold text-foreground">Revenue & Expense Trends</h3>
              <p className="text-xs text-muted-foreground">Historical comparison of transaction volumes.</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded-md px-2 py-1">Last 7 Days</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'currentColor' }} className="text-muted-foreground text-[10px]" axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'currentColor' }} className="text-muted-foreground text-[10px]" axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }} 
                  labelStyle={{ fontWeight: 'bold', fontSize: '12px', color: 'hsl(var(--foreground))' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                <Area type="monotone" name="Sales Revenue" dataKey="Sales" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" name="Purchasing Cost" dataKey="Purchases" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPurchases)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profitability Index */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-premium">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
            <div>
              <h3 className="font-bold text-foreground">Net Margin Index</h3>
              <p className="text-xs text-muted-foreground">Earnings representation per day.</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-green-500 bg-green-500/10 rounded-md px-2 py-1">Profit</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'currentColor' }} className="text-muted-foreground text-[10px]" axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'currentColor' }} className="text-muted-foreground text-[10px]" axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '12px', color: 'hsl(var(--foreground))' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Bar name="Net Profit" dataKey="Profit" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Widgets Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-premium flex flex-col h-[380px]">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h4 className="font-bold text-foreground text-sm">Low Stock warnings</h4>
            </div>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-500/15 px-2 py-0.5 rounded-full">
              {products.filter(p => p.current_stock <= p.minimum_stock).length} Alert(s)
            </span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/40 p-2.5 bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold truncate text-foreground">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">SKU: {p.sku} | Min: {p.minimum_stock}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold text-center shrink-0
                    ${p.current_stock === 0 
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }
                  `}>
                    {p.current_stock === 0 ? 'Out' : `${p.current_stock} Left`}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <Package className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">Inventory Levels Stable</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">All products exceed warning lines.</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-premium flex flex-col h-[380px]">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h4 className="font-bold text-foreground text-sm">Top Selling Products</h4>
            </div>
            <span className="text-[10px] font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full">Calculated</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {topSelling.length > 0 ? (
              topSelling.map(({ product, qty, total }) => (
                <div key={product.id} className="flex items-center justify-between rounded-xl border border-border/40 p-2.5 bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold truncate text-foreground">{product.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">Category: {product.category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-foreground block">{qty} units</span>
                    <span className="text-[10px] font-medium text-muted-foreground">${total.toFixed(2)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <ShoppingBag className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">No Sales Tracked</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Check out your first invoice to feed widgets.</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transaction Log */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-premium flex flex-col h-[380px]">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
            <div className="flex items-center gap-2">
              <HistoryIcon className="h-4 w-4 text-purple-500" />
              <h4 className="font-bold text-foreground text-sm">Recent Transactions</h4>
            </div>
            <button 
              onClick={() => navigate('/reports')}
              className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
            >
              See All
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {recentSales.length > 0 || recentPurchases.length > 0 ? (
              [
                ...recentSales.map(s => ({ id: s.id, type: 'SALE' as const, party: s.customer_name || 'Customer', amt: s.total_amount, date: s.date }),),
                ...recentPurchases.map(p => ({ id: p.id, type: 'PURCHASE' as const, party: p.supplier_name || 'Supplier', amt: p.total_amount, date: p.date }),)
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((t, idx) => (
                  <div key={`${t.type}-${t.id}-${idx}`} className="flex items-center justify-between rounded-xl border border-border/40 p-2.5 bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block text-[8px] font-bold uppercase rounded px-1
                          ${t.type === 'SALE' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}
                        `}>
                          {t.type}
                        </span>
                        <span className="text-[10px] text-muted-foreground">ID: #{t.id.substring(0, 6)}</span>
                      </div>
                      <p className="text-xs font-bold text-foreground truncate mt-0.5">{t.party}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-bold block
                        ${t.type === 'SALE' ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'}
                      `}>
                        {t.type === 'SALE' ? '+' : '-'}${t.amt.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <HistoryIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">No Transactions</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Purchases and Sales records will appear here.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
export default Dashboard;
