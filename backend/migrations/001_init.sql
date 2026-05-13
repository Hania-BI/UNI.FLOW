-- Initial migration for UNIFLOW
-- =========================================================
-- FACILITY MANAGEMENT SYSTEM - SUPABASE FULL SCHEMA
-- Paste EVERYTHING into Supabase SQL Editor and Run Once
-- =========================================================

-- =========================================================
-- 1. ENUM TYPES
-- =========================================================

create type ticket_category as enum (
  'Maintenance',
  'Cleanliness',
  'Infrastructure'
);

create type ticket_priority as enum (
  'Low',
  'Medium',
  'High'
);

create type worker_account_status as enum (
  'Active',
  'Suspended',
  'Pending'
);

create type location_area_type as enum (
  'Classroom',
  'Office',
  'Outdoor',
  'Lab'
);

-- =========================================================
-- 2. COMMUNITY MEMBERS TABLE
-- =========================================================

create table public.community_members (
  user_id uuid primary key default gen_random_uuid(),

  full_name varchar(255) not null,

  email varchar(255) unique not null,

  password_hash varchar(255) not null,

  phone_number varchar(20),

  created_at timestamptz not null default now()
);

-- =========================================================
-- 3. WORKERS TABLE
-- =========================================================

create table public.workers (
  worker_id uuid primary key default gen_random_uuid(),

  full_name varchar(255) not null,

  email varchar(255) unique not null,

  password_hash varchar(255) not null,

  phone_number varchar(20),

  department varchar(100),

  account_status worker_account_status
  not null
  default 'Pending',

  suspended_at timestamptz,

  created_at timestamptz not null default now()
);

-- =========================================================
-- 4. FACILITY MANAGERS TABLE
-- =========================================================

create table public.facility_managers (
  manager_id uuid primary key default gen_random_uuid(),

  full_name varchar(255) not null,

  email varchar(255) unique not null,

  password_hash varchar(255) not null,

  last_login timestamptz,

  created_at timestamptz not null default now()
);

-- =========================================================
-- 5. LOCATIONS TABLE
-- =========================================================

create table public.locations (
  location_id uuid primary key default gen_random_uuid(),

  building_name varchar(255) not null,

  description text,

  floor varchar(50),

  area_type location_area_type not null,

  room_number varchar(50)
);

-- =========================================================
-- 6. TICKETS TABLE
-- =========================================================

create table public.tickets (
  ticket_id uuid primary key default gen_random_uuid(),

  title varchar(255) not null,

  description text,

  category ticket_category not null,

  priority ticket_priority
  not null
  default 'Medium',

  created_at timestamptz not null default now(),

  resolved_at timestamptz,

  created_by uuid not null
  references public.community_members(user_id)
  on delete cascade,

  assigned_worker_id uuid
  references public.workers(worker_id)
  on delete set null,

  location_id uuid not null
  references public.locations(location_id)
  on delete cascade,

  status_id uuid
);

-- =========================================================
-- 7. TICKET STATUS LOG TABLE
-- =========================================================

create table public.ticket_status_log (
  log_id uuid primary key default gen_random_uuid(),

  ticket_id uuid not null
  references public.tickets(ticket_id)
  on delete cascade,

  status_name varchar(100) not null,

  updated_by_worker_id uuid
  references public.workers(worker_id)
  on delete set null,

  updated_by_manager_id uuid
  references public.facility_managers(manager_id)
  on delete set null,

  updated_at timestamptz not null default now(),

  comment text
);

-- =========================================================
-- 8. FOREIGN KEY FOR CURRENT STATUS
-- =========================================================

alter table public.tickets
add constraint fk_ticket_latest_status
foreign key (status_id)
references public.ticket_status_log(log_id)
on delete set null;

-- =========================================================
-- 9. INDEXES
-- =========================================================

create index tickets_created_by_idx
on public.tickets(created_by);

create index tickets_assigned_worker_idx
on public.tickets(assigned_worker_id);

create index tickets_location_idx
on public.tickets(location_id);

create index ticket_status_log_ticket_idx
on public.ticket_status_log(ticket_id);

create index community_members_email_idx
on public.community_members(email);

create index workers_email_idx
on public.workers(email);

create index managers_email_idx
on public.facility_managers(email);

-- =========================================================
-- 10. ENABLE ROW LEVEL SECURITY
-- =========================================================

alter table public.community_members enable row level security;

alter table public.workers enable row level security;

alter table public.facility_managers enable row level security;

alter table public.locations enable row level security;

alter table public.tickets enable row level security;

alter table public.ticket_status_log enable row level security;

-- =========================================================
-- 11. COMMUNITY MEMBER POLICIES
-- =========================================================

create policy "community members can view own profile"
on public.community_members
for select
using (auth.uid() = user_id);

create policy "community members can update own profile"
on public.community_members
for update
using (auth.uid() = user_id);

-- =========================================================
-- 12. TICKET POLICIES
-- =========================================================

create policy "community members create tickets"
on public.tickets
for insert
with check (auth.uid() = created_by);

create policy "community members view own tickets"
on public.tickets
for select
using (auth.uid() = created_by);

create policy "workers view assigned tickets"
on public.tickets
for select
using (auth.uid() = assigned_worker_id);

create policy "workers update assigned tickets"
on public.tickets
for update
using (auth.uid() = assigned_worker_id);

create policy "managers full access to tickets"
on public.tickets
for all
using (true)
with check (true);

-- =========================================================
-- 13. TICKET STATUS LOG POLICIES
-- =========================================================

create policy "workers can insert status logs"
on public.ticket_status_log
for insert
with check (true);

create policy "workers view status logs"
on public.ticket_status_log
for select
using (true);

create policy "managers full access to status logs"
on public.ticket_status_log
for all
using (true)
with check (true);

-- =========================================================
-- 14. LOCATION POLICIES
-- =========================================================

create policy "all authenticated users can view locations"
on public.locations
for select
using (auth.role() = 'authenticated');

create policy "managers manage locations"
on public.locations
for all
using (true)
with check (true);

-- =========================================================
-- 15. WORKER POLICIES
-- =========================================================

create policy "workers view own profile"
on public.workers
for select
using (auth.uid() = worker_id);

create policy "workers update own profile"
on public.workers
for update
using (auth.uid() = worker_id);

-- =========================================================
-- 16. MANAGER POLICIES
-- =========================================================

create policy "managers view own profile"
on public.facility_managers
for select
using (auth.uid() = manager_id);

create policy "managers update own profile"
on public.facility_managers
for update
using (auth.uid() = manager_id);

-- =========================================================
-- DONE
-- =========================================================