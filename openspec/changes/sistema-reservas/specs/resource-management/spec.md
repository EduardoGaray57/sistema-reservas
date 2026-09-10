# Resource Management Specification

## Purpose

CRUD operations for bookable resources (restaurants, rooms, appointments). Each resource defines a name, optional description, slot duration, and timezone that drive downstream availability and booking behavior.

## Requirements

### Requirement: Create Resource

The system SHALL create a new bookable resource with a name, optional description, configurable slot duration (default 30 minutes), and timezone (default America/Argentina/Buenos_Aires).

#### Scenario: Happy path — create resource

- GIVEN the API is reachable
- WHEN POST /api/resources with `{ name: "Room A", slotDurationMinutes: 60 }`
- THEN the response is 201 with a JSON body containing a `id` (cuid), `name`, `slotDurationMinutes: 60`, and `createdAt`

#### Scenario: Validation — missing required name

- GIVEN the API is reachable
- WHEN POST /api/resources with `{ description: "no name" }`
- THEN the response is 400 with a validation error referencing `name`

#### Scenario: Validation — invalid slot duration

- GIVEN the API is reachable
- WHEN POST /api/resources with `{ name: "Room B", slotDurationMinutes: 0 }`
- THEN the response is 400 with a validation error referencing `slotDurationMinutes`

### Requirement: List Resources

The system SHALL return all bookable resources as an array.

#### Scenario: Happy path — list resources

- GIVEN 2 resources exist in the database
- WHEN GET /api/resources
- THEN the response is 200 with a JSON array of length 2, each containing `id` and `name`

#### Scenario: Empty list

- GIVEN no resources exist
- WHEN GET /api/resources
- THEN the response is 200 with an empty array `[]`

### Requirement: Get Resource by ID

The system SHALL return a single resource by its ID, or 404 if not found.

#### Scenario: Happy path — get existing resource

- GIVEN a resource with id "abc" exists
- WHEN GET /api/resources/abc
- THEN the response is 200 with the full resource object

#### Scenario: Resource not found

- GIVEN no resource with id "nonexistent" exists
- WHEN GET /api/resources/nonexistent
- THEN the response is 404 with an error message

### Requirement: Update Resource

The system SHALL partially update a resource. Only provided fields are modified.

#### Scenario: Happy path — update name

- GIVEN a resource with id "abc" and name "Room A" exists
- WHEN PATCH /api/resources/abc with `{ name: "Room B" }`
- THEN the response is 200 and `name` is "Room B" while other fields are unchanged

#### Scenario: Resource not found

- GIVEN no resource with id "nonexistent" exists
- WHEN PATCH /api/resources/nonexistent with `{ name: "X" }`
- THEN the response is 404

### Requirement: Delete Resource

The system SHALL delete a resource and cascade-delete all associated schedules, bookings, and blocked times.

#### Scenario: Happy path — delete resource

- GIVEN a resource with id "abc" exists with 2 associated schedules
- WHEN DELETE /api/resources/abc
- THEN the response is 204 and GET /api/resources/abc returns 404
- AND the 2 associated schedules are also deleted

#### Scenario: Resource not found

- GIVEN no resource with id "nonexistent" exists
- WHEN DELETE /api/resources/nonexistent
- THEN the response is 404
