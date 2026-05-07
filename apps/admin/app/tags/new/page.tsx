import { TagForm } from '../../../components/TagForm';
import { createTag } from '../../../lib/actions/tags';

export default function NewTagPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">New tag</h1>
      <TagForm action={createTag} />
    </div>
  );
}
