interface Props {
  action: (fd: FormData) => void;
  defaultValues?: { display: string; value: string; is_default: boolean };
}

export function NeighborhoodForm({ action, defaultValues = { display: '', value: '', is_default: false } }: Props) {
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="ui text-xs uppercase text-ink3">Display name</span>
        <input
          name="display" required defaultValue={defaultValues.display}
          className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
        />
      </label>
      <label className="block">
        <span className="ui text-xs uppercase text-ink3">Slug</span>
        <input
          name="value" defaultValue={defaultValues.value} placeholder="auto-generated"
          className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
        />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="is_default" defaultChecked={defaultValues.is_default} />
        <span className="ui text-sm">Set as default neighborhood</span>
      </label>
      <div className="pt-2 border-t border-hairline">
        <button type="submit" className="ui text-sm uppercase bg-ink text-paper px-4 py-2 rounded-input">Save</button>
      </div>
    </form>
  );
}
