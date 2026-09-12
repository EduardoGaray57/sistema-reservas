# Apply Progress — Sistema de Reservas — PR 7 (Phases 6–7: Frontend)

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
- Phase 6 (PR 7, this batch) — tasks 6.1–6.6, frontend foundation:
  - [x] 6.1 `apps/web/index.html` + `tailwind.config.ts` (shell, "config": "") +
    `components.json` (hand-written, neutral base, new-york, cssVariables).
  - [x] 6.2 `src/main.tsx` — React entry + QueryClientProvider; routing shell in `App.tsx`.
  - [x] 6.3 `src/lib/api-client.ts` — typed fetch wrapper for all API endpoints
    (`API_BASE_URL` from `import.meta.env`/process, `ApiError` parsing Nest error bodies).
  - [x] 6.4 `src/types/index.ts` — Resource, Booking, AvailabilitySlot, AvailabilityResponse,
    ApiError, CreateBookingInput.
  - [x] 6.5 `src/lib/utils.ts` — `cn` + timezone-safe date helpers
    (`formatTimeInTimezone`, `formatDateLabel`, `toDateInputValue`, `todayInTimezone`).
  - [x] 6.6 shadcn/ui primitives via `pnpm dlx shadcn@latest add button card input calendar -y`
    (canonical v4; CLI also added `cn` + `radix-ui` deps and bumped react-day-picker to ^10.0.1).
- Phase 7 (PR 7, this batch) — tasks 7.1–7.7, frontend pages:
  - [x] 7.1 `src/App.tsx` — React Router with `/` and `/book/:id`.
  - [x] 7.2 `src/routes/Home.tsx` — resource directory via React Query.
  - [x] 7.3 `src/components/ResourceCard.tsx` — summary card linking to `/book/:id`.
  - [x] 7.4 `src/routes/BookingPage.tsx` — availability query keyed by selected date
    (defaults to today in the resource timezone), success panel, query invalidation on book.
  - [x] 7.5 `src/components/CalendarView.tsx` — single-mode calendar with a 61-day
    selectable window via `disabled` matchers.
  - [x] 7.6 `src/components/TimeSlotPicker.tsx` — slot grid in resource timezone with
    loading/error/empty states.
  - [x] 7.7 `src/components/BookingForm.tsx` — name + email form, POST mutation with React
    Query, controlled error display.

## Work Unit Evidence (Phase 5)

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --filter @sistema-reservas/shared build` → clean; `pnpm --filter @sistema-reservas/api build` → clean; `pnpm --filter @sistema-reservas/api test:emails` → `[email-smoke] all assertions passed` (timezone formatting 10:00/11:00 AM America/Argentina/Buenos_Aires, confirmation + cancellation HTML contain booking details) |
| Runtime harness command/scenario and exact result | API booted from fresh build (`node dist/main`, port 3000, local PG 5435) + Node fetch harness (13 checks): GET /api/resources 200 + seed found; POST booking 201 with guestName; duplicate slot 409 with full error shape (statusCode/error/path/timestamp); invalid body 400 with message array + `error: "Bad Request"`; unknown resource 404; unknown route 404 with matching path; cancel cleanup 200 CANCELLED. Server log: `[EmailService] RESEND_API_KEY not set — skipping confirmation email (degraded mode)` — booking flow never blocked without a key |
| Rollback boundary | Email unit: `apps/api/src/email/` + bookings module/service rewiring + api `package.json` (dep+script) + `.env.example` + `scripts/emails.smoke.ts` + `tsconfig.json` (build fix); Common unit: `apps/api/src/common/filters/` + `app.module.ts` + `main.ts`; Shared unit: `packages/shared/*` + root `package.json` postinstall + lockfile. Each reverts without touching the others |

## Work Unit Evidence (Phases 6–7)

| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web build` (script: `tsc --noEmit && vite build`) → clean; `vite v6.4.3` built `dist/` in ~7s, 2993 modules transformed, CSS 24.42 kB / JS 459.22 kB (gzip 144.31 kB). Run after EVERY slice commit (5/5 green) |
| Runtime harness command/scenario and exact result | API (`node dist/main`, port 3000) + Vite dev server (port 5173, `/api` proxy) running. `curl.exe` checks: `/` 200 (SPA html); `/book/:id` 200 (client-route fallback); `/src/routes/BookingPage.tsx` and `/src/components/CalendarView.tsx` module transforms 200; `GET /api/resources` via proxy → 2 seeded resources. Full booking round-trip via PS `Invoke-RestMethod` through the proxy: POST `{resourceId, startTime, guestName, guestEmail}` → 201 `CONFIRMED` (id `cmtxfkq680003ur5wb0o0ymoq`); PATCH `/api/bookings/:id/cancel` → `CANCELLED`; availability endpoint then shows the slot `available: true` again. Web.data state clean (no leftover confirmed bookings) |
| Rollback boundary | `apps/web/` + root `package.json` (postinstall) + `pnpm-lock.yaml` — the whole unit reverts without touching `apps/api/` or `packages/shared/`; slice commits already separate foundation/data/primitives (d08b114, d581f0c, 984b3d7) from pages (c2ebc9a, 84eac89) |

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
- **react-day-picker v10 removed `fromDate`/`toDate`** from the props API (they existed in
  v9 and are still in most tutorials). The shadcn CLI bumped the dep from ^9.14.0 to
  ^10.0.1; `CalendarView` now expresses the 61-day window with the `disabled` matchers
  `[{ before: fromDate }, { after: toDate }]` (boundary dates stay selectable) +
  `defaultMonth`. Verified against the installed `dist/esm/types/props.d.ts` (PropsBase).
- **Tailwind v4 legacy-config trap**: colors declared in `tailwind.config.ts` `theme`
  cannot generate `border-border` (the `border-*` utilities collide with the
  `border-width` namespace). Fix: tokens live in `src/index.css` (`:root` HSL triplets)
  mapped via `@theme inline`; `tailwind.config.ts` is a config-shell (`darkMode: "class"`,
  empty `extend`) kept because the change contract requires the file.
- **shadcn v4 canonical components import `cn` from the `cn` package** (not
  `@/lib/utils`); app-level components import `cn` from `@/lib/utils` re-export. The CLI
  left the hand-written `components.json`/`index.css` untouched on `add`.
- PowerShell 5.1 on this machine mangles `curl.exe -d "{\"...\"}"` payloads (native-arg
  quote mangling → `Expected property name ... JSON at position 1`); use PS-native
  `Invoke-RestMethod` or a Node harness for JSON bodies. `pnpm --dir apps/web` (root
  `--filter` broken); vite must run via `apps/web/node_modules/vite/bin/vite.js` (no hoisted
  root symlink under strict pnpm); `pnpm exec shadcn` can't fetch package specs —
  `pnpm dlx shadcn@latest` works.

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
- **PR numbering (frontend)**: tasks.md Work Units table labels foundation "PR 6" and
  pages "PR 7", but GitHub PR #6 was consumed by the email+common batch, so this
  frontend batch is PR #7 in the chain (branch `feat/pr-6-email-api`, stacked-to-main).
- Web build script deviates from the stock Vite template: `tsc -b && vite build` →
  `tsc --noEmit && vite build` (vite 6 transpiles via esbuild; type-check is a separate
  explicit step and stays part of the build so commits are gated on clean types).
- shadcn v4 `ui/*` components import `cn` from the `cn` package (CLI convention), not
  from `@/lib/utils`; `@/lib/utils` re-exports `cn` for app-level code.
- `components.json` was hand-written before `shadcn add` (matches contract 6.1); the CLI
  left it and `index.css` untouched, and only added the Calendar/Button/Card/Input
  components plus `cn`/`radix-ui` deps and the react-day-picker v10 bump.
- `tailwind.config.ts` is a config-shell (see Findings) because the Tailwind v4
  legacy-config path cannot produce the `border-border` utility; the real tokens are in
  `src/index.css` via `@theme inline`.

## Status

41/45 tasks complete. Ready for next batch (Phase 8: Integration tests, PR 8).

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

### Work unit: `frontend-pr7` (this batch)

- Boundary: starts at the Phase 5 commits, ends at Phase 7 tasks complete. 5 commits
  on `feat/pr-6-email-api`:
  - `d08b114` feat(web): establish frontend foundation with Tailwind v4 and routing shell (~284)
  - `d581f0c` feat(web): add typed API client and contract types for the booking API (148)
  - `984b3d7` feat(web): add shadcn/ui primitives (button, card, input, calendar) (~392)
  - `c2ebc9a` feat(web): render resource directory on the home route (~121)
  - `84eac89` feat(web): add booking flow with calendar, slots, and form (432)
- Authored changed lines: 1,377 code/config across the 5 commits (lockfile churn in
  d08b114/984b3d7 excluded; slice counts are authored code lines). Docs artifacts add
  ~90 more. Over the 400 budget → land as TWO chained PRs at the natural seam:
  - PR 7a — foundation + data + primitives: d08b114 + d581f0c + 984b3d7 (824 lines).
  - PR 7b — pages: c2ebc9a + 84eac89 (553 lines). Recommended unless the maintainer
    prefers a single `size:exception` PR 7 (1,377 code lines).