# UNIFLOW — CampusCare

Smart Facility Management System for university campuses.

## Project Structure

- `backend/`: Node.js Express API with Prisma ORM and PostgreSQL.
- `mobile/`: React Native Expo application for Community Members, Managers, and Workers.
- `docs/`: Design documents, API specs, and setup guides.

## Quick Start

### Backend
1. `cd backend`
2. `npm install`
3. Configure `.env`
4. `npx prisma migrate dev`
5. `npm run dev`

### Mobile
1. `cd mobile`
2. `npm install`
3. Configure `EXPO_PUBLIC_API_URL`
4. `npx expo start`

## Roles
- **Community Member:** Report issues, view status.
- **Facility Manager:** Assign tasks, manage workforce.
- **Worker:** Update task progress, resolve issues.
