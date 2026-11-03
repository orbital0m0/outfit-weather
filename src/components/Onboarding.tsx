import { useState } from 'react';
import type { Place, Settings } from '../types';
import { DONG_ATTRIBUTION } from '../lib/dongs';
import { DongSearch } from './DongSearch';
import { RouteEditor, TimesEditor, placeFromDong, splitRegion, timesValid } from './SetupParts';

interface Props {
  settings: Settings;
  onDone: (places: Place[], settings: Settings) => void;
}

const STEPS = ['집', '회사', '출퇴근', '시간'] as const;

export function Onboarding({ settings, onDone }: Props) {
  const [step, setStep] = useState(0);
  const [home, setHome] = useState<Place>();
  const [work, setWork] = useState<Place>();
  const [noWork, setNoWork] = useState(false);
  const [route, setRoute] = useState(settings.commuteTransports);
  const [times, setTimes] = useState(settings.weekdayTimes);

  const canNext = [!!home, !!work || noWork, true, timesValid(times)][step];
  const last = step === STEPS.length - 1;

  const finish = () => {
    if (!home) return;
    const places = [home, ...(work && !noWork ? [work] : [])];
    onDone(places, { ...settings, onboarded: true, commuteTransports: route, weekdayTimes: times });
  };

  return (
    <section className="card onboarding" aria-label="처음 설정">
      <ol className="steps" aria-label="진행 단계">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined} className={i < step ? 'done' : ''}>
            {s}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <>
          <h3 className="ob-title">집은 어느 동네예요?</h3>
          <p className="sub">출근길과 밤 구간 날씨를 이 동네 기준으로 가져와요. 동 이름까지만 저장해요.</p>
          <DongSearch
            id="ob-home"
            label="집 동네"
            autoFocus
            selected={splitRegion(home)}
            onSelect={(d) => setHome(placeFromDong('home', d))}
          />
        </>
      )}

      {step === 1 && (
        <>
          <h3 className="ob-title">회사는 어느 동네예요?</h3>
          <p className="sub">점심과 낮 구간 날씨는 회사 동네 기준이에요.</p>
          {!noWork && (
            <DongSearch
              id="ob-work"
              label="회사 동네"
              autoFocus
              selected={splitRegion(work)}
              onSelect={(d) => setWork(placeFromDong('work', d))}
            />
          )}
          <label className="check-row">
            <input id="ob-nowork" type="checkbox" checked={noWork} onChange={(e) => setNoWork(e.target.checked)} />
            집과 같은 동네예요 (또는 재택이 많아요)
          </label>
        </>
      )}

      {step === 2 && (
        <>
          <h3 className="ob-title">평소 출퇴근은 어떻게 해요?</h3>
          <p className="sub">
            여러 개 고를 수 있어요. 매일 출근길·밤 구간에 자동으로 채워지고, 다른 날만 바꾸면 돼요. 건너뛰어도 괜찮아요.
          </p>
          <RouteEditor value={route} onChange={setRoute} />
        </>
      )}

      {step === 3 && (
        <>
          <h3 className="ob-title">평일엔 보통 언제 밖에 있어요?</h3>
          <p className="sub">구간마다 기본 시간이에요. 기록할 때 그날만 바꿀 수도 있어요.</p>
          <TimesEditor value={times} onChange={setTimes} />
        </>
      )}

      <div className="row between ob-actions">
        {step > 0 ? (
          <button type="button" className="big-btn" onClick={() => setStep(step - 1)}>
            이전
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="big-btn primary"
          disabled={!canNext}
          onClick={() => (last ? finish() : setStep(step + 1))}
        >
          {last ? '기록 시작하기' : '다음'}
        </button>
      </div>

      <p className="fineprint">{DONG_ATTRIBUTION}</p>
    </section>
  );
}
