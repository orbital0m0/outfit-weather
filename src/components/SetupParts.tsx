import type { Place, Settings, Transport, WeekdaySegment } from '../types';
import { TRANSPORT, WEEKDAY_PRESET } from '../lib/constants';
import type { Dong } from '../lib/dongs';
import { uid } from '../lib/record';

export function placeFromDong(kind: Place['kind'], d: Dong): Place {
  return {
    key: kind === 'saved' ? uid('p') : kind,
    kind,
    label: kind === 'home' ? '집' : kind === 'work' ? '회사' : d.name,
    regionName: `${d.parent} ${d.name}`,
    lat: d.lat,
    lon: d.lon,
    lastUsedAt: new Date().toISOString(),
  };
}

// regionName '서울특별시 마포구 서교동' → { name: '서교동', parent: '서울특별시 마포구' }
export function splitRegion(p?: Place) {
  if (!p) return undefined;
  const parts = p.regionName.split(' ');
  return { name: parts[parts.length - 1], parent: parts.slice(0, -1).join(' ') };
}

export function RouteEditor({ value, onChange }: { value: Transport[]; onChange: (t: Transport[]) => void }) {
  return (
    <div className="chips" role="group" aria-label="평소 출퇴근 이동수단">
      {TRANSPORT.map((t) => (
        <button
          key={t.value}
          type="button"
          className="chip"
          aria-pressed={value.includes(t.value)}
          onClick={() => onChange(value.includes(t.value) ? value.filter((x) => x !== t.value) : [...value, t.value])}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function TimesEditor({
  value,
  onChange,
}: {
  value: Settings['weekdayTimes'];
  onChange: (v: Settings['weekdayTimes']) => void;
}) {
  return (
    <div className="times-list">
      {WEEKDAY_PRESET.map((p) => {
        const key = p.type as WeekdaySegment;
        const t = value[key];
        const bad = t.start >= t.end;
        return (
          <div className="times-row" key={key}>
            <span className="times-name">{p.label}</span>
            <div className="times">
              <input
                id={`setup-${key}-start`}
                type="time"
                value={t.start}
                aria-label={`${p.label} 시작`}
                onChange={(e) => onChange({ ...value, [key]: { ...t, start: e.target.value } })}
              />
              <span aria-hidden="true">–</span>
              <input
                id={`setup-${key}-end`}
                type="time"
                value={t.end}
                aria-label={`${p.label} 끝`}
                onChange={(e) => onChange({ ...value, [key]: { ...t, end: e.target.value } })}
              />
            </div>
            {bad && <p className="error times-err">끝나는 시간이 시작보다 늦어야 해요.</p>}
          </div>
        );
      })}
    </div>
  );
}

export const timesValid = (v: Settings['weekdayTimes']) => Object.values(v).every((t) => t.start < t.end);
