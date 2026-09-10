import {
  Body,
  Button,
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

export interface BookingConfirmationProps {
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

const buttonStyle: CSSProperties = {
  backgroundColor: '#0f766e',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: 600,
  padding: '10px 20px',
  textDecoration: 'none',
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
 * Booking confirmation email template. Rendered by the API through
 * `renderBookingConfirmation` in packages/shared/src/index.ts.
 */
export function BookingConfirmation({
  guestName,
  resourceName,
  startTime,
  endTime,
  timezone,
}: BookingConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>Your booking at {resourceName} is confirmed</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Booking confirmed</Heading>
          <Text style={paragraphStyle}>Hi {guestName},</Text>
          <Text style={paragraphStyle}>
            Your booking at <strong style={strongStyle}>{resourceName}</strong> is
            confirmed.
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
          <Button href="https://sistema-reservas.example/manage" style={buttonStyle}>
            Manage your booking
          </Button>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>Sistema de Reservas</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default BookingConfirmation;