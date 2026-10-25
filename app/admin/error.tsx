"use client";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="panel">
      <h2>Something went wrong</h2>
      <p className="mono small">{error.message}</p>
      <p className="muted small">
        If this mentions a missing column, update <code>schema.config.json</code> to match your database. Run{" "}
        <code>npm run check-schema</code> to see the real column names.
      </p>
      <button className="btn" onClick={reset}>Try again</button>
    </div>
  );
}
