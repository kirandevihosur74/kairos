import { Button } from "./Button";

export function LoadMessage({ error, loading, onRetry }: { error?: string | null; loading?: boolean; onRetry?: () => void }) {
  return <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center" role={error ? "alert" : "status"}>
    <p className="text-sm text-muted">{error ?? (loading ? "Loading…" : "Nothing here yet.")}</p>
    {error && onRetry && <Button onClick={onRetry} size="sm">Try again</Button>}
  </div>;
}
