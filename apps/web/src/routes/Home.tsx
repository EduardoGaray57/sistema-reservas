import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { ResourceCard } from "@/components/ResourceCard";
import { getResources } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Resource directory: lists bookable resources with loading/error/empty states. */
export default function Home() {
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["resources"],
    queryFn: getResources,
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-xl border bg-card"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-destructive">
          Could not load resources: {error.message}
        </p>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
          Retry
        </Button>
      </div>
    );
  }

  // Not loading and no error but no data yet — transient, render nothing.
  if (!data) return null;

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground">
        No resources available yet. Check back later.
      </p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} />
      ))}
    </div>
  );
}