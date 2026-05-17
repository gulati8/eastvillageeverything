import Link from 'next/link';
import { PlaceModel, NeighborhoodModel } from '@eve/db';
import { SearchInput } from '../../components/SearchInput';

export default async function PlacesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[] }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawQ = resolvedSearchParams.q;
  const q = (Array.isArray(rawQ) ? rawQ[0] : rawQ)?.trim() ?? '';

  const [places, neighborhoods] = await Promise.all([
    PlaceModel.findAll({ q: q || undefined }),
    NeighborhoodModel.findAll(),
  ]);
  const nameById = new Map(neighborhoods.map((n) => [n.id, n.display]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">Places</h1>
        <Link href="/places/new" className="ui text-sm uppercase bg-ink text-paper px-4 py-2 rounded-input">+ New</Link>
      </div>
      <SearchInput initialValue={q} />
      <ul className="divide-y divide-hairline">
        {places.map((p) => (
          <li key={p.id} className="py-3 flex items-center gap-3">
            <Link href={`/places/${p.id}/edit`} className="flex-1 min-w-0 block">
              <span className="block truncate">{p.name}</span>
              <span className="ui text-xs text-ink3 truncate block">
                {p.address ?? 'no address'} · {nameById.get(p.neighborhood_id) ?? '—'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {places.length === 0 && (
        q
          ? <p className="ui text-sm text-ink3">No places match &ldquo;{q}&rdquo;.</p>
          : <p className="ui text-sm text-ink3">No places yet. <Link href="/places/new" className="underline">Add one.</Link></p>
      )}
    </div>
  );
}
