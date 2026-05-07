import Link from 'next/link';
import { logoutAction } from '../lib/actions/login';

export function Header() {
  return (
    <header className="border-b border-hairline bg-paper">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link href="/places" className="text-2xl">
          <span className="font-display italic">EVE</span>{' '}
          <span className="ui font-bold uppercase tracking-wider text-sm">Admin</span>
        </Link>
        <nav className="flex items-center gap-4 ui text-sm uppercase tracking-wider">
          <Link href="/places" className="hover:text-accent">Places</Link>
          <Link href="/tags" className="hover:text-accent">Tags</Link>
          <Link href="/neighborhoods" className="hover:text-accent">Neighborhoods</Link>
        </nav>
        <form action={logoutAction} className="ml-auto">
          <button type="submit" className="ui text-xs uppercase text-ink3 hover:text-ink">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
