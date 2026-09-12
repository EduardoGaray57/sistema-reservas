# Design: Sistema de Reservas

## Technical Approach

NestJS REST API serving a React SPA. PostgreSQL as source of truth with Prisma ORM. Slot availability computed at query time from schedules, bookings, and blocked times. Composite unique constraint on `(resourceId, startTime)` as the safety net against double-booking. Monorepo via pnpm workspaces with a shared types package.

## Architecture Decisions

| Decision | Alternatives | Rationale |
|----------|-------------|-----------|
| NestJS over Express/Fastify raw | Express minimal, Fastify raw | NestJS DI + module system scales with feature modules (resources, bookings, availability, email). TypeORM rejected — Prisma has better DX and migration story. |
| Prisma over Drizzle/Knex | Drizzle (lighter), Knex (manual) | Prisma schema = single source of truth for DB + types. Auto-generated client eliminates hand-written query builders. Migration workflow is solid. |
| Slot generation at query time vs pre-computed | Pre-compute and store slots | Simpler model: schedules define availability, bookings/blocks subtract from it. No slot table to keep in sync. Tradeoff: slightly heavier reads, but queries are fast with proper indexes. |
| React Email + Resend over Nodemailer | Nodemailer + MJML, SendGrid | React Email gives JSX templates that compile to HTML. Resend has generous free tier. Nodemailer requires SMTP config. |
| pnpm workspaces over Turborepo/nx | Turborepo, Nx | pnpm workspaces are sufficient for 3 packages. No build caching needed at this scale. Turborepo adds complexity without benefit yet. |
| Railway (API+DB) + Vercel (web) | Full Railway, Vercel + Supabase | Railway handles WebSocket/long-running processes well for API. Vercel excels at static/frontend deploys. Decoupled scaling. |

## Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Resource {
  id                  String     @id @default(cuid())
  name                String
  description         String?
  slotDurationMinutes Int        @default(30)
  timezone            String     @default("America/Argentina/Buenos_Aires")
  createdAt           DateTime   @default(now())
  updatedAt           DateTime   @updatedAt

  schedules   Schedule[]
  bookings    Booking[]
  blockedTimes BlockedTime[]

  @@map("resources")
}

model Schedule {
  id         String   @id @default(cuid())
  resourceId String
  dayOfWeek  Int      // 0=Sunday .. 6=Saturday
  startTime  String   // "09:00" — stored as HH:mm in resource timezone
  endTime    String   // "17:00"

  resource Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@unique([resourceId, dayOfWeek])
  @@index([resourceId])
  @@map("schedules")
}

model Booking {
  id         String   @id @default(cuid())
  resourceId String
  startTime  DateTime
  endTime    DateTime
  guestName  String
  guestEmail String
  status     BookingStatus @default(CONFIRMED)
  createdAt  DateTime @default(now())

  resource Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@unique([resourceId, startTime])
  @@index([resourceId, startTime])
  @@index([guestEmail])
  @@map("bookings")
}

model BlockedTime {
  id         String   @id @default(cuid())
  resourceId String
  startTime  DateTime
  endTime    DateTime
  reason     String?
  createdAt  DateTime @default(now())

  resource Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  @@index([resourceId, startTime, endTime])
  @@map("blocked_times")
}

enum BookingStatus {
  CONFIRMED
  CANCELLED
}
```

**Key constraint**: `@@unique([resourceId, startTime])` on Booking prevents two bookings at the same resource+start time at the DB level. The application layer checks before insert to return a clean 409 instead of a raw PG error.

## API Contracts

### Resources

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/resources` | — | `Resource[]` |
| POST | `/api/resources` | `{ name, description?, slotDurationMinutes?, timezone? }` | `Resource` |
| GET | `/api/resources/:id` | — | `Resource` |
| PATCH | `/api/resources/:id` | `{ name?, description?, slotDurationMinutes?, timezone? }` | `Resource` |
| DELETE | `/api/resources/:id` | — | `204` |

### Availability

| Method | Path | Query | Response |
|--------|------|-------|----------|
| GET | `/api/resources/:id/availability` | `date` (ISO date string) | `{ resource, date, slots: [{ startTime, endTime, available }] }` |

The `date` parameter drives slot generation. Response includes all potential slots for that day (from Schedule), with `available: false` for any slot that overlaps a Booking (CONFIRMED) or BlockedTime.

### Bookings

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/bookings?resourceId=&date=` | query params | `Booking[]` |
| POST | `/api/bookings` | `{ resourceId, startTime, guestName, guestEmail }` | `Booking` (201) or `409 Conflict` |
| PATCH | `/api/bookings/:id/cancel` | — | `Booking` (status→CANCELLED) |

**POST /api/bookings flow**: validate input → check slot is available (no overlap with existing bookings or blocked times) → insert with Prisma transaction → send confirmation email async → return booking. On unique constraint violation → 409.

### Admin (Phase 2)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/admin/blocked-times` | `{ resourceId, startTime, endTime, reason? }` | `BlockedTime` |
| DELETE | `/api/admin/blocked-times/:id` | — | `204` |
| GET | `/api/admin/bookings` | `?resourceId=&status=` | `Booking[]` |

## Slot Generation Algorithm

```
getAvailableSlots(resourceId, date):
  1. Load resource → get slotDurationMinutes, timezone
  2. Load schedule for dayOfWeek(date) → get startTime, endTime
  3. Generate candidate slots: from schedule.startTime to schedule.endTime
     stepping by slotDurationMinutes. Each slot = [start, start + duration]
  4. Load existing bookings WHERE resourceId AND date range overlaps,
     status = CONFIRMED
  5. Load blocked times WHERE resourceId AND date range overlaps
  6. Mark any candidate slot that overlaps a booking or block as available: false
  7. Return all candidates (frontend shows available slots prominently,
     hides or grays out unavailable)
```

Timezone handling: all stored datetimes are UTC. The schedule's HH:mm times are interpreted in the resource's timezone, converted to UTC for comparison.

## Double-Booking Prevention Flow

```
Client                  API                     DB
  │                      │                       │
  ├─ POST /bookings ────►│                       │
  │                      ├─ validate input       │
  │                      ├─ check availability ──►│  (SELECT ... WHERE overlap)
  │                      │◄─ rows ───────────────┤
  │                      │                       │
  │                      ├─ INSERT booking ──────►│  @@unique enforced
  │                      │◄─ success/conflict ───┤
  │                      │                       │
  │                      ├─ send email (async)    │
  │◄─ 201 / 409 ────────┤                       │
```

The application-level check catches ~99% of conflicts gracefully. The DB constraint is the atomic safety net for race conditions.

## Frontend Architecture

```
apps/web/src/
├── main.tsx                    # React entry, providers
├── App.tsx                     # React Router setup
├── routes/
│   ├── Home.tsx                # Resource list (ResourceCard grid)
│   ├── BookingPage.tsx         # Calendar + form for one resource
│   └── AdminPage.tsx           # Admin dashboard (Phase 2)
├── components/
│   ├── ResourceCard.tsx        # Resource summary card
│   ├── CalendarView.tsx        # shadcn Calendar + date picker
│   ├── TimeSlotPicker.tsx      # Grid of available time slots
│   └── BookingForm.tsx         # Name + email form, submits booking
├── lib/
│   ├── api-client.ts           # fetch wrapper, typed functions
│   └── utils.ts                # date formatting, timezone helpers
└── types/
    └── index.ts                # Shared types (from packages/shared)
```

**State management**: React Query (TanStack Query) for server state (resources, availability, bookings). No global store needed — each page manages its own form state with `useState`. React Query handles caching, refetching, and optimistic updates for the booking mutation.

**API client**: Generated from NestJS Swagger (OpenAPI) plugin. `@nestjs/swagger` generates the spec at `/api/docs/json`. Use `openapi-typescript` at build time to generate `api-client.ts` types.

## Email Templates (React Email)

Two templates in `packages/shared/src/emails/`:

1. **BookingConfirmation.tsx** — receives `{ guestName, resourceName, startTime, endTime, timezone }`. Renders a clean HTML email with booking details and a "Manage your booking" link.
2. **BookingCancellation.tsx** — receives same props. Confirms cancellation.

Sent via Resend SDK (`resend.emails.send`) called from the booking service after successful insert. Fire-and-forget — email failure does not block booking creation (log error, retry is out of scope for v1).

## Folder Structure

```
sistema-reservas/
├── package.json                    # pnpm workspace root
├── pnpm-workspace.yaml             # packages: apps/*, packages/*
├── docker-compose.yml              # PostgreSQL for local dev
├── apps/
│   ├── api/                        # NestJS backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── common/
│   │       │   ├── filters/        # HttpExceptionFilter
│   │       │   └── pipes/          # ValidationPipe setup
│   │       ├── resources/
│   │       │   ├── resources.module.ts
│   │       │   ├── resources.controller.ts
│   │       │   ├── resources.service.ts
│   │       │   └── dto/
│   │       ├── availability/
│   │       │   ├── availability.module.ts
│   │       │   ├── availability.controller.ts
│   │       │   └── availability.service.ts
│   │       ├── bookings/
│   │       │   ├── bookings.module.ts
│   │       │   ├── bookings.controller.ts
│   │       │   ├── bookings.service.ts
│   │       │   └── dto/
│   │       └── email/
│   │           ├── email.module.ts
│   │           └── email.service.ts
│   └── web/                        # React + Vite frontend
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── index.html
│       ├── tailwind.config.ts
│       ├── components.json          # shadcn/ui config
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── routes/
│           ├── components/
│           ├── lib/
│           └── types/
├── packages/
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── types/              # Shared TypeScript interfaces
│           ├── emails/             # React Email templates
│           └── index.ts
└── openspec/
    └── changes/
        └── sistema-reservas/
            ├── proposal.md
            └── design.md
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Availability service (slot generation) | Jest — mock Prisma, test pure slot math with various schedules |
| Unit | Booking service (conflict detection) | Jest — mock Prisma, verify 409 path and success path |
| Integration | API endpoints | Jest + Supertest — real Prisma against test DB, verify HTTP status + response shape |
| E2E | Full booking flow | Playwright — create resource, pick slot, submit, verify confirmation |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. `prisma db push` for dev, `prisma migrate deploy` for production. Seed script creates 2-3 sample resources with schedules for testing.

## Open Questions

- [ ] Should the availability endpoint return UTC times or resource-local times? (Recommendation: UTC in API, convert in frontend)
- [ ] Phase 2 admin auth: simple API key or full auth system? (Deferring to Phase 3 per proposal)
