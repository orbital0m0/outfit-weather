import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { DailyLog, DayWeather, OutfitDraft, Place, Segment, Settings } from '../types';
import { OUTING_PRESET } from '../lib/constants';
import { formatDate, isRestDay, toYMD } from '../lib/dates';
import { draftFromLog } from '../lib/draft';
import { guideFor } from '../lib/guide';
import { comfortInfo, deltaText, findSimilarDays, type DayMatch, type TodaySegment } from '../lib/match';
import { segmentFromPreset, weekdayPresets } from '../lib/record';
import { fetchDayWeather, segmentWeather } from '../lib/weather';
import type { getStore } from '../lib/db';
import { OutfitChecklist } from './OutfitChecklist';

type Store = Awaited<ReturnType<typeof getStore>>;

interface Props {
  store: Store;
  places: Place[];
  settings: Settings;
  onGoRecord: () => void;
}

function Thumb({ blob }: { blob?: Blob }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url ? <img className="thumb" src={url} alt="그날 옷차림 사진" /> : null;
}

// 하루 온도선: 구간별 체감온도를 점으로 찍고 이어서, 하루 중 언제 춥고 따뜻한지 한눈에 보여준다
function DayLine({ segs, todaySegs }: { segs: Segment[]; todaySegs: TodaySegment[] }) {
  const values = segs.map((s) => todaySegs.find((t) => t.seg.id === s.id)?.wx);
  const feels = values.filter((v): v is NonNullable<typeof v> => !!v).map((v) => v.feelsLike);
  const lo = Math.min(...feels);
  const hi = Math.max(...feels);
  const y = (f: number) => 8 + (hi === lo ? 0.5 : 1 - (f - lo) / (hi - lo)) * 32; // 0~48 중 8~40
  const n = segs.length;
  const pts = values
    .map((v, i) => (v ? `${((i + 0.5) / n) * 100},${y(v.feelsLike)}` : null))
    .filter(Boolean)
    .join(' ');
  return (
    <div className="strip" style={{ '--n': n } as CSSProperties}>
      {feels.length === n && n > 1 && (
        <svg className="strip-line" viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={pts} />
        </svg>
      )}
      {segs.map((s, i) => {
        const wx = values[i];
        return (
          <div className="strip-col" key={s.id}>
            <div className="strip-plot">{wx && <span className="strip-dot" style={{ top: y(wx.feelsLike) }} />}</div>
            <span className="strip-feels">{wx ? `${wx.feelsLike}°` : '…'}</span>
            <span className="strip-temp">{wx ? `기온 ${wx.temp}°` : ''}</span>
            <span className="strip-name">{s.label}</span>
            <span className="strip-time">{s.start}</span>
            {s.setting === 'indoor' && <span className="strip-tag">실내</span>}
            {wx?.rain && <span className="strip-tag rain">비</span>}
          </div>
        );
      })}
    </div>
  );
}

export function HomeScreen({ store, places, settings, onGoRecord }: Props) {
  const today = toYMD(new Date());
  const rest = isRestDay(today);
  const [weather, setWeather] = useState<Record<string, DayWeather>>({});
  const [logs, setLogs] = useState<DailyLog[] | null>(null);
  const [draft, setDraft] = useState<OutfitDraft | null | undefined>(undefined);

  // 오늘 보여줄 구간: 평일은 기본 4구간, 쉬는 날은 "외출하면"
  const segs = useMemo(() => {
    const presets = rest ? [OUTING_PRESET] : weekdayPresets(settings);
    return presets.map((p) => segmentFromPreset(p, places, settings));
  }, [rest, settings, places]);

  useEffect(() => {
    store.allLogs().then(setLogs);
    store.getDraft(today).then((d) => setDraft(d ?? null));
    // 하루 지난 체크리스트는 지운다
    store.getDraft(toYMD(new Date(Date.now() - 864e5))).then((d) => d && store.removeDraft(d.date));
  }, [store, today]);

  useEffect(() => {
    const uniq = new Map(segs.map((s) => [s.place.key, s.place]));
    uniq.forEach((p) => {
      fetchDayWeather(p, today).then((dw) => setWeather((w) => ({ ...w, [p.key]: dw })));
    });
  }, [segs, today]);

  const todaySegs: TodaySegment[] = segs
    .map((seg) => ({ seg, wx: segmentWeather(weather[seg.place.key]?.hours, seg) }))
    .filter((x): x is TodaySegment => !!x.wx);
  const ready = todaySegs.length === segs.length;
  const sample = Object.values(weather).some((w) => w.source === 'sample');
  const loggedCount = logs?.filter((l) => l.status === 'logged').length ?? 0;
  const similar: DayMatch[] = ready && logs ? findSimilarDays(today, todaySegs, logs) : [];
  const rainy = todaySegs.some((t) => t.wx.rain);
  const outdoorFeels = todaySegs.filter((t) => t.seg.setting !== 'indoor').map((t) => t.wx.feelsMin);
  const coldest = outdoorFeels.length ? Math.min(...outdoorFeels) : todaySegs[0]?.wx.feelsMin;

  const choose = (m: DayMatch) => {
    const d = draftFromLog(m.log, today);
    setDraft(d);
    store.putDraft(d);
  };
  const updateDraft = (d: OutfitDraft) => {
    setDraft(d);
    store.putDraft(d);
  };
  const clearDraft = () => {
    setDraft(null);
    store.removeDraft(today);
  };

  const chosen = draft ? logs?.find((l) => l.date === draft.sourceLogId) : undefined;
  const chosenMatch = chosen ? similar.find((m) => m.log.date === chosen.date) : undefined;

  return (
    <>
      <div className="home-head">
        <h2>{formatDate(today)}</h2>
        <span className="kind">{rest ? '쉬는 날, 외출한다면' : '평일'}</span>
      </div>

      <section className="card day-card" aria-label="오늘 구간별 날씨">
        <div className="row between">
          <h3>오늘 바깥 날씨</h3>
          {sample && <span className="badge">예시 날씨</span>}
        </div>
        <DayLine segs={segs} todaySegs={todaySegs} />
        <p className="sub">큰 숫자는 체감온도예요.{rainy ? ' 오늘 비 소식이 있어요. 우산을 챙기세요.' : ''}</p>
      </section>

      {draft && chosen ? (
        <section className="card match-card picked" aria-label="오늘 옷차림 체크리스트">
          <div className="row between">
            <h3>오늘 옷차림</h3>
            <button type="button" className="link-btn" onClick={clearDraft}>
              다른 카드 고르기
            </button>
          </div>
          <p className="sub">
            {formatDate(chosen.date)} 옷차림을 바탕으로 해요. 입으면서 체크하고, 바꾼 옷은 [바꾸기]로 고쳐주세요.
          </p>
          {chosenMatch && <p className="advice">{chosenMatch.advice}</p>}
          {draft.items.length === 0 && <p className="sub">그날은 사진만 남겨서 옷 목록이 없어요. 아래에서 오늘 옷을 추가해 보세요.</p>}
          <OutfitChecklist draft={draft} onChange={updateDraft} />
        </section>
      ) : !ready || !logs ? (
        <p className="empty">날씨 불러오는 중…</p>
      ) : similar.length ? (
        <>
          <h3 className="section-title">비슷한 날씨였던 날</h3>
          {similar.map((m) => {
            const delta = deltaText(m.feelsDelta);
            return (
              <section key={m.log.date} className="card match-card" aria-label={`${formatDate(m.log.date)} 기록`}>
                <div className="match-top">
                  <Thumb blob={m.log.photo} />
                  <div className="match-body">
                    <strong>{formatDate(m.log.date)}</strong>
                    {delta && <span className="sub">{delta}</span>}
                    <span className="match-outfit">
                      {m.log.outfitTags.join(', ') || m.log.outfitMemo || '사진만 기록'}
                    </span>
                  </div>
                </div>
                <ul className="match-rows">
                  {m.matches.map((x) => {
                    const c = comfortInfo(x.past.comfort);
                    const extras = [
                      x.past.removedTags.length ? '외투 벗음' : '',
                      x.past.discomfortAt === 'inside' ? '차 안에서' : x.past.discomfortAt === 'both' ? '밖과 차 안 모두' : '',
                    ].filter(Boolean);
                    return (
                      <li key={x.past.id} className="match-row">
                        <span className="mr-name">{x.past.label}</span>
                        <span className="mr-feels">체감 {x.pastWx.feelsLike}°</span>
                        <span className="mr-right">
                          {extras.length > 0 && <span className="mr-extra">{extras.join(', ')}</span>}
                          <span className={`badge ${c?.tone ?? ''}`}>{c?.label}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="advice">{m.advice}</p>
                <button type="button" className="big-btn primary" onClick={() => choose(m)}>
                  이 옷차림으로 준비하기
                </button>
              </section>
            );
          })}
        </>
      ) : (
        <section className="card" aria-label="옷차림 가이드">
          <h3>오늘은 이렇게 입어보세요</h3>
          <p className="guide">{coldest != null ? guideFor(coldest) : ''}</p>
          <p className="sub">
            체감 {coldest}° 기준 일반 가이드예요.{' '}
            {loggedCount === 0
              ? '오늘 저녁 첫 기록을 남기면, 비슷한 날씨에 내 기록으로 보여줄게요.'
              : `기록 ${loggedCount}개 중에는 아직 비슷한 날씨가 없어요. 기록이 쌓이면 내 기록으로 바뀌어요.`}
          </p>
        </section>
      )}

      <button type="button" className="big-btn" style={{ alignSelf: 'stretch' }} onClick={onGoRecord}>
        오늘 기록하러 가기
      </button>
    </>
  );
}
