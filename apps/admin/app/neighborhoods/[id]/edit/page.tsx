import { notFound } from 'next/navigation';
import { NeighborhoodForm } from '../../../../components/NeighborhoodForm';
import { DeleteButton } from '../../../../components/DeleteButton';
import { NeighborhoodModel } from '@eve/db';
import { updateNeighborhood, deleteNeighborhood } from '../../../../lib/actions/neighborhoods';

export default async function EditNeighborhoodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = await NeighborhoodModel.findById(id);
  if (!n) notFound();
  const update = updateNeighborhood.bind(null, n.id);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">{n.display}</h1>
        <DeleteButton action={deleteNeighborhood} id={n.id} confirmText="Delete this neighborhood? Places assigned to it must be reassigned first." />
      </div>
      <NeighborhoodForm action={update} defaultValues={{ display: n.display, value: n.value, is_default: n.is_default }} />
    </div>
  );
}
