"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Standard loading / error gate for the client tabs. Shows the skeleton while
// the cached collection is still hydrating, a recoverable error with retry on
// failure, and the real content once ready. Cached data survives navigation, so
// this skeleton only shows on the first visit of a session.
export function DataState({
  loading,
  error,
  onRetry,
  skeleton,
  children,
}: {
  loading: boolean;
  error?: string;
  onRetry?: () => void;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-14 text-center">
        <AlertCircle className="size-6 text-destructive" />
        <div>
          <p className="text-sm font-medium">Couldn&rsquo;t load this data</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{error}</p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }
  if (loading) return <>{skeleton}</>;
  return <>{children}</>;
}
