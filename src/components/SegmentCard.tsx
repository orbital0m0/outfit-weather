import { useState } from 'react';
import type { HourlyWeather, Place, Segment, Transport } from '../types';
import { DISCOMFORT, GENERIC_OUTER, TRANSPORT, categoryOf, isVehicle } from '../lib/constants';
import { askTransport } from '../lib/record';
import { segmentWeather } from '../lib/weather';
import { ComfortPicker } from './ComfortPicker';
import { DongSearch } from './DongSearch';
import type { Dong } from '../lib/dongs';

interface Props {
  seg: Segment;
  hours?: HourlyWeather[];
  places: Place[];
  outfitTags: string[];
  error?: string;
  removable: boolean;
  commuteRoute: Transport[];
  onSaveRoute: (t: Transport[]) => void;
  onAddPlace: (d: Dong) => Place;
  onChange: (s: Segment) => void;
  onRemove: () => void;
}

export function SegmentCard({ seg, hours, places, outfitTags, error, removable, commuteRoute, onSaveRoute, onAddPlace, onChange, onRemove }: Props) {
  const [addingPlace, setAddingPlace] = useState(false);
  const [fixOpen, setFixOpen] = useState(!!seg.correction);
  const wx = segmentWeather(hours, seg);
  const outers = outfitTags.filter((t) => categoryOf(t) === 'outer');
  const set = (patch: Partial<Segment>) => onChange({ ...seg, ...patch });

  const transports = seg.transports ?? [];
  const rode = transports.some(isVehicle);
  const askWhere = rode && seg.comfort != null && seg.comfort !== 0;
  const isCommute = seg.type === 'commute' || seg.type === 'evening';
  const sameAsRoute =
    transports.length === commuteRoute.length && transports.every((t) => commuteRoute.includes(t));

  const toggleTransport = (t: Transport) => {
    const next = transports.includes(t) ? transports.filter((x) => x !== t) : [...transports, t];
    // 차를 안 탔으면 "어디서" 답은 의미가 없으니 지운다
    set({ transports: next, discomfortAt: next.some(isVehicle) ? seg.discomfortAt : undefined });
  };

  const toggleRemoved = (tag: string) =>
    set({
      removedTags: seg.removedTags.includes(tag)
        ? seg.removedTags.filter((t) => t !== tag)
        : [...seg.removedTags, tag],
    });

  const setFix = (key: 'temp' | 'feelsLike', raw: string) => {
    const n = raw === '' ? undefined : Number(raw);
    const next = { ...seg.correction, [key]: Number.isFinite(n) ? n : undefined };
    set({ correction: next });
  };

  return (
    <section id={`card-${seg.id}`} className={`card${error ? ' has-error' : ''}`} aria-label={`${seg.label} 구간`}>
      <div className="seg-head">
        <h3>{seg.label}</h3>
        <div className="times">
          <input
            id={`${seg.id}-start`}
            type="time"
            value={seg.start}
            aria-label="시작 시간"
            onChange={(e) => set({ start: e.target.value })}
          />
          <span aria-hidden="true">–</span>
          <input
            id={`${seg.id}-end`}
            type="time"
            value={seg.end}
            aria-label="끝 시간"
            onChange={(e) => set({ end: e.target.value })}
          />
        </div>
      </div>

      <div className="chips" role="group" aria-label="장소">
        {(places.some((p) => p.key === seg.place.key) ? places : [...places, seg.place]).map((p) => (
          <button
            key={p.key}
            type="button"
            className="chip"
            aria-pressed={seg.place.key === p.key}
            onClick={() => set({ place: p })}
          >
            {p.kind === 'saved' ? p.label : `${p.label} 근처`}
          </button>
        ))}
        <button type="button" className="chip ghost" aria-expanded={addingPlace} onClick={() => setAddingPlace((v) => !v)}>
          {addingPlace ? '닫기' : '+ 다른 곳'}
        </button>
      </div>
      {addingPlace && (
        <DongSearch
          id={`${seg.id}-place`}
          label="어느 동네에 있었어요?"
          placeholder="성수, 해운대 우동"
          autoFocus
          onSelect={(d) => {
            set({ place: onAddPlace(d) });
            setAddingPlace(false);
          }}
        />
      )}

      <div className="wx">
        {wx ? (
          <>
            <span className="t">{wx.temp}°</span>
            <span className="f">
              체감 {wx.feelsLike}° · 바람 {wx.wind}m/s
            </span>
            {wx.corrected && <span className="tag fix">보정됨</span>}
          </>
        ) : (
          <span className="f">날씨 불러오는 중…</span>
        )}
      </div>

      <div className="cat">
        <span className="label">이때 어땠어요?</span>
        <ComfortPicker
          value={seg.comfort}
          onChange={(comfort) => set({ comfort, discomfortAt: comfort === 0 ? undefined : seg.discomfortAt })}
        />
        {error && <p className="error">{error}</p>}
      </div>


      <div className="cat">
        <span className="label">이 구간에 벗고 있던 옷</span>
        <div className="chips">
          {outers.length > 0 ? (
            outers.map((t) => (
              <button
                key={t}
                type="button"
                className="chip"
                aria-pressed={seg.removedTags.includes(t)}
                onClick={() => toggleRemoved(t)}
              >
                {t} 벗음
              </button>
            ))
          ) : (
            // 아우터 태그를 안 골랐거나 메모로만 기록한 날도 표시할 수 있게 일반 칩을 둔다
            <button
              type="button"
              className="chip"
              aria-pressed={seg.removedTags.includes(GENERIC_OUTER)}
              onClick={() => toggleRemoved(GENERIC_OUTER)}
            >
              외투 벗음
            </button>
          )}
        </div>
        {outers.length === 0 && <span className="sub">위에서 아우터를 고르면 옷 이름으로 표시돼요.</span>}
      </div>

      {askTransport(seg) && (
        <div className="cat">
          <span className="label">이동수단 (선택, 여러 개 가능)</span>
          <div className="chips">
            {TRANSPORT.map((t) => (
              <button
                key={t.value}
                type="button"
                className="chip"
                aria-pressed={transports.includes(t.value)}
                onClick={() => toggleTransport(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {isCommute && transports.length > 0 && !sameAsRoute && (
            <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => onSaveRoute(transports)}>
              평소 출퇴근 경로로 저장
            </button>
          )}
          {isCommute && transports.length > 0 && sameAsRoute && (
            <span className="sub">평소 경로예요. 다른 날만 바꾸면 돼요.</span>
          )}
        </div>
      )}

      {askWhere && (
        <div className="cat">
          <span className="label">어디서 그랬어요? (선택)</span>
          <div className="chips">
            {DISCOMFORT.map((d) => (
              <button
                key={d.value}
                type="button"
                className="chip"
                aria-pressed={seg.discomfortAt === d.value}
                onClick={() => set({ discomfortAt: seg.discomfortAt === d.value ? undefined : d.value })}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="divider" />
      <div className="row between">
        <button type="button" className="link-btn" onClick={() => setFixOpen((v) => !v)} aria-expanded={fixOpen}>
          {fixOpen ? '보정 닫기' : '내 날씨앱과 달라요'}
        </button>
        {removable && (
          <button type="button" className="link-btn" onClick={onRemove}>
            구간 삭제
          </button>
        )}
      </div>

      {fixOpen && (
        <div className="fix-box">
          <label>
            기온 (°C)
            <input
              id={`${seg.id}-fix-temp`}
              type="number"
              inputMode="decimal"
              value={seg.correction?.temp ?? ''}
              placeholder={wx ? String(wx.temp) : ''}
              onChange={(e) => setFix('temp', e.target.value)}
            />
          </label>
          <label>
            체감온도 (°C)
            <input
              id={`${seg.id}-fix-feels`}
              type="number"
              inputMode="decimal"
              value={seg.correction?.feelsLike ?? ''}
              placeholder={wx ? String(wx.feelsLike) : ''}
              onChange={(e) => setFix('feelsLike', e.target.value)}
            />
          </label>
          <label className="full">
            날씨앱 캡처 (선택, 참고용)
            <input
              id={`${seg.id}-fix-shot`}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) set({ correction: { ...seg.correction, screenshot: f } });
              }}
            />
            {seg.correction?.screenshot && <span>캡처 첨부됨</span>}
          </label>
        </div>
      )}
    </section>
  );
}
