import { PlaceForm } from '../../../components/PlaceForm';
import { CollapsibleSection } from '../../../components/CollapsibleSection';
import { TagModel, NeighborhoodModel } from '@eve/db';
import { createPlace } from '../../../lib/actions/places';

export default async function NewPlacePage({
  searchParams,
}: {
  searchParams?: Promise<{ editorial?: string | string[] }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const editorial = resolvedSearchParams.editorial;
  const showEditorial = Array.isArray(editorial) ? editorial.includes('on') : editorial === 'on';
  const [tags, neighborhoods] = await Promise.all([
    TagModel.findAll(),
    NeighborhoodModel.findAll(),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">New place</h1>
      <CollapsibleSection title="Photos" aria-label="Photos" defaultOpen description="Save the place first, then add photos here." />
      <PlaceForm
        action={createPlace}
        allTags={tags.map((t) => ({ id: t.id, value: t.value, display: t.display }))}
        selectedTags={[]}
        neighborhoods={neighborhoods.map((n) => ({ id: n.id, value: n.value, display: n.display }))}
        showEditorial={showEditorial}
      />
    </div>
  );
}
