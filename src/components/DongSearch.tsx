import { useEffect, useState } from 'react';
import { loadDongs, searchDongs, type Dong } from '../lib/dongs';

interface Props {
  id: string;
  label: string;
  placeholder?: string;
  selected?: { name: string; parent: string };
  onSelect: (d: Dong) => void;
  autoFocus?: boolean;
}

export function DongSearch({ id, label, placeholder = '서교동, 마포 서교', selected, onSelect, autoFocus }: Props) {
  const [all, setAll] = useState<Dong[] | null>(null);
  const [q, setQ] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadDongs().then(setAll).catch(() => setFailed(true));
  }, []);

  const results = all && q.trim() ? searchDongs(all, q) : [];

  return (
    <div className="dong-search">
      <label htmlFor={id} className="label">
        {label}
      </label>
      {selected && (
        <div className="dong-picked">
          <strong>{selected.name}</strong>
          <span>{selected.parent}</span>
        </div>
      )}
      <input
        id={id}
        type="search"
        className="text-input"
        value={q}
        placeholder={selected ? '다른 동으로 바꾸려면 검색' : placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        onChange={(e) => setQ(e.target.value)}
      />
      {failed && <p className="error">동 목록을 불러오지 못했어요. 새로고침해 주세요.</p>}
      {q.trim() && all && (
        <ul className="dong-results" role="listbox" aria-label="검색 결과">
          {results.length === 0 && <li className="sub">찾는 동이 없어요. 시·군·구 이름이나 동 이름 일부로 검색해 보세요.</li>}
          {results.map((d) => (
            <li key={`${d.parent}-${d.name}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(d);
                  setQ('');
                }}
              >
                <strong>{d.name}</strong>
                <span>{d.parent}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
