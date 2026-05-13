-- =========================================================
-- CampusCare / UniFlow — initial schema
-- Target: Supabase (PostgreSQL 15+)
-- Run once in the Supabase SQL Editor.
--
-- Design notes:
--   * One `users` table mirrors `auth.users.id` and holds role + status.
--     Backend RBAC reads role from this table (authoritative), not from
--     JWT user_metadata.
--   * `issues.status` is the current state; `issue_status_log` is the
--     append-only history. No circular FK between them.
--   * RLS is enabled with permissive policies; authorization is enforced
--     in the Express layer (service key bypasses RLS anyway).
-- =========================================================

-- ---------- Extensions ----------
create extension if not exists pgcrypto;

-- ---------- Enums ----------
do $$ begin
  create type user_role as enum (
    'community_member', 'facility_manager', 'worker', 'admin'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('active', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type issue_category as enum (
    'electrical', 'plumbing', 'cleaning', 'furniture', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type issue_status as enum (
    'pending', 'assigned', 'in_progress', 'resolved', 'closed'
  );
exception when duplicate_object then null; end $$;

-- =========================================================
-- 1. USERS (profile mirror of auth.users)
-- =========================================================
create table if not exists public.users (
  id              uuid primary key
                  references auth.users(id) on delete cascade,
  full_name       varchar(255) not null,
  email           varchar(255) unique not null,
  phone_number    varchar(20),
  role            user_role    not null,
  status          user_status  not null default 'active',
  created_at      timestamptz  not null default now()
);

create index if not exists users_role_idx   on public.users(role);
create index if not exists users_status_idx on public.users(status);

-- =========================================================
-- 2. LOCATIONS
-- =========================================================
create table if not exists public.locations (
  id         uuid primary key default gen_random_uuid(),
  building   varchar(255) not null,
  floor      varchar(50)  not null,
  room       varchar(50)  not null,
  created_at timestamptz  not null default now(),
  unique (building, floor, room)
);

-- =========================================================
-- 3. ISSUES
-- =========================================================
create table if not exists public.issues (
  id                   uuid primary key default gen_random_uuid(),
  title                varchar(255) not null,
  description          text         not null,
  category             issue_category not null,
  status               issue_status   not null default 'pending',

  photo_url            text,
  completion_photo_url text,

  location_id   uuid not null
                references public.locations(id) on delete restrict,
  submitted_by  uuid not null
                references public.users(id) on delete cascade,
  assigned_to   uuid
                references public.users(id) on delete set null,

  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  closed_at     timestamptz
);

create index if not exists issues_submitted_by_idx on public.issues(submitted_by);
create index if not exists issues_assigned_to_idx  on public.issues(assigned_to);
create index if not exists issues_status_idx       on public.issues(status);
create index if not exists issues_category_idx     on public.issues(category);
create index if not exists issues_created_at_idx   on public.issues(created_at desc);

-- =========================================================
-- 4. ISSUE COMMENTS
-- =========================================================
create table if not exists public.issue_comments (
  id         uuid primary key default gen_random_uuid(),
  issue_id   uuid not null
             references public.issues(id) on delete cascade,
  author_id  uuid not null
             references public.users(id) on delete cascade,
  body       text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists issue_comments_issue_idx on public.issue_comments(issue_id);

-- =========================================================
-- 5. ISSUE STATUS LOG (append-only history)
-- =========================================================
create table if not exists public.issue_status_log (
  id          uuid primary key default gen_random_uuid(),
  issue_id    uuid not null
              references public.issues(id) on delete cascade,
  from_status issue_status,
  to_status   issue_status not null,
  changed_by  uuid not null
              references public.users(id) on delete cascade,
  note        text,
  changed_at  timestamptz not null default now()
);

create index if not exists issue_status_log_issue_idx
  on public.issue_status_log(issue_id, changed_at desc);

-- =========================================================
-- 6. ROW LEVEL SECURITY
-- Enable RLS on everything; permissive policies so the service role
-- works without surprises. Tighten in a later migration once the
-- backend stops being the sole writer.
-- =========================================================
alter table public.users            enable row level security;
alter table public.locations        enable row level security;
alter table public.issues           enable row level security;
alter table public.issue_comments   enable row level security;
alter table public.issue_status_log enable row level security;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'users','locations','issues','issue_comments','issue_status_log'
    ])
  loop
    execute format(
      'drop policy if exists "%1$s service all" on public.%1$s', t
    );
    execute format(
      'create policy "%1$s service all" on public.%1$s
         for all using (true) with check (true)', t
    );
  end loop;
end $$;

-- =========================================================
-- DONE
-- =========================================================
