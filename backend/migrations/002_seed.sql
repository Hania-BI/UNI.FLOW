-- =========================================================
-- Seed data for CampusCare / UniFlow
--
-- This file seeds the `public.*` tables ONLY. It does NOT create
-- `auth.users` rows — those must be created via Supabase Auth (sign-up
-- API or dashboard) so passwords get hashed correctly. After creating
-- the auth users with the emails below, copy their UUIDs into this
-- file (or run the matching UPDATE) before executing it.
--
-- The fixed UUIDs below are placeholders; replace them with the real
-- `auth.users.id` values for each seed account, then run this file.
-- =========================================================

-- ---------- Placeholder auth-user IDs (REPLACE ME) ----------
-- After creating the 4 accounts in Supabase Auth with these emails:
--   admin@campuscare.local
--   manager@campuscare.local
--   worker@campuscare.local
--   member@campuscare.local
-- run:
--   select id, email from auth.users where email like '%@campuscare.local';
-- and paste the IDs into the inserts below.

insert into public.users (id, full_name, email, phone_number, role, status)
values
  ('00000000-0000-0000-0000-000000000001',
   'System Admin',       'admin@campuscare.local',   '+200000000001', 'admin',            'active'),
  ('00000000-0000-0000-0000-000000000002',
   'Facility Manager',   'manager@campuscare.local', '+200000000002', 'facility_manager', 'active'),
  ('00000000-0000-0000-0000-000000000003',
   'Worker One',         'worker@campuscare.local',  '+200000000003', 'worker',           'active'),
  ('00000000-0000-0000-0000-000000000004',
   'Community Member',   'member@campuscare.local',  '+200000000004', 'community_member', 'active')
on conflict (id) do nothing;

-- ---------- Sample locations ----------
insert into public.locations (id, building, floor, room) values
  ('10000000-0000-0000-0000-000000000001', 'Building A', '1', '101'),
  ('10000000-0000-0000-0000-000000000002', 'Building A', '2', '210'),
  ('10000000-0000-0000-0000-000000000003', 'Building B', 'Ground', 'Lobby')
on conflict (building, floor, room) do nothing;
