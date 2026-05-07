import Link from 'next/link';
import { NeighborhoodModel } from '@eve/db';

export default async function NeighborhoodsPage() {
  const rows = await NeighborhoodModel.findAll();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Neighborhoods</h1>
        <Link href="/neighborhoods/new" className="ui text-sm uppercase bg-ink text-paper px-4 py-2 rounded-input">+ New</Link>
      </div>
      <ul className="divide-y divide-hairline">
        {rows.map((n) => (
          <li key={n.id} className="py-3 flex items-center gap-3">
            <Link href={`/neighborhoods/${n.id}/edit`} className="flex-1 hover:text-accent">
              {n.display}
              {n.is_default && <span className="ui text-xs text-accent ml-2 uppercase">Default</span>}
              <span className="ui text-xs text-ink3 block">{n.value}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
