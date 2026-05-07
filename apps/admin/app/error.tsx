'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-5">
      <h2>Something went wrong.</h2>
      <pre className="ui text-ink3 text-sm">{error.message}</pre>
      <button onClick={reset} className="ui underline">Retry</button>
    </div>
  );
}
