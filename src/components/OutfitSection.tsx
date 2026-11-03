import { useEffect, useState } from 'react';
import type { Category, Settings } from '../types';
import { CATEGORY_LABEL, DEFAULT_TAGS } from '../lib/constants';
import { shrinkPhoto } from '../lib/photo';

interface Props {
  mode: Settings['recordMode'];
  onModeChange: (m: Settings['recordMode']) => void;
  photo?: Blob;
  memo?: string;
  tags: string[];
  error?: string;
  onPhoto: (b?: Blob) => void;
  onMemo: (m: string) => void;
  onTags: (t: string[]) => void;
}

export function OutfitSection({ mode, onModeChange, photo, memo, tags, error, onPhoto, onMemo, onTags }: Props) {
  const [url, setUrl] = useState<string>();
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (!photo) return setUrl(undefined);
    const u = URL.createObjectURL(photo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);

  const toggle = (t: string) => onTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t]);
  const customTags = tags.filter((t) => !Object.values(DEFAULT_TAGS).flat().includes(t));

  const addCustom = () => {
    const t = custom.trim();
    if (t && !tags.includes(t)) onTags([...tags, t]);
    setCustom('');
  };

  const photoBlock = (
    <div className="photo-drop">
      {url ? <img src={url} alt="오늘 옷차림 사진" /> : <span>전신 사진 1장 추가</span>}
      <input
        id="outfit-photo"
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="옷차림 사진 선택"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onPhoto(await shrinkPhoto(f));
        }}
      />
    </div>
  );

  const memoBlock = (
    <textarea
      id="outfit-memo"
      placeholder="베이지 트렌치 + 얇은 니트 + 슬랙스"
      value={memo ?? ''}
      onChange={(e) => onMemo(e.target.value)}
      aria-label="옷차림 메모"
    />
  );

  return (
    <section className="card" aria-label="오늘 옷차림">
      <div className="row between">
        <h3>오늘 입은 옷</h3>
        <div className="seg-switch" role="group" aria-label="기본 기록 방식">
          <button type="button" aria-pressed={mode === 'photo'} onClick={() => onModeChange('photo')}>
            사진
          </button>
          <button type="button" aria-pressed={mode === 'memo'} onClick={() => onModeChange('memo')}>
            메모
          </button>
        </div>
      </div>

      {mode === 'photo' ? photoBlock : memoBlock}
      {photo && (
        <button type="button" className="link-btn" onClick={() => onPhoto(undefined)}>
          사진 지우기
        </button>
      )}
      {mode === 'photo' && !photo && (
        <p className="sub">사진 없이 아래 태그만 골라도 저장돼요.</p>
      )}

      {(Object.keys(DEFAULT_TAGS) as Category[]).map((cat) => (
        <div className="cat" key={cat}>
          <span className="label">{CATEGORY_LABEL[cat]}</span>
          <div className="chips">
            {DEFAULT_TAGS[cat].map((t) => (
              <button key={t} type="button" className="chip" aria-pressed={tags.includes(t)} onClick={() => toggle(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="cat">
        <span className="label">직접 추가</span>
        {customTags.length > 0 && (
          <div className="chips">
            {customTags.map((t) => (
              <button key={t} type="button" className="chip" aria-pressed onClick={() => toggle(t)}>
                {t}
              </button>
            ))}
          </div>
        )}
        <form
          className="add-tag"
          onSubmit={(e) => {
            e.preventDefault();
            addCustom();
          }}
        >
          <input
            id="custom-tag"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="플리스 조끼"
            aria-label="옷 태그 직접 입력"
          />
          <button type="submit" className="chip">
            추가
          </button>
        </form>
      </div>

      {error && <p className="error">{error}</p>}
    </section>
  );
}
