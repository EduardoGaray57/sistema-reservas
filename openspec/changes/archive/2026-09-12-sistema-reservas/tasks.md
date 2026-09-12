# Tasks: Sistema de Reservas

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1500–2000 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 8 PRs (see work units) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Monorepo scaffolding + Prisma schema + DB | PR 1 | `pnpm prisma validate && pnpm prisma db push` | docker-compose up -d | Root configs + apps/api/prisma/ removable without affecting future PRs |
| 2 | Resources CRUD module | PR 2 | `curl -X POST localhost:3000/api/resources` | Local API + PG | apps/api/src/resources/ removable standalone |
| 3 | Availability service + endpoint | PR 3 | `curl localhost:3000/api/resources/{id}/availability?date=2026-09-11` | Create resource with schedule via PR 2 API, then query | apps/api/src/availability/ removable standalone |
| 4 | Bookings module (double-booking prevention) | PR 4 | `curl -X POST localhost:3000/api/bookings` twice on same slot → expect 409 | Availability endpoint from PR 3 | apps/api/src/bookings/ removable standalone |
| 5 | Email module + common infra | PR 5 | Manual: book a slot, check Resend dashboard for email | Resend API key + test email | apps/api/src/email/ + common/ removable standalone |
| 6 | Frontend foundation (Vite, React, shadcn, API client) | PR 6 | `pnpm --filter web dev` → loads with no errors | Browser: http://localhost:5173 | apps/web/ removable standalone |
| 7 | Frontend pages (Home, BookingPage, routing) | PR 7 | Manual: browse resource list, pick date, select slot, submit booking | Full stack running | apps/web/src/routes/ + components/ removable |
| 8 | Integration tests (API endpoints) | PR 8 | `pnpm --filter api test` | docker-compose + test DB | Test files only, zero production risk |

## Phase 1: Monorepo + Infrastructure

- [x] 1.1 Create `package.json` (pnpm workspace root) and `pnpm-workspace.yaml` with `apps/*` + `packages/*`
- [x] 1.2 Create `docker-compose.yml` with PostgreSQL 16 service (port 5432, volume for persistence)
- [x] 1.3 Create `apps/api/`: `package.json` (NestJS deps), `tsconfig.json`, `nest-cli.json`
- [x] 1.4 Create `apps/web/`: `package.json` (React + Vite + shadcn deps), `vite.config.ts`, `tsconfig.json`
- [x] 1.5 Create `packages/shared/`: `package.json`, `tsconfig.json`, `src/index.ts`
- [x] 1.6 Create `apps/api/prisma/schema.prisma` with all 4 models + BookingStatus enum from design
- [x] 1.7 Create `apps/api/prisma/seed.ts` — 2 sample resources with schedules
- [x] 1.8 Run `pnpm install`, `docker-compose up -d`, `pnpm prisma db push`, `pnpm prisma db seed`

## Phase 2: Backend — Resources Module

- [x] 2.1 Create `apps/api/src/main.ts` — NestJS bootstrap with global ValidationPipe
- [x] 2.2 Create `apps/api/src/app.module.ts` — register ResourcesModule + future modules
- [x] 2.3 Create `apps/api/src/resources/dto/create-resource.dto.ts` — class-validator decorators
- [x] 2.4 Create `apps/api/src/resources/dto/update-resource.dto.ts` — PartialType of create
- [x] 2.5 Create `apps/api/src/resources/resources.service.ts` — CRUD with PrismaClient
- [x] 2.6 Create `apps/api/src/resources/resources.controller.ts` — GET/POST/PATCH/DELETE endpoints
- [x] 2.7 Create `apps/api/src/resources/resources.module.ts`

## Phase 3: Backend — Availability Module

- [x] 3.1 Create `apps/api/src/availability/availability.service.ts` — slot generation algorithm (load schedule → generate candidates → subtract bookings/blocks)
- [x] 3.2 Create `apps/api/src/availability/availability.controller.ts` — GET /api/resources/:id/availability?date=
- [x] 3.3 Create `apps/api/src/availability/availability.module.ts`

## Phase 4: Backend — Bookings Module

- [x] 4.1 Create `apps/api/src/bookings/dto/create-booking.dto.ts` — resourceId, startTime, guestName, guestEmail with validation
- [x] 4.2 Create `apps/api/src/bookings/bookings.service.ts` — availability check → Prisma insert → 409 on unique violation → fire-and-forget email call
- [x] 4.3 Create `apps/api/src/bookings/bookings.controller.ts` — GET (list by resourceId+date), POST (create), PATCH /:id/cancel
- [x] 4.4 Create `apps/api/src/bookings/bookings.module.ts`

## Phase 5: Backend — Email + Common

- [x] 5.1 Create `packages/shared/src/emails/BookingConfirmation.tsx` — React Email template
- [x] 5.2 Create `packages/shared/src/emails/BookingCancellation.tsx` — React Email template
- [x] 5.3 Create `apps/api/src/email/email.service.ts` — Resend SDK send, fire-and-forget wrapper
- [x] 5.4 Create `apps/api/src/email/email.module.ts`
- [x] 5.5 Create `apps/api/src/common/filters/http-exception.filter.ts`
- [x] 5.6 Register ExceptionFilter and ValidationPipe globally in `app.module.ts`

## Phase 6: Frontend — Foundation

- [x] 6.1 Create `apps/web/index.html`, `apps/web/tailwind.config.ts`, `apps/web/components.json`
- [x] 6.2 Create `apps/web/src/main.tsx` — React entry + QueryClientProvider
- [x] 6.3 Create `apps/web/src/lib/api-client.ts` — typed fetch wrapper for all API endpoints
- [x] 6.4 Create `apps/web/src/types/index.ts` — Resource, Booking, Slot, AvailabilityResponse
- [x] 6.5 Create `apps/web/src/lib/utils.ts` — date formatting helpers
- [x] 6.6 shadcn/ui primitives installed (`pnpm dlx shadcn@latest add button card input calendar -y`; components.json hand-written in 6.1)

## Phase 7: Frontend — Pages

- [x] 7.1 Create `apps/web/src/App.tsx` — React Router with routes for / and /book/:id
- [x] 7.2 Create `apps/web/src/routes/Home.tsx` — resource list using ResourceCard grid + React Query
- [x] 7.3 Create `apps/web/src/components/ResourceCard.tsx` — resource summary card with link to /book/:id
- [x] 7.4 Create `apps/web/src/routes/BookingPage.tsx` — date picker + TimeSlotPicker + BookingForm
- [x] 7.5 Create `apps/web/src/components/CalendarView.tsx` — shadcn Calendar wired to availability query
- [x] 7.6 Create `apps/web/src/components/TimeSlotPicker.tsx` — grid of slots from availability API
- [x] 7.7 Create `apps/web/src/components/BookingForm.tsx` — guestName + email form, POST mutation with React Query

## Phase 8: Testing

- [ ] 8.1 Unit test: `apps/api/src/availability/availability.service.spec.ts` — slot math with various schedules, booking overlaps, blocked time overlaps
- [ ] 8.2 Unit test: `apps/api/src/bookings/bookings.service.spec.ts` — conflict detection returns 409, success path returns booking, email fires async
- [ ] 8.3 Integration test: `apps/api/test/resources.e2e-spec.ts` — POST/GET/PATCH/DELETE via Supertest against test DB
- [ ] 8.4 Integration test: `apps/api/test/bookings.e2e-spec.ts` — full booking flow, double-booking returns 409, availability shows slot as taken
