# Sistema de Reservas

Booking system for bookable resources (restaurants, meeting rooms, etc.) with timezone-aware availability, email confirmations, and a web booking flow. Monorepo managed with pnpm: a NestJS + Prisma API, a React + Vite web app, and a shared email/type package.

## Features

- Resource CRUD (name, description, timezone, slot duration, weekly schedule).
- Timezone-aware availability: generates slots from the resource schedule minus existing bookings and blocked times.
- Booking flow: create (with double-booking prevention), list by resource + date, cancel (frees the slot for re-booking).
- Email confirmations: rendered from React Email templates in the shared package, sent via local SMTP (Mailpit) or Resend. Fire-and-forget — email failures never fail a booking.
- Pick-up-and-go seed: two sample resources with weekly schedules.
- Tests: unit (slot generation, booking rules) and end-to-end against a real local Postgres.

## Tech stack

| Layer | Choice |
|-------|--------|
| API | NestJS 11, Prisma 6, class-validator / class-transformer, nodemailer 10, Resend SDK |
| Web | React 19, Vite 6, React Router 7, TanStack Query 5, Tailwind CSS 4, shadcn/ui primitives, react-day-picker 10 |
| Shared | `@sistema-reservas/shared` — React Email templates + render/time helpers (@react-email) |
| Database | PostgreSQL 16 (Docker Compose), Prisma ORM |
| Tooling | pnpm 10 workspaces, Node >= 20, TypeScript 5.7, Jest 29 + Supertest |

## Repository structure

```
sistema-reservas/
├── apps/
│   ├── api/                 # NestJS API (port 3000)
│   │   ├── prisma/          # schema.prisma + partial-unique-bookings.sql
│   │   ├── scripts/         # emails.smoke.ts
│   │   ├── src/             # resources, availability, bookings, email, common
│   │   └── test/            # e2e specs (real Postgres, self-cleaning)
│   └── web/                 # React + Vite SPA (port 5173, /api proxy)
├── packages/
│   └── shared/              # @sistema-reservas/shared — email templates + types
└── openspec/                # design docs: specs/ (base) + changes/archive/
```

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- Docker (for PostgreSQL 16 on port **5435**)

## Quick start

```bash
# 1. Install dependencies (postinstall builds the shared package)
pnpm install

# 2. Start PostgreSQL 16 (container "sistema-reservas-db", host port 5435)
docker compose up -d

# 3. Configure the API environment
#    Copy apps/api/.env.example to apps/api/.env (already sets DATABASE_URL
#    for the local DB; leave RESEND_API_KEY empty for degraded email mode).

# 4. Create the schema — run ALL of these (see Database notes)
pnpm --dir apps/api prisma db push
pnpm --dir apps/api prisma db execute --file prisma/partial-unique-bookings.sql

# 5. Seed 2 sample resources ("Cozy Corner Restaurant", "Meeting Room A")
pnpm --dir apps/api seed

# 6. Run API + web in dev mode (web proxies /api to localhost:3000)
pnpm dev
```

Open <http://localhost:5173> — pick a resource, choose a date in its timezone, and confirm a slot. The API is at <http://localhost:3000/api>.

> Note: task scripts (prisma, seed, test, test:e2e, build…) run inside a workspace app with `pnpm --dir apps/<app> <script>`. Root scripts (`dev`, `build`, `lint`) use pnpm `--filter`/`--parallel` over the workspace.

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm install` | Install + build `@sistema-reservas/shared` (postinstall) |
| `pnpm dev` | Run API (`nest start --watch`) and web (`vite`) in parallel |
| `pnpm build` | Build shared package first, then apps (`nest build` / `tsc --noEmit && vite build`) |
| `pnpm lint` | ESLint for both apps |
| `pnpm --dir apps/api prisma db push` | Sync Prisma schema to the DB (see Database notes) |
| `pnpm --dir apps/api seed` | Idempotent seed of 2 resources + schedules |
| `pnpm --dir apps/api test` | Unit tests (Jest): availability + bookings specs |
| `pnpm --dir apps/api test:e2e` | E2E specs (Supertest) against the real local Postgres |
| `pnpm --dir apps/api test:emails` | Email smoke test (template render + timezone formatting) |

## Testing

- Unit: 13 tests — `availability.service.spec.ts` (6: slot stepping, booking overlap, blocked-time overlap, no-schedule day, unknown resource) and `bookings.service.spec.ts` (7: time math, fire-and-forget email, overlap/blocked/P2002 race → 409, unknown resource → 404).
- E2E: 16 tests — `resources.e2e-spec.ts` (7: CRUD + validation) and `bookings.e2e-spec.ts` (9: full cycle, double-book 409, cancel frees slot, re-book works).
- E2E boots the real `AppModule` against the real local Postgres (port 5435). Each spec creates its own resources and cleans up via `deleteMany` (cascade removes schedules, bookings, blocked times).
- Email smoke: `pnpm --dir apps/api test:emails` — asserts both templates render booking details and time formatting honors the resource timezone.

## Database notes

- Models: `Resource`, `Schedule` (weekly: dayOfWeek 0=Sunday…6, start/end `"HH:mm"`, unique per resource+day), `Booking` (status `CONFIRMED`/`CANCELLED`), `BlockedTime`.
- Resource defaults: `slotDurationMinutes: 30`, `timezone: America/Argentina/Buenos_Aires`.
- **Important**: a booking slot can be re-booked once the previous booking is cancelled, so slot uniqueness is status-aware. Prisma cannot express partial indexes, so this lives in `prisma/partial-unique-bookings.sql` (`bookings_resourceId_startTime_confirmed_uq` on `(resourceId, startTime)` WHERE `status = 'CONFIRMED'`).
- **`prisma db push` does NOT apply that index.** Run the `prisma db execute` command from Quick start after every `db push` (and after a DB reset). The index is what backs the P2002 → 409 double-booking race protection in the API.

## Email in development

Transport resolution (per send, logged by the API): **SMTP** (`MAIL_HOST` + `MAIL_PORT`) → **Resend** (`RESEND_API_KEY`) → **degraded** (skip + log line; booking still succeeds).

- For local inbox testing, run [Mailpit](https://mailpit.axllent.org/) yourself (not part of docker-compose). Mailpit defaults: SMTP `127.0.0.1:1025` (no TLS), web UI <http://localhost:8025>.
- In `apps/api/.env`: `MAIL_HOST=127.0.0.1`, `MAIL_PORT=1025`. Emails then land in the Mailpit UI, and the API logs `Confirmation email sent to <to> via SMTP`.
- With no transport vars set, the API logs the degraded-mode line but the booking request is never affected.

