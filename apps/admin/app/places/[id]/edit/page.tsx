import { notFound } from 'next/navigation';
import { PlaceForm } from '../../../../components/PlaceForm';
import { PrevNextNav } from '../../../../components/PrevNextNav';
import { DeleteButton } from '../../../../components/DeleteButton';
import { PlaceModel, TagModel, NeighborhoodModel } from '@eve/db';
import { updatePlace, deletePlace } from '../../../../lib/actions/places';

export default async function EditPlacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ editorial?: string | string[] }>;
}) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const safeSearchParams = resolvedSearchParams ?? {};
  const editorial = safeSearchParams.editorial;
  const showEditorial = Array.isArray(editorial) ? editorial.includes('on') : editorial === 'on';
  const [place, tags, neighborhoods, allPlaces] = await Promise.all([
    PlaceModel.findById(id),
    TagModel.findAll(),
    NeighborhoodModel.findAll(),
    PlaceModel.findAll(),
  ]);
  if (!place) notFound();

  const idx = allPlaces.findIndex((p) => p.id === place.id);
  const prev = idx > 0 ? allPlaces[idx - 1] : null;
  const next = idx >= 0 && idx < allPlaces.length - 1 ? allPlaces[idx + 1] : null;

  const tagValueToTag = new Map(tags.map((t) => [t.value, t]));
  const selectedTags = (place.tags ?? [])
    .map((v: string) => tagValueToTag.get(v))
    .filter((t): t is (typeof tags)[number] => Boolean(t));

  const update = updatePlace.bind(null, place.id);

  const defaultValues = {
    name: place.name,
    address: place.address ?? '',
    cross_street: place.cross_street ?? '',
    phone: place.phone ?? '',
    url: place.url ?? '',
    neighborhood_id: place.neighborhood_id,
    photo_url: place.photo_url ?? '',
    photo_credit: place.photo_credit ?? '',
    specials: place.specials ?? '',
    notes: place.notes ?? '',
    pitch: place.pitch ?? '',
    perfect: place.perfect ?? '',
    insider: place.insider ?? '',
    vibe: place.vibe ?? '',
    crowd: place.crowd ?? '',
  };

  return (
    <div className="space-y-4">
      <PrevNextNav
        prevHref={prev ? `/places/${prev.id}/edit` : null}
        nextHref={next ? `/places/${next.id}/edit` : null}
        position={`${idx + 1} of ${allPlaces.length}`}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">{place.name}</h1>
        <DeleteButton action={deletePlace} id={place.id} confirmText="Delete this place? This cannot be undone." />
      </div>
      <PlaceForm
        action={update}
        defaultValues={defaultValues}
        allTags={tags.map((t) => ({ id: t.id, value: t.value, display: t.display }))}
        selectedTags={selectedTags.map((t) => ({ id: t.id, value: t.value, display: t.display }))}
        neighborhoods={neighborhoods.map((n) => ({ id: n.id, value: n.value, display: n.display }))}
        showEditorial={showEditorial}
      />
    </div>
  );
}
