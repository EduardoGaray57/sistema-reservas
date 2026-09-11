import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn, formatTimeInTimezone } from "@/lib/utils";
import type { AvailabilitySlot } from "@/types";

interface TimeSlotPickerProps {
  timezone: string;
  slots: AvailabilitySlot[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  selectedSlot: AvailabilitySlot | null;
  onSelect: (slot: AvailabilitySlot) => void;
  onRetry: () => void;
}

/** Grid of time slots for one day; unavailable slots are disabled. */
export function TimeSlotPicker({
  timezone,
  slots,
  isLoading,
  isError,
  errorMessage,
  selectedSlot,
  onSelect,
  onRetry,
}: TimeSlotPickerProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-9 w-24 animate-pulse rounded-md border bg-card"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-destructive">
          Could not load availability{errorMessage ? `: ${errorMessage}` : "."}
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Retry
        </Button>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No time slots for this date. Pick another day.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {slots.map((slot) => {
        const start = formatTimeInTimezone(slot.startTime, timezone);
        const end = formatTimeInTimezone(slot.endTime, timezone);
        const selected = selectedSlot?.startTime === slot.startTime;
        return (
          <Button
            key={slot.startTime}
            type="button"
            variant={selected ? "default" : "outline"}
            disabled={!slot.available}
            aria-pressed={selected}
            aria-disabled={!slot.available}
            onClick={() => onSelect(slot)}
            className={cn(
              "min-w-24",
              !slot.available &&
                "cursor-not-allowed text-muted-foreground opacity-50",
            )}
          >
            {start} – {end}
          </Button>
        );
      })}
    </div>
  );
}