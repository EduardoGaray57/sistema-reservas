import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { BookingForm } from "@/components/BookingForm";
import { CalendarView } from "@/components/CalendarView";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAvailability, getResource } from "@/lib/api-client";
import {
  formatDateLabel,
  formatTimeInTimezone,
  toDateInputValue,
  todayInTimezone,
} from "@/lib/utils";
import type { AvailabilitySlot, Booking } from "@/types";

/** Parses a YYYY-MM-DD string as a local-midnight Date for the calendar. */
function selectableDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(
    null,
  );
  const [booking, setBooking] = useState<Booking | null>(null);

  const resourceQuery = useQuery({
    queryKey: ["resource", id],
    queryFn: () => getResource(id!),
    enabled: Boolean(id),
  });
  const resource = resourceQuery.data;

  // Default the picker to today once the resource timezone is known.
  useEffect(() => {
    if (!selectedDate && resource) {
      setSelectedDate(todayInTimezone(resource.timezone));
    }
  }, [selectedDate, resource]);

  const availabilityQuery = useQuery({
    queryKey: ["availability", id, selectedDate],
    queryFn: () => getAvailability(id!, selectedDate!),
    enabled: Boolean(id && selectedDate),
  });

  const dateRange = useMemo(() => {
    const today = selectedDate ? selectableDate(selectedDate) : new Date();
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 60);
    return { fromDate: today, toDate: maxDate };
  }, [selectedDate]);

  function handleBooked(newBooking: Booking) {
    setBooking(newBooking);
    setSelectedSlot(null);
    // The booked slot is no longer available; refresh the day's list.
    queryClient.invalidateQueries({ queryKey: ["availability"] });
  }

  function handleReset() {
    setBooking(null);
    setSelectedSlot(null);
  }

  if (resourceQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-destructive">
          Could not load the resource: {resourceQuery.error.message}
        </p>
        <Button
          variant="outline"
          onClick={() => resourceQuery.refetch()}
          disabled={resourceQuery.isFetching}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          {resource ? resource.name : "Loading resource…"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {resource?.timezone ?? "…"}
        </p>
      </div>

      {booking ? (
        <Card>
          <CardHeader>
            <CardTitle>Booking confirmed</CardTitle>
            <CardDescription>
              {resource
                ? `${formatDateLabel(booking.startTime)} at ${formatTimeInTimezone(booking.startTime, resource.timezone)}`
                : formatDateLabel(booking.startTime)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <p className="text-sm">
              See you there, {booking.guestName}! A confirmation is on its way
              to {booking.guestEmail}.
            </p>
            <p className="text-xs text-muted-foreground">
              Reference: {booking.id}
            </p>
            <Button onClick={handleReset}>Book another slot</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <Card>
            <CardContent className="pt-6">
              <CalendarView
                selected={selectedDate ? selectableDate(selectedDate) : undefined}
                onSelect={(date) => {
                  if (!date || !resource) return;
                  setSelectedDate(toDateInputValue(date, resource.timezone));
                }}
                fromDate={dateRange.fromDate}
                toDate={dateRange.toDate}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Pick a time</CardTitle>
                <CardDescription>
                  {selectedDate
                    ? formatDateLabel(selectableDate(selectedDate).toISOString())
                    : "Loading timezone…"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {resource && selectedDate ? (
                  <TimeSlotPicker
                    timezone={resource.timezone}
                    slots={availabilityQuery.data?.slots ?? []}
                    isLoading={availabilityQuery.isLoading}
                    isError={availabilityQuery.isError}
                    errorMessage={availabilityQuery.error?.message}
                    selectedSlot={selectedSlot}
                    onSelect={setSelectedSlot}
                    onRetry={() => availabilityQuery.refetch()}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Loading availability…
                  </p>
                )}
              </CardContent>
            </Card>

            {resource && selectedSlot && (
              <Card>
                <CardHeader>
                  <CardTitle>Your details</CardTitle>
                  <CardDescription>
                    {formatTimeInTimezone(selectedSlot.startTime, resource.timezone)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BookingForm
                    resource={resource}
                    slot={selectedSlot}
                    onBooked={handleBooked}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        <Link to="/" className="underline underline-offset-4">
          Back to all resources
        </Link>
      </p>
    </div>
  );
}