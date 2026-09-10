# Apply Progress — Sistema de Reservas — PR 6 (Phase 5: Email + Common)

Cumulative across batches. All completed tasks are marked `[x]` in
`openspec/changes/sistema-reservas/tasks.md`.

## Completed Tasks — cumulative

- Phase 1 (PR 1): [x] 1.1–1.8 — monorepo scaffolding, docker-compose PG16 (port 5435),
  Prisma schema (4 models + BookingStatus CONFIRMED/CANCELLED), idempotent seed (2 resources).
- Phase 2 (PR 2): [x] 2.1–2.7 — NestJS bootstrap + global ValidationPipe,
  ResourcesModule CRUD, prisma.service.ts.
- Phase 3 (PR 3): [x] 3.1–3.3 — AvailabilityModule slot generation (timezone-aware via
  Intl offset), GET /api/resources/:resourceId/availability?date=.
- Phase 4 (PR 4): [x] 4.1–4.4 — BookingsModule (create/list/cancel, double-booking
  prevention, fire-and-forget notification hook via `BOOKING_NOTIFICATION_SENDER` token).
  See prior apply-progress for full evidence.
- Phase 5 (PR 6, this batch) — tasks 5.1–5.6:
  - [x] 5.1 `packages/shared/src/emails/BookingConfirmation.tsx` — React Email template
    (resource name, guest name, formatted start/end times, resource timezone).
  - [x] 5.2 `packages/shared/src/emails/BookingCancellation.tsx` — React Email template,
    renderable with the same props (sending a cancellation email is out of scope).
  - [x] 5.3 `apps/api/src/email/email.service.ts` — Resend SDK send, fire-and-forget
    wrapper; lazy `process.env.RESEND_API_KEY`/`EMAIL_FROM` reads; missing key → degrades
    gracefully with a log line; never throws; default `noreply@resend.dev`.
  - [x] 5.4 `apps/api/src/email/email.module.ts` — provides `EmailService` and
    `BOOKING_NOTIFICATION_SENDER` (useExisting), exports both.
  - [x] 5.5 `apps/api/src/common/filters/http-exception.filter.ts` — global filter
    preserving the Nest error body `{ statusCode, message, error }` and adding `path` +
    `timestamp`; unknown exceptions fall back to a logged JSON 500 without internals.
  - [x] 5.6 `app.module.ts` registers `APP_FILTER` (HttpExceptionFilter) and
    `APP_PIPE` (ValidationPipe: whitelist, forbidNonWhitelisted, transform); `main.ts` is
    a bare bootstrap.

## Work Unit Evidence (Phase 5)

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @sistema-reservas/shared build` → clean; `pnpm --filter @sistema-reservas/api build` → clean; `pnpm --filter @sistema-reservas/api test:emails` → `[email-smoke] all assertions passed` (timezone formatting 10:00/11:00 AM America/Argentina/Buenos_Aires, confirmation + cancellation HTML contain booking details) |
| Runtime harness command/scenario and exact result | API booted from fresh build (`node dist/main`, port 3000, local PG 5435) + Node fetch harness (13 checks): GET /api/resources 200 + seed found; POST booking 201 with guestName; duplicate slot 409 with full error shape (statusCode/error/path/timestamp); invalid body 400 with message array + `error: "Bad Request"`; unknown resource 404; unknown route 404 with matching path; cancel cleanup 200 CANCELLED. Server log: `[EmailService] RESEND_API_KEY not set — skipping confirmation email (degraded mode)` — booking flow never blocked without a key |
| Rollback boundary | Email unit: `apps/api/src/email/` + bookings module/service rewiring + api `package.json` (dep+script) + `.env.example` + `scripts/emails.smoke.ts` + `tsconfig.json` (build fix); Common unit: `apps/api/src/common/filters/` + `app.module.ts` + `main.ts`; Shared unit: `packages/shared/*` + root `package.json` postinstall + lockfile. Each reverts without touching the others |

## Findings / Issues

- **Recurring build trap fixed at the root**: `nest build` (deleteOutDir) + tsc
  `incremental: true` produced an EMPTY or partial `dist` while exiting 0 (stale
  `tsconfig.tsbuildinfo`). Hit in PR 3/PR 4 and again this batch. Fix:
  `apps/api/tsconfig.json` → `"incremental": false` so every build emits a fresh dist.
- `set -x`-style PowerShell 5.1 quirks on this machine (native stdout capture corrupting
  JSON parsing, `Set-Content -Encoding UTF8` BOM poisoning bodies) — harness runs as a
  Node script; PowerShell only boots/stops the server. Not repo-affecting.
- Resend key is not set locally: confirmation emails cannot be observed end-to-end on
  this machine; the degraded-mode log line is the deterministic runtime evidence that the
  fire-and-forget path is wired. Failures never surface to the booking response.

## Deviations from Design

- **PR numbering**: tasks.md Work Units table labels this unit "PR 5", but
  `feat/fix-rebook-schema` consumed GitHub PR #5; this batch is PR #6. Branch
  `feat/pr-6-email` follows the actual PR chain (stacked-to-main; PRs #1–#5 merged).
- `app.module.ts` does not import `EmailModule` directly — `BookingsModule` already
  imports it, so the provider chain is complete without the redundant import.
- `packages/shared/src/index.ts` adds a `formatBookingEmailTime` helper (Intl-based,
  timezone-aware) used by both templates and exercised by the smoke test.
- Cancellation email exists (template + interface method stub) but sending is out of
  scope per design; `sendCancellation` is not wired to the cancel flow.

## Status

28/45 tasks complete. Ready for next batch (Phase 6: Frontend foundation, PR 7+).

## Workload / PR Boundary

- Mode: chained PR slice (stacked-to-main).
- Current work unit: `email-common-pr6` (attempt token `sha256:db29e616a4882f019651eeeedcf49d254c95d53059e4f8403e62a6884b45d2c4`).
- Boundary: starts at `origin/main` (PRs #1–#5 merged), ends at Phase 5 tasks complete.
- Authored changed lines: 661 code/config (343 in the shared slice + 318 in the API
  slice; `booking-notification.interface.ts` counted as a move, 8 changed lines;
  generated `pnpm-lock.yaml` 511 excluded from the count). Docs artifacts add 93
  more. Over the 400 budget → commits are grouped so the batch can land as TWO
  chained PRs under budget:
  - PR 6a — shared unit: 343 lines (`packages/shared/*`, root postinstall, lockfile).
  - PR 6b — API unit: 318 lines (email + common infra + tsconfig fix). Recommended
    unless the maintainer prefers a single `size:exception` PR 6 (661 code lines).