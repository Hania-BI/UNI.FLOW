# CampusCare API Documentation

All endpoints return JSON. Protected endpoints require `Authorization: Bearer <token>` (Supabase Access Token).

## Database Tables (Supabase)
- `community_members`: Profile data for students/staff.
- `facility_managers`: Profile data for managers.
- `workers`: Profile data for maintenance staff.
- `locations`: Unique campus locations (building, floor, room).
- `tickets`: The main issue records (was `issues`).
- `ticket_status_log`: History of status changes for each ticket.

## Authentication APIs

### `POST /api/auth/register`
- **Body:** `{ "name", "email", "password", "role" }`
- **Roles:** `community_member`, `facility_manager`, `worker`

### `POST /api/auth/login`
- **Body:** `{ "email", "password" }`
- **Response:** `{ "token", "user" }`

### `POST /api/auth/forgot-password`
- **Body:** `{ "email" }`

## Ticket Management APIs

### `POST /api/issues`
Submit a new ticket.
- **Body:** multipart/form-data with `description`, `category`, `building`, `floor`, `room`, `photo`.

### `GET /api/issues`
Get all tickets (FM / Admin).

### `GET /api/issues/my`
Get current user's submitted tickets (CM).

### `GET /api/issues/:id`
Get ticket details (including location and status log).

### `PUT /api/issues/:id/status`
Update ticket status (FM / Worker).

### `PUT /api/issues/:id/assign`
Assign worker to ticket (FM).
