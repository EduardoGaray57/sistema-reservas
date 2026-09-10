import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { CSSProperties } from 'react';

export interface BookingCancellationProps {
  guestName: string;
  resourceName: string;
  startTime: string;
  endTime: string;
  timezone: string;
}

const bodyStyle: CSSProperties = {
  backgroundColor: '#f6f6f6',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: 0,
};

const containerStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e5e5',
  borderRadius: '8px',
  margin: '40px auto',
  maxWidth: '560px',
  padding: '32px',
};

const headingStyle: CSSProperties = {
  color: '#111827',
  fontSize: '24px',
  margin: '0 0 16px',
};

const paragraphStyle: CSSProperties = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '1.5',
};

const strongStyle: CSSProperties = {
  color: '#111827',
};

const detailsStyle: CSSProperties = {
  backgroundColor: '#f9fafb',
  borderRadius: '6px',
  margin: '24px 0',
  padding: '16px',
};

const detailLineStyle: CSSProperties = {
  color: '#374151',
  fontSize: '14px',
  margin: '6px 0',
};

const hrStyle: CSSProperties = {
  border: 'none',
  borderTop: '1px solid #e5e5e5',
  margin: '32px 0 16px',
};

const footerStyle: CSSProperties = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: 0,
};

/**
 * Booking cancellation email template. Rendering is in scope for this phase;
 * sending cancellations is planned for a later phase.
 */
export function BookingCancellation({
  guestName,
  resourceName,
  startTime,
  endTime,
  timezone,
}: BookingCancellationProps) {
  return (
    <Html>
      <Head />
      <Preview>Your booking at {resourceName} has been cancelled</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Booking cancelled</Heading>
          <Text style={paragraphStyle}>Hi {guestName},</Text>
          <Text style={paragraphStyle}>
            Your booking at <strong style={strongStyle}>{resourceName}</strong> has
            been cancelled. If this was a mistake, please book again.
          </Text>
          <Section style={detailsStyle}>
            <Text style={detailLineStyle}>
              Resource: <strong style={strongStyle}>{resourceName}</strong>
            </Text>
            <Text style={detailLineStyle}>
              Starts: <strong style={strongStyle}>{startTime}</strong>
            </Text>
            <Text style={detailLineStyle}>
              Ends: <strong style={strongStyle}>{endTime}</strong>
            </Text>
            <Text style={detailLineStyle}>Timezone: {timezone}</Text>
          </Section>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>Sistema de Reservas</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default BookingCancellation;