# Booking Specification

## Purpose

End-to-end booking flow: validate input, check slot availability, insert with double-booking prevention, and trigger confirmation email. Supports listing bookings by resource+date and cancellation.

## Requirements

### Requirement: Create Booking

The system SHALL create a confirmed booking when the requested slot is available, returning the booking with status CONFIRMED.

#### Scenario: Happy path — successful booking

- GIVEN a resource with an available slot at 10:00 on 2026-09-10
- WHEN POST /api/bookings with `{ resourceId: "abc", startTime: "2026-09-10T10:00:00Z", guestName: "Eduardo", guestEmail: "edu@test.com" }`
- THEN the response is 201 with a JSON body containing `id`, `resourceId: "abc"`, `status: "CONFIRMED"`, and `guestName: "Eduardo"`

### Requirement: Double-Booking Prevention

The system SHALL return 409 Conflict when a booking is attempted for a slot that overlaps an existing confirmed booking.

#### Scenario: Exact same start time conflict

- GIVEN a confirmed booking exists for resource "abc" at 10:00
- WHEN POST /api/bookings with `{ resourceId: "abc", startTime: "2026-09-10T10:00:00Z", guestName: "Other", guestEmail: "other@test.com" }`
- THEN the response is 409 with an error message indicating the slot is unavailable

#### Scenario: Overlapping start time (partial overlap)

- GIVEN a confirmed booking exists for resource "abc" at 10:00–11:00 (60-min slot)
- WHEN POST /api/bookings with `{ resourceId: "abc", startTime: "2026-09-10T10:30:00Z", guestName: "Other", guestEmail: "other@test.com" }`
- THEN the response is 409

### Requirement: Validation on Booking Input

The system SHALL reject bookings with missing or invalid fields.

#### Scenario: Missing guest name

- GIVEN a valid resource and available slot
- WHEN POST /api/bookings with `{ resourceId: "abc", startTime: "...", guestEmail: "e@t.com" }` (no guestName)
- THEN the response is 400 with a validation error referencing `guestName`

#### Scenario: Invalid email format

- GIVEN a valid resource and available slot
- WHEN POST /api/bookings with `{ guestName: "X", guestEmail: "not-an-email", ... }`
- THEN the response is 400 with a validation error referencing `guestEmail`

#### Scenario: Non-existent resource

- GIVEN no resource with id "nonexistent" exists
- WHEN POST /api/bookings with `{ resourceId: "nonexistent", ... }`
- THEN the response is 404

### Requirement: List Bookings

The system SHALL return all bookings for a resource on a given date.

#### Scenario: Happy path — list bookings

- GIVEN 2 confirmed bookings exist for resource "abc" on 2026-09-10
- WHEN GET /api/bookings?resourceId=abc&date=2026-09-10
- THEN the response is 200 with an array of 2 booking objects

#### Scenario: No bookings for date

- GIVEN no bookings exist for resource "abc" on 2026-09-10
- WHEN GET /api/bookings?resourceId=abc&date=2026-09-10
- THEN the response is 200 with an empty array

### Requirement: Cancel Booking

The system SHALL update a booking's status to CANCELLED and free the slot for re-booking.

#### Scenario: Happy path — cancel existing booking

- GIVEN a confirmed booking with id "bk1" exists
- WHEN PATCH /api/bookings/bk1/cancel
- THEN the response is 200 and `status` is "CANCELLED"

#### Scenario: Cancel non-existent booking

- GIVEN no booking with id "nonexistent" exists
- WHEN PATCH /api/bookings/nonexistent/cancel
- THEN the response is 404

#### Scenario: Re-book after cancellation

- GIVEN a booking at 10:00 on resource "abc" has been cancelled
- WHEN POST /api/bookings with `{ resourceId: "abc", startTime: "2026-09-10T10:00:00Z", ... }`
- THEN the response is 201 with status CONFIRMED

### Requirement: Email Triggered on Booking

The system SHALL trigger a confirmation email asynchronously after a successful booking insert. Email failure MUST NOT block booking creation.

#### Scenario: Email sent after booking

- GIVEN a valid resource and available slot
- WHEN POST /api/bookings creates a booking successfully
- THEN the response is 201
- AND a confirmation email is dispatched asynchronously (fire-and-forget)
