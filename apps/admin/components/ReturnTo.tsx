'use client';

import { usePathname } from 'next/navigation';

/**
 * Hidden field carrying the current admin path so a server action can bounce a
 * validation failure back to the form the user was on. The action runs it
 * through `sanitizeAdminNextPath` before redirecting.
 */
export function ReturnTo() {
  const pathname = usePathname();
  return <input type="hidden" name="return_to" value={pathname} />;
}
