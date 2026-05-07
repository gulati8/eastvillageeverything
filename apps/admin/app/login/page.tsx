import { loginAction } from '../../lib/actions/login';

interface Props {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center p-5 bg-paper">
      <form action={loginAction} className="w-full max-w-sm space-y-4 bg-paper2 p-6 rounded-card">
        <h1 className="text-3xl">EVE Admin</h1>
        <p className="ui text-ink3 text-sm">Sign in to continue.</p>
        {sp.error && (
          <p className="ui text-sm" style={{ color: '#C44' }}>{sp.error}</p>
        )}
        <input type="hidden" name="next" value={sp.next ?? '/places'} />
        <label className="block">
          <span className="ui text-xs uppercase text-ink3">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="ui text-xs uppercase text-ink3">Password</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
          />
        </label>
        <button type="submit" className="w-full ui font-bold uppercase tracking-wider p-3 rounded-input bg-ink text-paper">
          Sign in
        </button>
      </form>
    </main>
  );
}
