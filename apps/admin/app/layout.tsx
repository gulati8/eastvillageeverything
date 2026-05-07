import './globals.css';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { Header } from '../components/Header';

export const metadata = { title: 'EVE Admin' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const userId = h.get('x-eve-user-id');
  return (
    <html lang="en">
      <body>
        {userId ? <Header /> : null}
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
