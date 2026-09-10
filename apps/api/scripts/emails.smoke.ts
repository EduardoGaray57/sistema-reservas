/**
 * Smoke test for the email slice (no Jest config is committed yet).
 *
 * Deterministic checks only — no network, no database:
 * 1. Both templates render to HTML containing the booking details.
 * 2. Time formatting respects the resource timezone.
 * 3. The cancellation template (send out of scope) is renderable.
 *
 * The degraded-mode and fire-and-forget paths are exercised at runtime by the
 * API harness (booking still returns 201 without RESEND_API_KEY).
 */
import assert from 'node:assert/strict';
import {
  formatBookingEmailTime,
  renderBookingCancellation,
  renderBookingConfirmation,
} from '@sistema-reservas/shared';

const context = {
  guestName: 'Eduardo Test',
  resourceName: 'Meeting Room A',
  // Monday, 2026-09-14 13:00 UTC == 10:00 in America/Argentina/Buenos_Aires.
  startTime: new Date('2026-09-14T13:00:00.000Z'),
  endTime: new Date('2026-09-14T14:00:00.000Z'),
  timezone: 'America/Argentina/Buenos_Aires',
};

async function main() {
  // Time formatting: resource timezone applies.
  const startText = formatBookingEmailTime(context.startTime, context.timezone);
  const endText = formatBookingEmailTime(context.endTime, context.timezone);
  assert.ok(startText.includes('10:00 AM'), `expected local 10:00 AM, got "${startText}"`);
  assert.ok(endText.includes('11:00 AM'), `expected local 11:00 AM, got "${endText}"`);
  assert.ok(
    formatBookingEmailTime(context.startTime).includes('2026'),
    'formatting without timezone must still produce a date',
  );

  // Confirmation template contains all booking details.
  const confirmHtml = await renderBookingConfirmation(context);
  assert.ok(confirmHtml.includes('Eduardo Test'), 'confirmation missing guest name');
  assert.ok(
    confirmHtml.includes('Meeting Room A'),
    'confirmation missing resource name',
  );
  assert.ok(confirmHtml.includes(startText), 'confirmation missing formatted start time');
  assert.ok(confirmHtml.includes(endText), 'confirmation missing formatted end time');

  // Cancellation template (send is out of scope) renders with the same props.
  const cancelHtml = await renderBookingCancellation(context);
  assert.ok(cancelHtml.includes('Eduardo Test'), 'cancellation missing guest name');
  assert.ok(
    cancelHtml.includes('Meeting Room A'),
    'cancellation missing resource name',
  );

  console.log('[email-smoke] all assertions passed');
}

main().catch((err) => {
  console.error('[email-smoke] FAILED:', err);
  process.exitCode = 1;
});