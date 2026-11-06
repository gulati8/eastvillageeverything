'use client';

import { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface Option { id: string; display: string; }

interface Props {
  /** The neighborhood id in the URL, or `''` for every neighborhood. */
  value: string;
  options: Option[];
  paramName?: string;
}

/**
 * The neighborhood `<select>` beside the places search box. Changing it
 * rewrites `?neighborhood=<id>` in the URL (and drops the param for "All
 * neighborhoods") so the server page re-queries; the search text survives.
 */
export function NeighborhoodFilter({ value, options, paramName = 'neighborhood' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) params.set(paramName, e.target.value);
    else params.delete(paramName);
    const qs = params.toString();
    startTransition(() => {
      router.replace(pathname + (qs ? '?' + qs : ''));
    });
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      aria-label="Filter by neighborhood"
      aria-busy={isPending}
      className="ui shrink-0 border border-hairline rounded-input px-3 py-1.5 text-sm bg-paper text-ink focus:outline-none focus:ring-1 focus:ring-ink"
    >
      <option value="">All neighborhoods</option>
      {options.map((n) => (
        <option key={n.id} value={n.id}>{n.display}</option>
      ))}
    </select>
  );
}
