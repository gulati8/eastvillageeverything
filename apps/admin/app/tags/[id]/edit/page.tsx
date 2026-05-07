import { notFound } from 'next/navigation';
import { TagForm } from '../../../../components/TagForm';
import { DeleteButton } from '../../../../components/DeleteButton';
import { TagModel } from '@eve/db';
import { updateTag, deleteTag } from '../../../../lib/actions/tags';

export default async function EditTagPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tag = await TagModel.findById(id);
  if (!tag) notFound();
  const update = updateTag.bind(null, tag.id);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl">{tag.display}</h1>
        <DeleteButton action={deleteTag} id={tag.id} confirmText="Delete this tag? Places tagged with it lose the tag." />
      </div>
      <TagForm action={update} defaultValues={{ display: tag.display, value: tag.value }} />
    </div>
  );
}
