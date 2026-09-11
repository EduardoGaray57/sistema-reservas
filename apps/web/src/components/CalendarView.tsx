import { Calendar } from "@/components/ui/calendar";

interface CalendarViewProps {
  selected: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  fromDate: Date;
  toDate: Date;
}

/**
 * Single-day selection calendar for booking, pinned to react-day-picker's
 * `single` mode. The calendar works with local Date objects; conversion to
 * the resource timezone happens in the page via the timezone-aware
 * input-value helpers in `lib/utils`.
 *
 * react-day-picker v10 removed the `fromDate`/`toDate` props; the
 * selectable window is expressed with `disabled` matchers instead
 * (`{ before }` keeps the first day enabled, `{ after }` keeps the last
 * one enabled).
 */
export function CalendarView({
  selected,
  onSelect,
  fromDate,
  toDate,
}: CalendarViewProps) {
  return (
    <Calendar
      mode="single"
      captionLayout="label"
      defaultMonth={fromDate}
      aria-label="Select a date to view availability"
      selected={selected}
      onSelect={onSelect}
      disabled={[{ before: fromDate }, { after: toDate }]}
    />
  );
}