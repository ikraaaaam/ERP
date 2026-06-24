# ERP Nexus — Premium Enterprise Resource Planning System

ERP Nexus is a premium, production-grade enterprise resource planning (ERP) system built using **React 19**, **TypeScript**, **Vite 8**, **Tailwind CSS v4**, and **Supabase** with a complete local database fallback layer. It follows modern design aesthetics featuring dark mode support, glassmorphism, responsive grids, and micro-animations.

---

## 🚀 Key Features

- **🛡️ Secure Authentication**: Full sign-in, signup, forgot password, and reset flows.
- **📈 Executive Dashboard**: Real-time sales vs. expense analytics charts (Area & Bar), valuation statistics, low stock warnings, and top-selling catalog item widgets.
- **📦 Catalog CRUD Management**: Track inventory items, purchase/selling margins, categories, and custom search filters.
- **👥 CRM Customers & Suppliers Directory**: Track partner contacts, logs, and corporate offices.
- **📥 Purchase Orders (PO)**: Record new acquisitions; stock levels automatically increase, tracking items in a ledger history log.
- **🛒 POS & Checkout Billing**: Add client carts, Flat Tax and Discount deduction computations, and stock validations (prevents purchase if inventory is insufficient).
- **📄 Printable Invoices**: Custom printer-friendly layout structure to export PDF invoice receipts directly from the browser.
- **📊 Date-Filtered Analytics**: Tabular reports of all modules with date boundaries and CSV export utility.
- **⚡ Search Engine**: Global search bar indexing invoices, clients, vendors, and stock catalogs instantly from any layout.

---

## 🎨 Design System

- **Palette**: Sleek Light Blue (Primary Accent), White (Base Light), and Slate Dark Grey (Charcoal Dark Theme).
- **Visuals**: Premium glassmorphism cards, Harmonics HSL variable palettes, customized scrollbars, and smooth slide-up layouts.

---

## 🔌 Database Resiliency Layer

ERP Nexus is built with **Offline-First Resilience**:
- The application automatically attempts connectivity to a Supabase back-end.
- If Supabase environment variables are missing or offline, it seamlessly falls back to a **LocalStorage Database Engine** pre-seeded with rich mock data.
- A **Connection Badge** in the top navigation bar displays the current database mode (Cloud vs. Local Storage).

### Mock Login Accounts (Local Fallback Mode)
- **Admin Privilege (Full Access & Delete Permissions)**:
  - **Email**: `admin@erpnexus.com`
  - **Password**: `admin123`
- **Staff Privilege (Read / Write / Edit; Delete Operations Blocked)**:
  - **Email**: `staff@erpnexus.com`
  - **Password**: `staff123`

---

## 💻 Local Setup & Execution

A portable Node.js v22.13.0 package is included in the project directory to ensure execution regardless of host system setups.

### 1. Launching Local Development Server
Execute the following commands in PowerShell to run the server:
```powershell
# Add the portable Node.js runtime to the PATH
$env:PATH = "D:\jobs\Codebondhu\node-v22.13.0-win-x64;" + $env:PATH

# Start the Vite HMR server
npm run dev
```

### 2. Build for Production
To check type safety and build a minified production package:
```powershell
$env:PATH = "D:\jobs\Codebondhu\node-v22.13.0-win-x64;" + $env:PATH
npm run build
```

---

## 🗄️ Database Schema (`supabase_schema.sql`)
The PostgreSQL database schema is available in the root file [supabase_schema.sql](file:///D:/jobs/Codebondhu/supabase_schema.sql). It defines:
- Row-level security (RLS) rules.
- Automated triggers to synchronize profile details.
- Tables for `products`, `customers`, `suppliers`, `purchases`, `sales`, and `stock_movements`.
