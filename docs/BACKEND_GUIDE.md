# CampusCare Backend Guide

## Tech Stack
- Node.js & Express
- Supabase Auth & Client
- PostgreSQL (Supabase)
- Supabase Storage

## Database Schema
The backend interacts with the following tables in the `public` schema:
- `community_members`, `facility_managers`, `workers`
- `locations`
- `tickets`
- `ticket_status_log`

## Setup
1. `cd backend`
2. `npm install`
3. Configure `.env` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_KEY`.
4. `npm run dev`

## Auth Flow
We use **Supabase Auth** for identity. The backend acts as a wrapper to manage role-specific profile creation during registration. Tokens are verified using `supabase.auth.getUser()`.
