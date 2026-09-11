import { CalendarDays, Clock } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Resource } from "@/types";

export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{resource.name}</CardTitle>
        <CardDescription>
          {resource.description ?? "No description provided."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Clock className="size-4" />
          {resource.slotDurationMinutes} min slots
        </span>
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="size-4" />
          {resource.timezone}
        </span>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link to={`/book/${resource.id}`}>Book a slot</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}