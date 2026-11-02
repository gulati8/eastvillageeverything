import Link from 'next/link';
import { PlaceModel, PlacePhotoModel, NeighborhoodModel } from '@eve/db';
import { SearchInput } from '../../components/SearchInput';
import { DeleteButton } from '../../components/DeleteButton';
import { deletePlace } from '../../lib/actions/places';
import { googlePhotoUrl } from '../../lib/photos';

export default async function PlacesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string | string[] }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawQ = resolvedSearchParams.q;
  const q = (Array.isArray(rawQ) ? rawQ[0] : rawQ)?.trim() ?? '';

  const [places, neighborhoods, photoCounts] = await Promise.all([
    PlaceModel.findAll({ q: q || undefined }),
    NeighborhoodModel.findAll(),
    PlacePhotoModel.countsByPlace(),
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
        {places.map((p) => {
          // The mirrored first photo wins; the Google proxy stands in until there is one.
          const thumbUrl = p.photo_thumb_url
            ? p.photo_thumb_url
            : p.google_photo_name
              ? googlePhotoUrl(p.id, 'thumb')
              : null;
          const count = photoCounts.get(p.id) ?? 0;
          return (
            <li key={p.id} className="py-3 flex items-center gap-3">
              <Link href={`/places/${p.id}/edit`} className="flex-1 min-w-0 flex items-center gap-3">
                <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-card border border-hairline bg-paper2">
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-full w-full items-center justify-center font-display italic text-2xl text-ink2"
                    >
                      {p.name.trim().charAt(0).toUpperCase()}
                    </span>
                  )}
                  {count > 1 && (
                    <span
                      className="ui absolute bottom-0.5 right-0.5 rounded-chip bg-ink/80 px-1 py-px text-[10px] leading-4 text-paper"
                      aria-label={`${count} photos`}
                    >
                      {count}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1 block">
                  <span className="block truncate">{p.name}</span>
                  <span className="ui text-xs text-ink3 truncate block">
                    {p.address ?? 'no address'} · {nameById.get(p.neighborhood_id) ?? '—'}
                  </span>
                </span>
              </Link>
              <DeleteButton
                action={deletePlace}
                id={p.id}
                label="Delete"
                confirmText={`Delete ${p.name}? This cannot be undone.`}
              />
            </li>
          );
        })}
      </ul>
      {places.length === 0 && (
        q
          ? <p className="ui text-sm text-ink3">No places match &ldquo;{q}&rdquo;.</p>
          : <p className="ui text-sm text-ink3">No places yet. <Link href="/places/new" className="underline">Add one.</Link></p>
      )}
    </div>
  );
}
