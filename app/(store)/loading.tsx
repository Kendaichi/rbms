export default function StoreLoading() {
  return (
    <div className="flex min-h-[60vh] flex-1 items-center justify-center">
      <div
        className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
