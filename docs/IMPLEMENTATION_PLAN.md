# CampusCare — Implementation Plan (Milestone 2)

**Author:** Senior engineering review of the current `UniFlow` repo against the
Final-Milestone brief (`final-milestone_campusCare.pdf`) and the SRS.
**Target deadline:** 17 May 2026.
**Stack (locked by the brief):** React Native (Expo) · Node.js/Express · Supabase
(PostgreSQL + Auth + Storage) · JWT (via Supabase access token).

---

## 0. TL;DR — what state is the repo actually in?

We already have scaffolding: an Express app, three role tables in Postgres,
auth controller, an issue controller, and an Expo app with auth context and a
few screens.

**However, the code as committed will not run end-to-end.** The biggest problem
is that the SQL migration and the Node controllers describe two *different*
databases. Until that is reconciled, every endpoint touching `tickets` /
`locations` / `ticket_status_log` will 500. Concretely:

| Layer | Says | Layer | Says |
|---|---|---|---|
| `migrations/001_init.sql` `tickets` | `created_by`, `assigned_worker_id`, `status_id` (FK to log), no `photo_url`, no `status` text column | `issueController.js` | `submitted_by`, `assigned_to`, `status` (text), `photo_url`, `completion_photo_url` |
| `migrations/001_init.sql` `locations` | `location_id`, `building_name`, `area_type` (NOT NULL enum), `floor`, `room_number` | `issueController.js` | `id`, `building`, `floor`, `room` |
| `migrations/001_init.sql` `ticket_status_log` | `status_name`, `updated_by_worker_id`, `updated_by_manager_id` | `issueController.js` | `status`, `changed_by` |
| `migrations/001_init.sql` `workers` / `facility_managers` | PK `worker_id` / `manager_id`, column `full_name` | `authController.js` register | inserts `user_id`, `name` |

Plus: no `logout`, `close`, `comments`, `photo`, `delete`, manager/admin
endpoints; only one shared `HomeScreen` for all three roles; no Supabase
Storage bucket created; `.env.example` missing; SRS use-case diagram missing.

The plan below fixes these in dependency order: **DB → backend → mobile →
docs**, exactly as the brief recommends.

---

## 1. Guiding decisions (made up-front so we don't refactor twice)

1. **One schema, one source of truth.** Rewrite the migration to match what
   controllers actually need (and what the brief actually asks for: `users`,
   `issues`, `comments`). Keep the three-role-table model only if the team
   genuinely wants it; otherwise collapse to a single `users` table with a
   `role` enum. **Recommendation: single `users` table** — every controller
   already keys off `req.user.id` from Supabase Auth, and three separate tables
   force ugly FK fan-outs (`submitter:community_members!…`, `worker:workers!…`)
   that we already see breaking. Auth users still live in `auth.users`; our
   `users` row mirrors profile fields and `role`.
2. **Status as enum on `issues`, plus an append-only `issue_status_log`.** The
   current "FK from ticket to latest log row" design is clever but fragile;
   keep current status on the row, log every transition separately.
3. **Supabase Storage** for photos (bucket `issue-photos`, private, signed URLs
   on read). Brief allows this.
4. **Role in JWT user_metadata** (already done) — `requireAuth` reads
   `user_metadata.role`. Do *not* rely on RLS for authorization in v1; the
   backend uses the service key and enforces RBAC in middleware. Keep RLS on
   but with permissive policies for the service role (which bypasses RLS
   anyway). This is simpler to reason about for a 1-week sprint.
5. **No password reset email** in v1 (it's optional in the brief and requires
   Supabase email template wiring). Endpoint stays, but UI can be a "we sent
   you an email" stub.

---

## 2. Work breakdown (8 phases)

Each phase has a clear "done when" so the team can parallelize after Phase 2.

### Phase 1 — Database (Day 1, blocking)
**Done when:** `npm run db:reset` rebuilds a schema that matches every
controller exactly, and Supabase Storage bucket `issue-photos` exists.

1. Rewrite `backend/migrations/001_init.sql`:
   - `users` (id uuid PK = `auth.users.id`, full_name, email unique, phone,
     role enum `'community_member'|'facility_manager'|'worker'|'admin'`,
     status enum `'active'|'inactive'` default `'active'`, created_at).
   - `locations` (id uuid PK, building text, floor text, room text,
     UNIQUE(building, floor, room)).
   - `issues` (id uuid PK, title, description, category enum
     `'electrical'|'plumbing'|'cleaning'|'furniture'|'other'`,
     status enum `'pending'|'assigned'|'in_progress'|'resolved'|'closed'`
     default `'pending'`, photo_url text, completion_photo_url text,
     location_id FK → locations, submitted_by FK → users,
     assigned_to FK → users NULL, created_at, resolved_at NULL, closed_at NULL).
   - `issue_comments` (id, issue_id FK, author_id FK → users, body text,
     created_at).
   - `issue_status_log` (id, issue_id FK, from_status, to_status, changed_by FK,
     changed_at, note text NULL).
   - Indexes on `submitted_by`, `assigned_to`, `status`, `category`.
   - RLS: enable on all tables, add a single permissive policy `using (true)
     with check (true)` so the service role works; tighten later.
2. Add `002_seed.sql` with: 1 admin, 1 facility manager, 1 worker, 1
   community member (deterministic UUIDs documented in setup guide so the
   demo always logs in), and 3 sample locations.
3. Create a `db:reset` npm script (`psql $DATABASE_URL -f …`) or document the
   Supabase SQL editor copy-paste flow.
4. In Supabase Dashboard: create private Storage bucket `issue-photos`.
   Document this step in `README` — it cannot be done by the migration.

### Phase 2 — Backend: fix auth & wire RBAC (Day 1–2, blocking)

**Done when:** register/login/logout work for all 3 roles, JWT carries
`role`, and `requireAuth` populates `req.user = { id, role, email }`.

1. **`POST /api/auth/register`** — keep Supabase `signUp` for `auth.users`,
   then insert ONE row into `public.users` with `{ id: authData.user.id,
   full_name, email, role, phone }`. Delete the auth user on rollback if
   profile insert fails. Validate role is one of the four.
2. **`POST /api/auth/login`** — unchanged, but on success also re-fetch the
   `public.users` row to confirm `status='active'`; reject with 403 if not.
   Return `{ token, user: { id, full_name, email, role } }`.
3. **`POST /api/auth/logout`** — call `supabaseAdmin.auth.admin.signOut(userId)`
   to invalidate refresh tokens. Returns 204.
4. **`POST /api/auth/forgot-password`** — keep current stub; document that it
   requires the Supabase email template + redirect URL to actually deliver.
5. **`requireAuth`** — verify token via `supabaseAdmin.auth.getUser(token)`,
   then **fetch role from `public.users`** instead of trusting
   `user_metadata.role` (metadata is editable by the client in some Supabase
   setups; the table is authoritative).
6. **`rbac(roles)`** — already fine; just exercise it on every new route.

### Phase 3 — Backend: complete the Issue API (Day 2–3)

**Done when:** every endpoint in §3.2 of the brief returns sensible JSON,
input is validated with `express-validator`, errors use the central format
`{ error: string, details?: object }`.

| Method | Path | RBAC | Notes |
|---|---|---|---|
| POST | `/api/issues` | community_member | multipart `photo` + JSON fields; rewrite to use the new schema |
| GET | `/api/issues` | facility_manager, admin | filters: `status`, `category`, `from`, `to`, pagination |
| GET | `/api/issues/my` | community_member | submitter = `req.user.id` |
| GET | `/api/issues/assigned` | worker | NEW — assigned_to = `req.user.id` |
| GET | `/api/issues/:id` | any authed | also returns comments + status log |
| PUT | `/api/issues/:id/status` | worker (own), facility_manager | enforce legal transitions (see state machine below) |
| PUT | `/api/issues/:id/assign` | facility_manager | body `{ workerId }`; sets status=`assigned` |
| PUT | `/api/issues/:id/close` | facility_manager | only if status=`resolved`; sets `closed_at` |
| POST | `/api/issues/:id/comments` | worker (own), facility_manager | body `{ body }` |
| POST | `/api/issues/:id/photo` | worker (own) | multipart `photo` → `completion_photo_url` |
| DELETE | `/api/issues/:id` | facility_manager | hard delete + storage cleanup |

**Status state machine** (reject illegal transitions with 409):
```
pending → assigned → in_progress → resolved → closed
                  ↘ in_progress (worker self-claim)
any → pending (FM reopen)
```

**Cross-cutting:**
- Add `express-validator` chains per route; bail early with 400.
- Wrap controllers in an `asyncHandler` so the central error middleware
  actually receives thrown errors.
- Replace ad-hoc `console.error` + `res.status(500)` with `next(err)`.

### Phase 4 — Backend: manager + admin endpoints (Day 3, parallelizable)

- `GET /api/manager/workers` — list users where `role='worker'`.
- `PUT /api/manager/workers/:id/status` — toggle `users.status`.
- `GET /api/admin/users` and `PUT /api/admin/users/:id/status` — same idea,
  any role. (Optional per brief but cheap once §4 controller is written.)
- Add an `/api/auth/me` endpoint — mobile uses it on cold start to refresh
  the user profile in case role/status changed server-side.

### Phase 5 — Mobile: navigation + role separation (Day 3–4)

**Done when:** each role lands on its own stack with the right tabs, and
"logout" is reachable from every dashboard.

Replace the current "all roles share `HomeScreen`" hack:

```
RootNavigator
├── if !user → AuthStack (Login, Signup, ForgotPassword)
└── if  user → AppStack
    ├── CommunityMemberTabs   (MyIssues, ReportIssue, Profile)
    ├── FacilityManagerTabs   (Dashboard, Workers, Profile)
    └── WorkerTabs            (AssignedTasks, Profile)
    + shared: IssueDetailScreen, EditProfileScreen
```

- Add a `ProfileScreen` (shows name/email/role + Logout button) shared by all
  roles — covers US-CM-06, US-FM-03, US-W-03.
- `useAuth()` already exposes `logout()` — wire it.

### Phase 6 — Mobile: screens per role (Day 4–6)

This is the bulk of the work; split across 3 devs (one per role).

**Community Member**
- `MyIssuesScreen` — `GET /issues/my`, FlatList of `IssueCard`, pull-to-refresh.
- `ReportIssueScreen` (already `CreateIssueScreen`) — verify it submits the
  new multipart shape; add validation, location pickers (building/floor/room
  free-text is fine for v1), expo-image-picker for photo.
- `IssueDetailScreen` — already exists; render comments + status log.

**Facility Manager**
- `DashboardScreen` — `GET /issues` with filter chips (status, category).
- `AssignIssueScreen` (modal from detail) — `GET /manager/workers` then
  `PUT /issues/:id/assign`.
- `WorkersScreen` (optional, US-FM-) — list + activate/deactivate toggle.
- Detail screen gains a "Close" button when status=`resolved`.

**Worker**
- `AssignedIssuesScreen` — `GET /issues/assigned`.
- `IssueWorkScreen` — status buttons (`Start` → `in_progress`, `Mark Resolved`
  + photo upload), comments composer.

**Shared UX requirements (from brief §2.6):**
- Form validation everywhere (use `react-hook-form` or a tiny custom hook —
  don't roll a half-baked one per screen).
- Loading + error states on every async call. Centralize with a small
  `useQuery`-ish hook around `apiGet` rather than copy-pasting `try/catch +
  setLoading`.
- Toast/snackbar for success/error feedback (`react-native-toast-message` or
  a 50-line custom one).

### Phase 7 — Cross-cutting hardening (Day 6)

- **`.env.example`** for both `backend/` and `mobile/` (current `.env` is
  committed; rotate the keys and gitignore properly).
- **CORS** — restrict to dev origins via env, not `app.use(cors())` open.
- **Rate-limit** auth endpoints (`express-rate-limit`).
- **Logger** — swap `console.error` for `pino` or at minimum a `logger.js`
  module so we can silence it in tests.
- **Smoke test script** — a `backend/scripts/smoke.mjs` that registers 3
  users, submits an issue, assigns it, resolves it. Run before demo.

### Phase 8 — Documentation (Day 7)

Brief §4 requires five docs. Map them to files in `docs/`:

| Brief section | File |
|---|---|
| 4.1 Updated SRS + UML use-case | `docs/SRS.docx` (update in place) + `docs/use-case-diagram.png` (draw.io export, commit the `.drawio` source too) |
| 4.2 API documentation | `docs/API.md` — one section per endpoint, request/response examples copied from the smoke test |
| 4.3 ERD + table defs | `docs/DATABASE.md` + `docs/erd.png` |
| 4.4 Setup guide | top-level `README.md` (rewrite — the current one is empty-ish) |
| 4.5 Project structure | section inside `README.md` |

For API docs, the lowest-friction path is to (a) author `API.md` by hand, or
(b) add `swagger-jsdoc` + `swagger-ui-express` and let `/api/docs` render
itself. The brief just asks for "clear and complete" — handwritten Markdown
is fine and faster.

---

## 3. Risk register (things that will bite us)

| Risk | Likelihood | Mitigation |
|---|---|---|
| Supabase RLS blocks the service key in a misconfigured policy | Med | Keep policies permissive in v1; rely on backend RBAC. |
| Multipart upload via `fetch` + `FormData` flaky on Android emulator | Med | Test on a real device early in Phase 6. |
| Demo on `localhost` from phone fails (different network) | High | Use Expo tunnel or expose backend via ngrok/Supabase Edge; document in README. |
| Schema rewrite drops data the team already seeded by hand | Low | Communicate the reset; nobody has prod data. |
| Single dev tries to do all 3 role UIs sequentially | High | Split by role after Phase 5; the API contract from Phase 3 is the integration point. |
| Forgot-password endpoint demoed without working email | Med | Hide the FE entry point unless `EXPO_PUBLIC_ENABLE_FORGOT=true`. |

---

## 4. Suggested timeline (calendar against 2026-05-17 deadline)

| Day | Date | Phase | Owner suggestion |
|---|---|---|---|
| 1 | Wed 2026-05-13 | DB rewrite + Storage bucket | DB lead |
| 2 | Thu 2026-05-14 | Auth fixes + issue API skeleton | Backend lead |
| 3 | Fri 2026-05-15 | Manager/admin endpoints + RN navigation refactor | BE + Mobile lead |
| 4 | Sat 2026-05-16 (AM) | Community Member screens | Mobile A |
| 4 | Sat 2026-05-16 (PM) | Facility Manager screens | Mobile B |
| 5 | Sun 2026-05-17 (AM) | Worker screens + cross-cutting hardening | Mobile C + BE lead |
| 5 | Sun 2026-05-17 (PM) | Docs, smoke test, rehearse demo | All |

That leaves zero slack — start Phase 1 today.

---

## 5. Concrete first PRs (so work can start now)

1. **PR #1: `db/rewrite-schema`** — new `001_init.sql`, new `002_seed.sql`,
   `db:reset` script, README note about creating the Storage bucket. *Blocks
   everything else.*
2. **PR #2: `backend/auth-fixes`** — register/login/logout against new
   `users` table, `requireAuth` reads role from DB, `/auth/me`. Depends on #1.
3. **PR #3: `backend/issues-api`** — full §3 endpoint set + validators +
   `asyncHandler`. Depends on #1.
4. **PR #4: `mobile/role-navigation`** — split tabs per role, add Profile +
   Logout. Independent of #2/#3 if mocked.
5. **PRs #5a/#5b/#5c** — one per role's screens, can land in parallel once
   #3 and #4 are merged.
6. **PR #6: `docs/final`** — SRS update, API.md, DATABASE.md, README rewrite.

---

## 6. Acceptance checklist for the demo

The brief's §6 "user story coverage" is the rubric. Before the live demo,
walk through every High-priority story end-to-end on a phone (not a
simulator):

- [ ] CM signs up → logs in → submits issue with photo → sees it in My Issues with status `pending`.
- [ ] FM logs in → sees the new issue on Dashboard → assigns it to a worker (status flips to `assigned`).
- [ ] Worker logs in → sees the issue under Assigned → marks `in_progress` → adds comment → uploads completion photo → marks `resolved`.
- [ ] FM closes the resolved issue (status `closed`).
- [ ] CM sees the full timeline + comments + completion photo on detail screen.
- [ ] Logout works from all three roles and returns to Login.

If all six bullets pass on a real device, the milestone is demo-ready.
