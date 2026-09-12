```yaml
schema: gentle-ai.archive-result/v1
change: sistema-reservas
archived_at: 2026-09-12
verdict: pass_with_warnings
evidence_revision: sha256:e8c9d053dfc956242415fb8e485f8fd3a5b910c4068c275a21cc617df947f8de
tasks_total: 45
tasks_complete: 45
requirements: 20/20
scenarios: 38/38
tests: 29/29 (13 unit + 16 e2e)
build: clean (nest build, exit 0)
change_folder_move: deferred to orchestrator PR slicing (delivery strategy: no commits/moves this phase)
```

# Archive Report: Sistema de Reservas

**Change**: sistema-reservas
**Archived at**: 2026-09-12 (interactive run; orchestrator relays results)
**Verification verdict**: PASS WITH WARNINGS

## Change Summary

Greenfield booking/reservation system delivered as a pnpm monorepo (`apps/api` NestJS +
Prisma/PostgreSQL, `apps/web` React + Vite + shadcn/ui, `packages/shared` shared types +
React Email templates). Scope delivered across 8 phases / 45 tasks: monorepo + DB
infrastructure, resource CRUD, availability slot generation, booking flow with
double-booking prevention, email module (fire-and-forget), frontend foundation + pages,
and integration/unit tests. Managed as a chained PR series stacked to `main`; Phase 8
working-tree slices are uncommitted and are the next delivery step (see Next Steps).

## Verification Outcome (state at close)

- **Verdict**: PASS WITH WARNINGS — no CRITICAL findings open, 0 blockers.
- **Evidence revision**: `sha256:e8c9d053dfc956242415fb8e485f8fd3a5b910c4068c275a21cc617df947f8de`
  (covers test + build output hashes).
- **Tests**: 29/29 green — `pnpm --dir apps/api test` 13/13 (availability.service.spec 6,
  bookings.service.spec 7); `pnpm --dir apps/api test:e2e` 16/16 (resources 7, bookings 9)
  against the live local PG test DB (sistema-reservas-db, port 5435).
- **Build**: `nest build` clean (exit 0).
- **Spec compliance**: 20/20 requirements, 38/38 scenarios carrying covering evidence
  (24 fully compliant + 14 partial-by-inspection; 0 untested, 0 failing).
- **Pre-flight CRITICAL (re-book-after-cancel → P2002 409) — RESOLVED in the running
  environment during verify**: the live test DB holds only a CONFIRMED-only partial
  unique index (`bookings_resourceId_startTime_confirmed_uq`, applied via
  `apps/api/prisma/partial-unique-bookings.sql`), and the e2e scenario "re-booking a
  cancelled slot → 201" passes. This is verified final behavior, not a proposal change.
  Fix commit `9de664a` (per verify-report, merged on `main` at verification time).
- **Dependency pin (deliberate)**: `@nestjs/mapped-types` pinned to the CJS major
  (`^2.0.6` / v2); v12 is ESM-only and breaks the Jest 29 CJS runtime. Documented in
  apply-progress and `apps/api/package.json`.
- **Email contract**: fire-and-forget; degrades without `RESEND_API_KEY`; booking kept
  even when email delivery/render fails (e2e boot log proves it). Real email
  (Gmail/Resend) is production-only by user decision.

## Synced Specs (delta merged into project base specs)

The project `openspec/specs/` was empty (only `.gitkeep`) — no base specs existed, so
each delta spec IS a full spec for its domain. Per the Mechanical Copy Contract, each was
copied byte-identically (SHA256 + `fc /b` readback, PASS) and requirement headings were
then reconciled with the verify-report's numbering (additive heading edit only; all
scenarios/body content preserved). 20 requirements total (5 AVAIL + 6 BOOK + 4 EMAIL + 5
RES), 38 scenarios.

| Domain | Base spec path | Requirements | Scenarios |
|--------|----------------|--------------|-----------|
| availability-calendar | `openspec/specs/availability-calendar/spec.md` | AVAIL-01..05 | 8 |
| booking | `openspec/specs/booking/spec.md` | BOOK-01..06 | 12 |
| email-notifications | `openspec/specs/email-notifications/spec.md` | EMAIL-01..04 | 6 |
| resource-management | `openspec/specs/resource-management/spec.md` | RES-01..05 | 12 |

Reconciliation note: delta specs use named requirement headings without ID prefixes; the
base specs now carry the authoritative IDs from the verify-report compliance matrix
(e.g. `### Requirement: AVAIL-01 Get Available Slots`). Post-edit verification confirmed
the ONLY differences vs. the delta specs are the 20 ID-prefixed heading lines (40 diff
lines: 20 removed + 20 added) — no other byte changed.

## Outstanding Warnings

1. **Partial-index reproducibility (operator-facing)**: the DB-level double-booking
   safety net lives in `apps/api/prisma/partial-unique-bookings.sql` and is NOT applied
   by `prisma db push` from `schema.prisma` (the schema only carries a comment + a plain
   `@@index`). A fresh DB provisioned with push alone gets NO DB-level uniqueness — only
   the app-level overlap check guards double-booking. The current live test DB is correct;
   this is a fresh-environment footgun.
2. **Uncommitted working-tree state (PR slicing pending)**: Phase 8 changes remain
   uncommitted — test files (`apps/api/src/**/*.spec.ts`, `apps/api/test/*.e2e-spec.ts`),
   2 jest configs, `apps/api/package.json` (test scripts + devDeps + mapped-types pin),
   `pnpm-lock.yaml`, and the openspec docs (this archive included). No commits/pushes/PRs
   were made in this phase per the delivery strategy. PR slicing is the next step.
3. **Email rendering under Jest VM**: `react-email` render uses dynamic import, which the
   Jest 29 VM rejects (`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG`); the fire-and-forget
   path absorbs it and the booking is kept (this is the failure-mode proof of the design
   contract). Also: the e2e test title "emails are mocked out (no SMTP/Resend needed)"
   overstates its mechanism — there is no provider override; the real EmailService runs
   and degrades. Cosmetic, but the title is misleading.
4. **Cosmetic (verify-time only)**: orphaned test row "E2E Meeting Room" in the live test
   DB from an interrupted apply-phase run; seeded data intact. Not a defect in the code.

## Recorded Next Steps

1. **PR slicing (orchestrator)**: slice the uncommitted Phase 8 working tree
   (tests + configs + mapped-types pin + openspec docs) into the stacked-to-main chain,
   and move this change folder to `openspec/changes/archive/2026-09-12-sistema-reservas/`
   as part of the docs slice. This phase deliberately did not move the folder.
2. **Operator note for fresh DBs**: after `prisma db push` on a new database, run
   `prisma db execute --file prisma/partial-unique-bookings.sql` (from `apps/api`) so the
   CONFIRMED-only partial unique index exists. Suggested follow-up: fold this into a doc
   or CI step (per verify-report suggestion).
3. **Optional test hardening (verify-report suggestions)**: dedicated tests for the 14
   PARTIAL scenarios (malformed availability date, partial-overlap conflict, field-
   specific validation messages, empty lists, PATCH/cancel/delete 404s).

## Artifacts Read (traceability)

- `openspec/changes/sistema-reservas/proposal.md`
- `openspec/changes/sistema-reservas/specs/availability-calendar/spec.md`
- `openspec/changes/sistema-reservas/specs/booking/spec.md`
- `openspec/changes/sistema-reservas/specs/email-notifications/spec.md`
- `openspec/changes/sistema-reservas/specs/resource-management/spec.md`
- `openspec/changes/sistema-reservas/design.md`
- `openspec/changes/sistema-reservas/tasks.md` (45/45 `[x]` — Task Completion Gate passed)
- `openspec/changes/sistema-reservas/apply-progress.md`
- `openspec/changes/sistema-reservas/verify-report.md`
- `openspec/config.yaml` (archive rule: warn before destructive deltas — none)

## Final-State Authority Notes

Per the orchestrator's final-state facts (outrank intermediate snapshots): all 45 tasks
complete; verify verdict PASS WITH WARNINGS with the evidence revision above; the
re-book-after-cancel CRITICAL resolved (verified behavior); `@nestjs/mapped-types` pinned
to v2; email contract fire-and-forget; Phase 8 working tree uncommitted. No unrankable
contradictions were found between sources at archive time. `tasks.md`, `apply-progress.md`
and `verify-report.md` were NOT modified (complete records).

### SDD Cycle Status

Change planned, implemented, verified, and archived (spec sync + archive report). Folder
move and PR delivery are the orchestrator's next step.