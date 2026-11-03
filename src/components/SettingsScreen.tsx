import { useState } from 'react';
import type { Place, Settings } from '../types';
import { DONG_ATTRIBUTION } from '../lib/dongs';
import { DongSearch } from './DongSearch';
import { RouteEditor, TimesEditor, placeFromDong, splitRegion, timesValid } from './SetupParts';

interface Props {
  places: Place[];
  settings: Settings;
  onPlace: (p: Place) => void;
  onRemoveWork: () => void;
  onSettings: (s: Settings) => void;
}

export function SettingsScreen({ places, settings, onPlace, onRemoveWork, onSettings }: Props) {
  const home = places.find((p) => p.kind === 'home');
  const work = places.find((p) => p.kind === 'work');
  const [times, setTimes] = useState(settings.weekdayTimes);
  const [saved, setSaved] = useState(false);

  return (
    <>
      <section className="card">
        <h3>집·회사 동네</h3>
        <DongSearch id="set-home" label="집" selected={splitRegion(home)} onSelect={(d) => onPlace(placeFromDong('home', d))} />
        <DongSearch id="set-work" label="회사" selected={splitRegion(work)} onSelect={(d) => onPlace(placeFromDong('work', d))} />
        {work ? (
          <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={onRemoveWork}>
            회사 지우기 (집과 같은 동네로 보기)
          </button>
        ) : (
          <p className="sub">회사를 등록하지 않으면 점심·낮 구간도 집 동네 날씨로 봐요.</p>
        )}
        <p className="sub">바꾼 동네는 앞으로의 기록부터 적용돼요. 이미 저장한 기록은 그때 동네 날씨 그대로 남아요.</p>
      </section>

      <section className="card">
        <h3>평소 출퇴근 이동수단</h3>
        <RouteEditor value={settings.commuteTransports} onChange={(commuteTransports) => onSettings({ ...settings, commuteTransports })} />
      </section>

      <section className="card">
        <h3>평일 구간 기본 시간</h3>
        <TimesEditor
          value={times}
          onChange={(v) => {
            setTimes(v);
            setSaved(false);
          }}
        />
        <div className="row">
          <button
            type="button"
            className="big-btn primary"
            disabled={!timesValid(times)}
            onClick={() => {
              onSettings({ ...settings, weekdayTimes: times });
              setSaved(true);
            }}
          >
            시간 저장
          </button>
          {saved && <span className="sub" role="status">저장했어요. 다음 새 기록부터 적용돼요.</span>}
        </div>
      </section>

      <section className="card">
        <h3>기본 기록 방식</h3>
        <div className="seg-switch" role="group" aria-label="기본 기록 방식">
          <button type="button" aria-pressed={settings.recordMode === 'photo'} onClick={() => onSettings({ ...settings, recordMode: 'photo' })}>
            사진
          </button>
          <button type="button" aria-pressed={settings.recordMode === 'memo'} onClick={() => onSettings({ ...settings, recordMode: 'memo' })}>
            메모
          </button>
        </div>
      </section>

      <p className="fineprint">
        날씨: Open-Meteo (open-meteo.com). {DONG_ATTRIBUTION}
      </p>
    </>
  );
}
