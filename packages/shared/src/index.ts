import { createElement } from 'react';
import { render } from '@react-email/render';
import {
  BookingCancellation,
  BookingCancellationProps,
} from './emails/BookingCancellation';
import {
  BookingConfirmation,
  BookingConfirmationProps,
} from './emails/BookingConfirmation';

export {
  BookingCancellation,
  BookingConfirmation,
};
export type { BookingCancellationProps, BookingConfirmationProps };

/**
 * Context required to render a booking email. Start/end times are Date
 * objects; formatting happens here so the templates only receive display
 * strings.
 */
export interface BookingEmailContext {
  guestName: string;
  resourceName: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
}

/** Formats a Date for email display in the given IANA timezone. */
export function formatBookingEmailTime(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(date);
}

function toTemplateProps(context: BookingEmailContext) {
  return {
    guestName: context.guestName,
    resourceName: context.resourceName,
    startTime: formatBookingEmailTime(context.startTime, context.timezone),
    endTime: formatBookingEmailTime(context.endTime, context.timezone),
    timezone: context.timezone,
  };
}

/** Renders the booking confirmation template to email-ready HTML. */
export async function renderBookingConfirmation(
  context: BookingEmailContext,
): Promise<string> {
  return render(createElement(BookingConfirmation, toTemplateProps(context)));
}

/** Renders the booking cancellation template to email-ready HTML. */
export async function renderBookingCancellation(
  context: BookingEmailContext,
): Promise<string> {
  return render(createElement(BookingCancellation, toTemplateProps(context)));
}