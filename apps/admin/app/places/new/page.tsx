import { PlaceForm } from '../../../components/PlaceForm';
import { TagModel, NeighborhoodModel } from '@eve/db';
import { createPlace } from '../../../lib/actions/places';

export default async function NewPlacePage() {
  const [tags, neighborhoods] = await Promise.all([
    TagModel.findAll(),
    NeighborhoodModel.findAll(),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">New place</h1>
      <PlaceForm
        action={createPlace}
        allTags={tags.map((t) => ({ id: t.id, value: t.value, display: t.display }))}
        selectedTags={[]}
        neighborhoods={neighborhoods.map((n) => ({ id: n.id, value: n.value, display: n.display }))}
      />
    </div>
  );
}
