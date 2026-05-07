import Link from 'next/link';

interface Props { prevHref: string | null; nextHref: string | null; position: string; }

export function PrevNextNav({ prevHref, nextHref, position }: Props) {
  return (
    <div className="flex items-center justify-between text-sm ui text-ink3 mb-4">
      {prevHref ? <Link href={prevHref} className="hover:text-ink">← Previous</Link> : <span className="opacity-30">← Previous</span>}
      <span>{position}</span>
      {nextHref ? <Link href={nextHref} className="hover:text-ink">Next →</Link> : <span className="opacity-30">Next →</span>}
    </div>
  );
}
