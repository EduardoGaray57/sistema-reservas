# Availability Calendar Specification

## Purpose

Compute available time slots for a resource on a given date. Slots are generated from the resource's schedule, then subtracted by confirmed bookings and blocked times. The endpoint returns all candidate slots with an availability flag.

## Requirements

### Requirement: AVAIL-01 Get Available Slots

The system SHALL return all potential time slots for a resource on a specific date, each marked `available: true` or `available: false`.

#### Scenario: Happy path — available slots

- GIVEN a resource with 60-minute slots and a schedule of 09:00–12:00 on Wednesday
- AND no bookings or blocked times exist for Wednesday
- WHEN GET /api/resources/abc/availability?date=2026-09-10 (a Wednesday)
- THEN the response is 200 with 3 slots: 09:00–10:00, 10:00–11:00, 11:00–12:00, all with `available: true`

#### Scenario: Slot hidden by existing booking

- GIVEN the same resource and schedule as above
- AND a confirmed booking exists at 10:00–11:00 on 2026-09-10
- WHEN GET /api/resources/abc/availability?date=2026-09-10
- THEN the 10:00–11:00 slot has `available: false`
- AND the other two slots remain `available: true`

#### Scenario: Slot hidden by blocked time

- GIVEN the same resource and schedule
- AND a blocked time range of 09:00–10:00 on 2026-09-10
- WHEN GET /api/resources/abc/availability?date=2026-09-10
- THEN the 09:00–10:00 slot has `available: false`

### Requirement: AVAIL-02 No Schedule Returns Empty

The system SHALL return an empty slots array when no schedule exists for the requested date's day of week.

#### Scenario: No schedule for requested day

- GIVEN a resource with schedules only on Monday–Friday
- WHEN GET /api/resources/abc/availability?date=2026-09-13 (a Sunday)
- THEN the response is 200 with `{ slots: [] }`

### Requirement: AVAIL-03 Missing Resource Returns 404

The system SHALL return 404 when the resource does not exist.

#### Scenario: Resource not found

- GIVEN no resource with id "nonexistent" exists
- WHEN GET /api/resources/nonexistent/availability?date=2026-09-10
- THEN the response is 404

### Requirement: AVAIL-04 Invalid Date Returns 400

The system SHALL reject requests with a missing or malformed date parameter.

#### Scenario: Missing date query param

- GIVEN a valid resource exists
- WHEN GET /api/resources/abc/availability (no date parameter)
- THEN the response is 400 with a validation error

#### Scenario: Malformed date

- GIVEN a valid resource exists
- WHEN GET /api/resources/abc/availability?date=not-a-date
- THEN the response is 400 with a validation error

### Requirement: AVAIL-05 Slot Timezone Consistency

The system SHALL generate slots in the resource's configured timezone and return all times in UTC.

#### Scenario: Timezone conversion

- GIVEN a resource with timezone "America/Argentina/Buenos_Aires" (UTC-3) and schedule 09:00–10:00
- WHEN GET /api/resources/abc/availability?date=2026-09-10
- THEN the slot `startTime` is in UTC (12:00 UTC) and `endTime` is in UTC (13:00 UTC)
