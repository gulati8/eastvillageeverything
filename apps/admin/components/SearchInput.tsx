'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface Props {
  initialValue: string;
  paramName?: string;
}

export function SearchInput({ initialValue, paramName = 'q' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync initialValue when the server-driven prop changes (e.g. direct navigation).
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Clear any pending debounce timer on unmount to prevent a setState call
  // on an unmounted component (which would be a no-op but triggers a React warning).
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function navigate(newValue: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (newValue.trim().length > 0) {
      params.set(paramName, newValue.trim());
    } else {
      params.delete(paramName);
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(pathname + (qs ? '?' + qs : ''));
    });
  }

  function clear() {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setValue('');
    navigate('');
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      navigate(next);
    }, 250);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      clear();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <input
          type="search"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="Search places"
          aria-busy={isPending}
          placeholder="Search places…"
          className="ui w-full border border-hairline rounded-input px-3 py-1.5 text-sm bg-paper text-ink placeholder:text-ink3 focus:outline-none focus:ring-1 focus:ring-ink"
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink text-sm leading-none"
          >
            &#xd7;
          </button>
        )}
      </div>
      {isPending && (
        <span className="ui text-xs text-ink3">Searching&hellip;</span>
      )}
    </div>
  );
}
