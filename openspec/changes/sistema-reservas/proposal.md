# Proposal: Sistema de Reservas

## Intent

Build a greenfield online booking/reservation system (restaurants, rooms, appointments) with real-time availability, double-booking prevention, email confirmation, and an admin panel. Eduardo needs a practical full-stack project to consolidate TypeScript + React skills after app-clima.

## Scope

### In Scope
- Resource CRUD (create/manage bookable resources with time slots)
- Availability model (calendar per resource, configurable slot duration)
- Booking with double-booking prevention (DB-level constraint)
- React frontend with shadcn/ui (resource list, availability calendar, booking form)
- Email confirmation via Resend + React Email
- Monorepo setup (pnpm workspaces: `apps/api` + `apps/web`)

### Out of Scope
- Authentication / user accounts (Phase 3)
- Admin dashboard (Phase 2)
- Manual time blocking / cancellation (Phase 2)
- Rate limiting, CI/CD, production deploy (Phase 3)
- Multi-tenant or multi-language support

## Capabilities

### New Capabilities
- `resource-management`: CRUD for bookable resources (name, description, slot duration, operating hours)
- `availability-calendar`: Availability model with slot generation, conflict detection, and time-range queries
- `booking`: End-to-end booking flow with double-booking prevention via DB unique constraint, confirmation email
- `email-notifications`: Resend integration with React Email templates for booking confirmations
- `admin-panel`: Admin UI for resource management, manual time blocking, booking overview (Phase 2)

### Modified Capabilities
None — greenfield project.

## Approach

NestJS + Prisma on PostgreSQL with a composite unique constraint (`resourceId + startTime`) for double-booking prevention. Slot availability computed at query time from existing bookings + blocked times. React frontend with React Router for navigation, shadcn/ui calendar components, and direct API calls. Resend for transactional email with React Email templates. Monorepo via pnpm workspaces.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/` | New | NestJS backend: resources, bookings, availability modules |
| `apps/web/` | New | React + Vite frontend with shadcn/ui |
| `packages/shared/` | New | Shared TypeScript types between API and web |
| `docker-compose.yml` | New | Local PostgreSQL for development |
| `package.json` | New | pnpm workspace root config |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Double-booking race condition | Medium | DB composite unique constraint as safety net; application-level check before insert |
| Neon free-tier limits | Low | Sufficient for dev; Railway Postgres for prod |
| Over-engineering the availability model | Medium | Start with simple slot-based model; avoid calendar library complexity |

## Rollback Plan

Greenfield project — no production data. Rollback = delete the repo and start fresh. During development, each feature branch can be reverted independently via git.

## Dependencies

- Neon account (PostgreSQL dev database)
- Resend API key (email delivery)
- pnpm installed globally

## Success Criteria

- [ ] `pnpm dev` starts both API and web without errors
- [ ] Create a resource via API, see it in the frontend
- [ ] Book a time slot; attempt to double-book receives 409 Conflict
- [ ] Booking triggers confirmation email via Resend
- [ ] Availability calendar shows only open slots (booked slots hidden)
