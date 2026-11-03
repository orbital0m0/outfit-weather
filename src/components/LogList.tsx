import { useEffect, useState } from 'react';
import type { DailyLog } from '../types';
import { COMFORT } from '../lib/constants';
import { formatDate } from '../lib/dates';
import { segmentWeather } from '../lib/weather';
import type { getStore } from '../lib/db';

type Store = Awaited<ReturnType<typeof getStore>>;

function Thumb({ blob }: { blob?: Blob }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url ? <img className="thumb" src={url} alt="" /> : <div className="thumb" aria-hidden="true" />;
}

export function LogList({ store, onOpen }: { store: Store; onOpen: (date: string) => void }) {
  const [logs, setLogs] = useState<DailyLog[] | null>(null);
  useEffect(() => {
    store.allLogs().then(setLogs);
  }, [store]);

  if (!logs) return <p className="empty">불러오는 중…</p>;
  if (!logs.length)
    return (
      <div className="card empty">
        <h3>첫 기록을 남겨보세요</h3>
        <p className="sub">오늘 입은 옷과 구간별 체감을 저장하면 여기에 쌓여요.</p>
      </div>
    );

  return (
    <>
      {logs.map((l) => (
        <button
          key={l.date}
          type="button"
          className="card log-item"
          style={{ textAlign: 'left', flexDirection: 'row' }}
          onClick={() => onOpen(l.date)}
        >
          {l.status === 'home' ? <div className="thumb" aria-hidden="true" /> : <Thumb blob={l.photo} />}
          <div className="body">
            <strong>{formatDate(l.date)}</strong>
            {l.status === 'home' ? (
              <span className="sub">집에 있었던 날</span>
            ) : (
              <>
                <span className="sub">
                  {l.outfitTags.join(' · ') || l.outfitMemo || '사진만 기록'}
                </span>
                <div className="chips">
                  {l.segments.map((s) => {
                    const c = COMFORT.find((x) => x.value === s.comfort);
                    const wx = segmentWeather(l.hourly[s.place.key], s);
                    return (
                      <span key={s.id} className={`badge ${c?.tone ?? ''}`}>
                        {s.label} {wx ? `${wx.feelsLike}°` : ''} {c?.label ?? ''}
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </button>
      ))}
    </>
  );
}
