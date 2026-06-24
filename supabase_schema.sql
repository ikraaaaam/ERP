-- ERP Nexus Database Schema
-- Suitable for Supabase (PostgreSQL)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    name text not null,
    role text not null check (role in ('Admin', 'Staff')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by anyone." on public.profiles
    for select using (true);

create policy "Users can update their own profile." on public.profiles
    for update using (auth.uid() = id);

-- Trigger to automatically create profile on sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'New User'),
    coalesce(new.raw_user_meta_data->>'role', 'Staff')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- PRODUCTS
create table public.products (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    sku text not null unique,
    category text not null,
    purchase_price numeric(12, 2) not null check (purchase_price >= 0),
    selling_price numeric(12, 2) not null check (selling_price >= 0),
    current_stock integer not null default 0 check (current_stock >= 0),
    minimum_stock integer not null default 10 check (minimum_stock >= 0),
    description text,
    status text not null check (status in ('In Stock', 'Low Stock', 'Out of Stock')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.products enable row level security;

create policy "Authenticated users can select products." on public.products
    for select using (auth.role() = 'authenticated');

create policy "Staff/Admin can insert products." on public.products
    for insert with check (auth.role() = 'authenticated');

create policy "Staff/Admin can update products." on public.products
    for update using (auth.role() = 'authenticated');

create policy "Only Admin can delete products." on public.products
    for delete using (
        exists (
            select 1 from public.profiles 
            where profiles.id = auth.uid() and profiles.role = 'Admin'
        )
    );


-- CUSTOMERS
create table public.customers (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    email text unique,
    phone text,
    address text,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.customers enable row level security;

create policy "Authenticated users can CRUD customers." on public.customers
    for all using (auth.role() = 'authenticated');


-- SUPPLIERS
create table public.suppliers (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    email text unique,
    phone text,
    address text,
    company_name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.suppliers enable row level security;

create policy "Authenticated users can CRUD suppliers." on public.suppliers
    for all using (auth.role() = 'authenticated');


-- PURCHASES
create table public.purchases (
    id uuid default uuid_generate_v4() primary key,
    supplier_id uuid references public.suppliers(id) on delete set null,
    date timestamp with time zone default timezone('utc'::text, now()) not null,
    total_amount numeric(12, 2) not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.purchases enable row level security;

create policy "Authenticated users can CRUD purchases." on public.purchases
    for all using (auth.role() = 'authenticated');


-- PURCHASE ITEMS
create table public.purchase_items (
    id uuid default uuid_generate_v4() primary key,
    purchase_id uuid references public.purchases(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete set null,
    quantity integer not null check (quantity > 0),
    unit_cost numeric(12, 2) not null check (unit_cost >= 0),
    total_amount numeric(12, 2) not null check (total_amount >= 0)
);

alter table public.purchase_items enable row level security;

create policy "Authenticated users can CRUD purchase items." on public.purchase_items
    for all using (auth.role() = 'authenticated');


-- SALES
create table public.sales (
    id uuid default uuid_generate_v4() primary key,
    customer_id uuid references public.customers(id) on delete set null,
    date timestamp with time zone default timezone('utc'::text, now()) not null,
    discount numeric(12, 2) not null default 0 check (discount >= 0),
    tax numeric(12, 2) not null default 0 check (tax >= 0),
    total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.sales enable row level security;

create policy "Authenticated users can CRUD sales." on public.sales
    for all using (auth.role() = 'authenticated');


-- SALE ITEMS
create table public.sale_items (
    id uuid default uuid_generate_v4() primary key,
    sale_id uuid references public.sales(id) on delete cascade not null,
    product_id uuid references public.products(id) on delete set null,
    quantity integer not null check (quantity > 0),
    unit_price numeric(12, 2) not null check (unit_price >= 0),
    total_amount numeric(12, 2) not null check (total_amount >= 0)
);

alter table public.sale_items enable row level security;

create policy "Authenticated users can CRUD sale items." on public.sale_items
    for all using (auth.role() = 'authenticated');


-- STOCK MOVEMENTS
create table public.stock_movements (
    id uuid default uuid_generate_v4() primary key,
    product_id uuid references public.products(id) on delete cascade not null,
    type text not null check (type in ('IN', 'OUT')),
    quantity integer not null check (quantity > 0),
    reference_id uuid not null, -- Can be purchase_id or sale_id
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.stock_movements enable row level security;

create policy "Authenticated users can CRUD stock movements." on public.stock_movements
    for all using (auth.role() = 'authenticated');


-- ACTIVITY LOGS (AUDIT TRAIL)
create table public.activity_logs (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete set null,
    action text not null,
    details text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.activity_logs enable row level security;

create policy "Authenticated users can select activity logs." on public.activity_logs
    for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert activity logs." on public.activity_logs
    for insert with check (auth.role() = 'authenticated');
