import { useEffect, useState } from 'react';
import type { Settings } from './types';
import { DEFAULT_SETTINGS, getStore } from './lib/db';
import { SAMPLE_PLACES } from './lib/constants';
import { toYMD } from './lib/dates';
import { RecordScreen } from './components/RecordScreen';
import { LogList } from './components/LogList';

type Store = Awaited<ReturnType<typeof getStore>>;

export default function App() {
  const [store, setStore] = useState<Store | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [tab, setTab] = useState<'record' | 'list'>('record');
  const [date, setDate] = useState(toYMD(new Date()));

  useEffect(() => {
    getStore().then(async (s) => {
      setSettings(await s.getSettings());
      setStore(s);
    });
  }, []);

  const changeSettings = (s: Settings) => {
    setSettings(s);
    store?.putSettings(s);
  };

  return (
    <main className="app">
      <header className="topbar">
        <h1 className="brand">그날의 옷</h1>
        <nav className="tabs" aria-label="화면">
          <button type="button" aria-pressed={tab === 'record'} onClick={() => setTab('record')}>
            기록하기
          </button>
          <button type="button" aria-pressed={tab === 'list'} onClick={() => setTab('list')}>
            기록 목록
          </button>
        </nav>
      </header>

      {store && !store.persistent && (
        <p className="notice">이 화면에서는 기록이 임시로만 저장돼요. 새로고침하면 사라질 수 있어요.</p>
      )}

      {!store ? (
        <p className="empty">불러오는 중…</p>
      ) : tab === 'record' ? (
        <RecordScreen
          store={store}
          places={SAMPLE_PLACES}
          settings={settings}
          onSettings={changeSettings}
          date={date}
          onDate={setDate}
        />
      ) : (
        <LogList
          store={store}
          onOpen={(d) => {
            setDate(d);
            setTab('record');
          }}
        />
      )}
    </main>
  );
}
