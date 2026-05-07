import { NeighborhoodForm } from '../../../components/NeighborhoodForm';
import { createNeighborhood } from '../../../lib/actions/neighborhoods';

export default function NewNeighborhoodPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">New neighborhood</h1>
      <NeighborhoodForm action={createNeighborhood} />
    </div>
  );
}
