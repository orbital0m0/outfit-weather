import { useEffect, useMemo, useRef, useState } from 'react';
import type { DailyLog, DayWeather, Place, Segment, Settings } from '../types';
import { addDays, formatDate, toYMD } from '../lib/dates';
import { GENERIC_OUTER, categoryOf } from '../lib/constants';
import { addOutingSegment, migrateSamplePlaces, newDraft, validate, withOuting, withWeekdayPreset, type ValidationResult } from '../lib/record';
import { fetchDayWeather } from '../lib/weather';
import type { getStore } from '../lib/db';
import type { Dong } from '../lib/dongs';
import { OutfitSection } from './OutfitSection';
import { SegmentCard } from './SegmentCard';

type Store = Awaited<ReturnType<typeof getStore>>;

interface Props {
  store: Store;
  places: Place[];
  settings: Settings;
  onSettings: (s: Settings) => void;
  date: string;
  onDate: (d: string) => void;
  onAddPlace: (d: Dong) => Place;
}

export function RecordScreen({ store, places, settings, onSettings, date, onDate, onAddPlace }: Props) {
  const today = toYMD(new Date());
  const [log, setLog] = useState<DailyLog | null>(null);
  const [weather, setWeather] = useState<Record<string, DayWeather>>({});
  const [check, setCheck] = useState<ValidationResult | null>(null);
  const [msg, setMsg] = useState<{ text: string; tone?: 'ok' | 'err' }>({ text: '' });
  const inflight = useRef(new Set<string>());

  // 날짜가 바뀌면 저장된 기록을 불러오거나 새 초안을 만든다.
  useEffect(() => {
    let alive = true;
    setCheck(null);
    setMsg({ text: '' });
    store.getLog(date).then(async (saved) => {
      if (!alive) return;
      if (saved) {
        const migrated = migrateSamplePlaces(saved, places);
        setLog(migrated);
        if (migrated !== saved) {
          setMsg({ text: '예시 동네로 저장된 기록이라 내 동네 날씨로 바꿨어요. 저장하면 반영돼요.' });
          return;
        }
        setMsg({ text: '저장된 기록이에요. 고치고 다시 저장할 수 있어요.' });
        return;
      }
      const draft = newDraft(date, places, settings);
      setLog(draft);
      // 휴일은 자동으로 "집" 상태로 저장 (미래 날짜는 제외)
      if (draft.status === 'home' && date <= today) {
        await store.putLog({ ...draft, savedAt: new Date().toISOString() });
      }
    });
    return () => {
      alive = false;
    };
    // 설정 변경(평소 경로 저장)으로 초안을 다시 만들지 않도록 날짜 기준으로만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, store, places, today]);

  // 구간에 쓰인 장소마다 그날 시간별 날씨를 한 번씩 조회
  // 장소 키가 같아도(집) 동네를 바꾸면 날씨가 달라지므로 좌표까지 캐시 키에 넣는다
  const wkey = (p: Place) => `${date}:${p.key}:${p.lat},${p.lon}`;
  const usedPlaces = useMemo(() => {
    const m = new Map<string, Place>();
    log?.segments.forEach((s) => m.set(s.place.key, s.place));
    return [...m.values()];
  }, [log?.segments]);
  useEffect(() => {
    if (!log) return;
    for (const place of usedPlaces) {
      const key = place.key;
      const cacheKey = wkey(place);
      if (weather[cacheKey]) continue;
      const saved = log.hourly[key];
      if (saved?.length) {
        setWeather((w) => ({ ...w, [cacheKey]: { hours: saved, source: log.weatherSource } }));
        continue;
      }
      if (inflight.current.has(cacheKey)) continue;
      inflight.current.add(cacheKey);
      fetchDayWeather(place, date)
        .then((dw) => setWeather((w) => ({ ...w, [cacheKey]: dw })))
        .finally(() => inflight.current.delete(cacheKey));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usedPlaces, date, log, weather]);

  if (!log) return <p className="empty">불러오는 중…</p>;

  const sampleWeather = usedPlaces.some((p) => weather[wkey(p)]?.source === 'sample');
  const update = (next: DailyLog) => {
    setLog(next);
    if (check) setCheck(validate(next));
    if (msg.tone) setMsg({ text: '' });
  };
  const updateSeg = (s: Segment) => update({ ...log, segments: log.segments.map((x) => (x.id === s.id ? s : x)) });

  const persist = async (next: DailyLog, text: string) => {
    const hourly: DailyLog['hourly'] = {};
    let source: DailyLog['weatherSource'] = 'open-meteo';
    for (const s of next.segments) {
      const dw = weather[wkey(s.place)];
      if (dw) {
        hourly[s.place.key] = dw.hours;
        if (dw.source === 'sample') source = 'sample';
      }
    }
    const final = { ...next, hourly, weatherSource: source, savedAt: new Date().toISOString() };
    await store.putLog(final);
    setLog(final);
    setMsg({ text, tone: 'ok' });
  };

  const save = async () => {
    const r = validate(log);
    setCheck(r);
    if (!r.ok) {
      const missing = [
        ...(r.outfit ? ['옷차림'] : []),
        ...log.segments.filter((s) => r.segments[s.id]).map((s) => s.label),
      ];
      setMsg({ text: `아직 비어 있어요: ${missing.join(', ')}`, tone: 'err' });
      const firstId = r.outfit ? 'card-outfit' : `card-${log.segments.find((s) => r.segments[s.id])?.id}`;
      document.getElementById(firstId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    await persist({ ...log, status: 'logged' }, '저장했어요.');
  };

  const markHome = () => persist({ ...log, status: 'home', segments: [] }, '집에 있었던 날로 저장했어요.');

  const isHome = log.status === 'home';
  const rest = log.dayType === 'restday';

  return (
    <>
      <div className="date-nav">
        <button type="button" className="icon-btn" aria-label="전날" onClick={() => onDate(addDays(date, -1))}>
          ‹
        </button>
        <div style={{ textAlign: 'center' }}>
          <h2>{formatDate(date)}</h2>
          <span className="kind">{rest ? '쉬는 날' : '평일'}{date === today ? ' · 오늘' : ''}</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="다음날"
          disabled={date >= today}
          style={{ opacity: date >= today ? 0.35 : 1 }}
          onClick={() => onDate(addDays(date, 1))}
        >
          ›
        </button>
      </div>

      {isHome ? (
        <section className="card status-card home">
          <h3>집에 있었던 날</h3>
          <p className="sub">
            {rest ? '쉬는 날이라 자동으로 집으로 기록했어요. 나갔다 왔다면 알려주세요.' : '이 날은 추천 비교에서 빠져요.'}
          </p>
          <div className="row">
            <button type="button" className="big-btn primary" onClick={() => update(withOuting(log, places))}>
              외출했어요
            </button>
            <button type="button" className="big-btn" onClick={() => update(withWeekdayPreset(log, places, settings))}>
              출근했어요
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="card status-card">
            <div className="row">
              <button type="button" className="big-btn" onClick={markHome}>
                오늘은 집에 있었어요
              </button>
            </div>
          </section>

          {sampleWeather && (
            <p className="notice">미리보기에서는 실제 날씨를 못 불러와서 예시 날씨로 보여줘요.</p>
          )}

          <OutfitSection
            mode={settings.recordMode}
            onModeChange={(recordMode) => onSettings({ ...settings, recordMode })}
            photo={log.photo}
            memo={log.outfitMemo}
            tags={log.outfitTags}
            error={check?.outfit}
            onPhoto={(photo) => update({ ...log, photo })}
            onMemo={(outfitMemo) => update({ ...log, outfitMemo })}
            onTags={(outfitTags) =>
              update({
                ...log,
                outfitTags,
                segments: log.segments.map((s) => {
                  const hasOuter = outfitTags.some((t) => categoryOf(t) === 'outer');
                  // 일반 "외투 벗음"은 아우터 태그가 없을 때만 유지, 고르면 옷 이름 칩으로 넘어간다
                  return {
                    ...s,
                    removedTags: s.removedTags.filter((t) =>
                      t === GENERIC_OUTER ? !hasOuter : outfitTags.includes(t),
                    ),
                  };
                }),
              })
            }
          />

          {log.segments.map((s) => (
            <SegmentCard
              key={s.id}
              seg={s}
              hours={weather[wkey(s.place)]?.hours}
              places={places}
              outfitTags={log.outfitTags}
              error={check?.segments[s.id]}
              removable={log.segments.length > 1}
              commuteRoute={settings.commuteTransports}
              onAddPlace={onAddPlace}
              onSaveRoute={(commuteTransports) => onSettings({ ...settings, commuteTransports })}
              onChange={updateSeg}
              onRemove={() => update({ ...log, segments: log.segments.filter((x) => x.id !== s.id) })}
            />
          ))}

          <button type="button" className="chip ghost" style={{ alignSelf: 'center', padding: '10px 18px' }} onClick={() => update(addOutingSegment(log, places))}>
            + 구간 추가 (계획에 없던 외출)
          </button>

          <section className="card">
            <h3>메모 (선택)</h3>
            <textarea
              id="day-memo"
              placeholder="오후에 바람이 갑자기 세짐"
              value={log.memo ?? ''}
              onChange={(e) => update({ ...log, memo: e.target.value })}
              aria-label="그날 메모"
            />
          </section>
        </>
      )}

      {!isHome && (
        <div className="savebar">
          <div className="inner">
            <span className={`msg ${msg.tone ?? ''}`} role="status">
              {msg.text}
            </span>
            <button type="button" className="save-btn" onClick={save}>
              저장
            </button>
          </div>
        </div>
      )}
      {isHome && msg.text && (
        <p className={`notice`} role="status">
          {msg.text}
        </p>
      )}
    </>
  );
}
