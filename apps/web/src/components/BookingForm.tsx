import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBooking } from "@/lib/api-client";
import { formatTimeInTimezone } from "@/lib/utils";
import type { AvailabilitySlot, Booking, Resource } from "@/types";

interface BookingFormProps {
  resource: Resource;
  slot: AvailabilitySlot;
  onBooked: (booking: Booking) => void;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

/** Guest details + confirmation for one selected time slot. */
export function BookingForm({ resource, slot, onBooked }: BookingFormProps) {
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const bookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: onBooked,
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = guestName.trim();
    const email = guestEmail.trim();
    if (!name || !email) {
      setFormError("Name and email are required.");
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setFormError("Enter a valid email address.");
      return;
    }
    setFormError(null);
    bookingMutation.mutate({
      resourceId: resource.id,
      startTime: slot.startTime,
      guestName: name,
      guestEmail: email,
    });
  }

  const start = formatTimeInTimezone(slot.startTime, resource.timezone);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="guest-name" className="text-sm font-medium">
          Name
        </label>
        <Input
          id="guest-name"
          value={guestName}
          onChange={(event) => setGuestName(event.target.value)}
          placeholder="Your name"
          autoComplete="name"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="guest-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="guest-email"
          type="email"
          value={guestEmail}
          onChange={(event) => setGuestEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      {bookingMutation.isError && (
        <p className="text-sm text-destructive" role="alert">
          Could not confirm the booking: {bookingMutation.error.message}
        </p>
      )}

      <Button type="submit" disabled={bookingMutation.isPending}>
        {bookingMutation.isPending ? "Confirming…" : `Confirm booking at ${start}`}
      </Button>
    </form>
  );
}