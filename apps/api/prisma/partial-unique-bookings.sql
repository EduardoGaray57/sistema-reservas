-- Business rule: at most one ACTIVE (CONFIRMED) booking per
-- (resourceId, startTime). A partial unique index expresses this exactly:
-- cancelled rows never consume the slot, and future active statuses must be
-- consciously added to the WHERE clause instead of silently weakening the
-- constraint (as a status-blind @@unique([resourceId, startTime]) would).
--
-- Prisma cannot declare partial indexes, so after every `prisma db push`
-- re-apply this file:
--   npx prisma db execute --file prisma/partial-unique-bookings.sql
CREATE UNIQUE INDEX "bookings_resourceId_startTime_confirmed_uq"
  ON "bookings" ("resourceId", "startTime")
  WHERE "status" = 'CONFIRMED';