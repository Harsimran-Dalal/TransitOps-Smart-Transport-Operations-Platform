# TransitOps

TransitOps is a production-oriented smart transport operations platform split into `backend` and `frontend` workspaces.

## Stack

- Backend: Node.js, Express, Prisma, PostgreSQL, JWT auth, bcrypt, Zod
- Frontend: React, Vite, TypeScript, React Router, TanStack Query, Recharts
- Shared: Zod schemas and domain enums

## Assumptions

- `revenue` is stored on `Trip` so vehicle ROI can be computed deterministically.
- Monetary and quantity values use decimal-like strings at the API boundary and `Decimal` in Prisma.

## Run

1. Install dependencies in the root and each workspace.
2. Set `backend/.env` and `frontend/.env` from the example files.
3. Run database migrations and seed data from the backend workspace.
4. Start the backend and frontend dev servers.

## Business rules

The backend enforces dispatch, completion, cancellation, maintenance, and role-based access rules server-side. The frontend only mirrors those constraints in the UI.

hi
