# Email Notifications Specification

## Purpose

Transactional email delivery via Resend with React Email templates. Phase 1 covers booking confirmation emails only. Emails are fire-and-forget — delivery failure must not block booking creation.

## Requirements

### Requirement: EMAIL-01 Send Booking Confirmation

The system SHALL send a booking confirmation email to the guest's address after a successful booking.

#### Scenario: Happy path — confirmation sent

- GIVEN a booking is created with `guestEmail: "edu@test.com"`, resource "Room A", start 10:00, end 11:00
- WHEN the email service is invoked with booking details
- THEN Resend's `emails.send` is called with `to: "edu@test.com"`, a subject line containing the resource name, and HTML body containing guest name, resource name, start time, and end time

#### Scenario: Email template contains booking details

- GIVEN a confirmation email is rendered for booking details
- WHEN the email HTML is generated
- THEN it contains the guest name, resource name, formatted start time, and formatted end time

### Requirement: EMAIL-02 Fire-and-Forget Delivery

The system SHALL NOT block or fail the booking creation when the email service encounters an error.

#### Scenario: Resend API failure does not block booking

- GIVEN the Resend API is unreachable or returns an error
- WHEN a booking is successfully created at the DB level
- THEN the API response is still 201 with the booking
- AND the error is logged (not thrown to the caller)

#### Scenario: Invalid email address does not block booking

- GIVEN the guest provides a syntactically valid but non-deliverable email
- WHEN the booking is created
- THEN the response is 201
- AND Resend receives the send request (bounce handling is Resend's responsibility)

### Requirement: EMAIL-03 Email Configuration

The system SHALL read the Resend API key and sender email from environment variables.

#### Scenario: Missing Resend API key

- GIVEN the `RESEND_API_KEY` environment variable is not set
- WHEN the application starts
- THEN the email module initializes without crashing (sends are attempted but fail gracefully)

#### Scenario: Missing sender email

- GIVEN the `EMAIL_FROM` environment variable is not set
- WHEN an email is sent
- THEN the email service falls back to a default sender address (e.g., `noreply@resend.dev`)

### Requirement: EMAIL-04 Cancellation Email (Phase 1 Placeholder)

The system SHALL provide a React Email template for booking cancellations. Sending is out of scope for Phase 1 but the template MUST exist and be renderable.

#### Scenario: Cancellation template renders

- GIVEN cancellation template props: guestName, resourceName, startTime, endTime
- WHEN the template is rendered
- THEN it produces valid HTML containing the guest name and resource name
