import type { Comfort } from '../types';
import { COMFORT } from '../lib/constants';

interface Props {
  value?: Comfort;
  onChange: (v: Comfort) => void;
}

export function ComfortPicker({ value, onChange }: Props) {
  return (
    <div className="comfort" role="group" aria-label="체감">
      {COMFORT.map((c) => (
        <button
          key={c.value}
          type="button"
          className={`${c.tone}${Math.abs(c.value) === 2 ? ' strong' : ''}`}
          aria-pressed={value === c.value}
          onClick={() => onChange(c.value)}
        >
          <i className="dot" aria-hidden="true" />
          <span>{c.label}</span>
        </button>
      ))}
    </div>
  );
}
