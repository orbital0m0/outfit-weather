import { useState } from 'react';
import type { OutfitDraft, OutfitDraftItem } from '../types';
import { CATEGORY_LABEL, DEFAULT_TAGS, categoryOf } from '../lib/constants';
import { uid } from '../lib/record';
import { Icon } from './Icon';

interface Props {
  draft: OutfitDraft;
  onChange: (d: OutfitDraft) => void;
}

export function OutfitChecklist({ draft, onChange }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const [adding, setAdding] = useState('');

  const setItem = (id: string, patch: Partial<OutfitDraftItem>) =>
    onChange({ ...draft, items: draft.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });

  const toggle = (it: OutfitDraftItem) => {
    if (it.state === 'added') return onChange({ ...draft, items: draft.items.filter((x) => x.id !== it.id) });
    if (it.state === 'replaced') return setItem(it.id, { state: 'skipped', replacedBy: undefined });
    setItem(it.id, { state: it.state === 'worn' ? 'skipped' : 'worn' });
  };

  const replace = (it: OutfitDraftItem, to: string) => {
    const t = to.trim();
    if (!t) return;
    setItem(it.id, { state: 'replaced', replacedBy: t });
    setEditing(null);
    setCustom('');
  };

  const add = () => {
    const t = adding.trim();
    if (!t) return;
    onChange({ ...draft, items: [...draft.items, { id: uid('i'), label: t, category: categoryOf(t), state: 'added' }] });
    setAdding('');
  };

  const original = draft.items.filter((it) => it.state !== 'added');
  const done = original.length > 0 && original.every((it) => it.state !== 'skipped');

  return (
    <div className="checklist">
      <ul className="ck-list">
        {draft.items.map((it) => {
          const on = it.state !== 'skipped';
          const options = it.category ? DEFAULT_TAGS[it.category].filter((t) => t !== it.label) : [];
          return (
            <li key={it.id} className={`ck-item${on ? ' on' : ''}`}>
              <div className="ck-main">
                <button type="button" className="ck-toggle" aria-pressed={on} onClick={() => toggle(it)}>
                  <span className="ck-box" aria-hidden="true">
                    {on && <Icon name="check" />}
                  </span>
                  <span className="ck-label">
                    {it.state === 'replaced' ? (
                      <>
                        <s>{it.label}</s> → {it.replacedBy}
                      </>
                    ) : (
                      it.label
                    )}
                    {it.state === 'added' && <em className="ck-tag">추가</em>}
                  </span>
                </button>
                {it.state !== 'added' && (
                  <button
                    type="button"
                    className="link-btn"
                    aria-expanded={editing === it.id}
                    onClick={() => setEditing(editing === it.id ? null : it.id)}
                  >
                    {editing === it.id ? '닫기' : '바꾸기'}
                  </button>
                )}
              </div>
              {editing === it.id && (
                <div className="ck-replace">
                  {it.category && <span className="label">{CATEGORY_LABEL[it.category]} 중에서</span>}
                  {options.length > 0 && (
                    <div className="chips">
                      {options.map((o) => (
                        <button key={o} type="button" className="chip" onClick={() => replace(it, o)}>
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                  <form
                    className="add-tag"
                    onSubmit={(e) => {
                      e.preventDefault();
                      replace(it, custom);
                    }}
                  >
                    <input
                      id={`${it.id}-replace`}
                      value={custom}
                      onChange={(e) => setCustom(e.target.value)}
                      placeholder="직접 입력"
                      aria-label={`${it.label} 대신 입은 옷`}
                    />
                    <button type="submit" className="chip">
                      바꾸기
                    </button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <form
        className="add-tag"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input id="ck-add" value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="+ 다른 옷 추가 (목도리)" aria-label="다른 옷 추가" />
        <button type="submit" className="chip">
          추가
        </button>
      </form>

      {done && (
        <p className="ck-done" role="status">
          준비 완료. 저녁 기록에 이대로 채워둘게요.
        </p>
      )}
    </div>
  );
}
