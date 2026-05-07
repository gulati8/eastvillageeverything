interface Props {
  action: (fd: FormData) => void;
  defaultValues?: { display: string; value: string };
}

export function TagForm({ action, defaultValues = { display: '', value: '' } }: Props) {
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
        <span className="ui text-xs uppercase text-ink3">Slug (auto from display)</span>
        <input
          name="value" defaultValue={defaultValues.value}
          placeholder="auto-generated"
          className="w-full mt-1 p-3 rounded-input bg-paper border border-hairline focus:outline-none focus:border-accent"
        />
      </label>
      <div className="pt-2 border-t border-hairline">
        <button type="submit" className="ui text-sm uppercase bg-ink text-paper px-4 py-2 rounded-input">Save</button>
      </div>
    </form>
  );
}
