import { useEffect, useMemo, useState } from 'react';
import type { Place, Settings } from './types';
import { DEFAULT_SETTINGS, getStore } from './lib/db';
import { toYMD } from './lib/dates';
import type { Dong } from './lib/dongs';
import { RecordScreen } from './components/RecordScreen';
import { LogList } from './components/LogList';
import { Onboarding } from './components/Onboarding';
import { SettingsScreen } from './components/SettingsScreen';
import { placeFromDong } from './components/SetupParts';

type Store = Awaited<ReturnType<typeof getStore>>;
type Tab = 'record' | 'list' | 'settings';

const RECENT_LIMIT = 3;

export default function App() {
  const [store, setStore] = useState<Store | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [places, setPlaces] = useState<Place[]>([]);
  const [tab, setTab] = useState<Tab>('record');
  const [date, setDate] = useState(toYMD(new Date()));

  useEffect(() => {
    getStore().then(async (s) => {
      setSettings(await s.getSettings());
      setPlaces(await s.getPlaces());
      setStore(s);
    });
  }, []);

  // 구간 카드에 보여줄 장소: 집, 회사, 최근에 쓴 다른 장소 몇 곳
  const chipPlaces = useMemo(() => {
    const home = places.find((p) => p.kind === 'home');
    const work = places.find((p) => p.kind === 'work');
    const recent = places.filter((p) => p.kind === 'saved').slice(0, RECENT_LIMIT);
    return [home, work, ...recent].filter((p): p is Place => !!p);
  }, [places]);

  const changeSettings = (s: Settings) => {
    setSettings(s);
    store?.putSettings(s);
  };

  const upsertPlace = (p: Place) => {
    setPlaces((prev) => [p, ...prev.filter((x) => x.key !== p.key)]);
    store?.putPlace(p);
  };

  const addSavedPlace = (d: Dong): Place => {
    const regionName = `${d.parent} ${d.name}`;
    const existing = places.find((p) => p.kind === 'saved' && p.regionName === regionName);
    const place = existing ? { ...existing, lastUsedAt: new Date().toISOString() } : placeFromDong('saved', d);
    upsertPlace(place);
    return place;
  };

  if (!store) {
    return (
      <main className="app">
        <p className="empty">불러오는 중…</p>
      </main>
    );
  }

  if (!settings.onboarded || !places.some((p) => p.kind === 'home')) {
    return (
      <main className="app">
        <header className="topbar">
          <h1 className="brand">그날의 옷</h1>
        </header>
        <p className="sub ob-intro">
          그날 입은 옷과 더웠는지 추웠는지를 남겨두면, 비슷한 날씨가 왔을 때 다시 꺼내 볼 수 있어요. 먼저 동네부터 알려주세요.
        </p>
        <Onboarding
          settings={settings}
          onDone={(ps, s) => {
            ps.forEach(upsertPlace);
            changeSettings(s);
            setTab('record');
          }}
        />
      </main>
    );
  }

  return (
    <main className="app">
      <header className="topbar">
        <h1 className="brand">그날의 옷</h1>
        <nav className="tabs" aria-label="화면">
          <button type="button" aria-pressed={tab === 'record'} onClick={() => setTab('record')}>
            기록하기
          </button>
          <button type="button" aria-pressed={tab === 'list'} onClick={() => setTab('list')}>
            목록
          </button>
          <button type="button" aria-pressed={tab === 'settings'} onClick={() => setTab('settings')}>
            설정
          </button>
        </nav>
      </header>

      {!store.persistent && (
        <p className="notice">이 화면에서는 기록이 임시로만 저장돼요. 새로고침하면 사라질 수 있어요.</p>
      )}

      {tab === 'record' && (
        <RecordScreen
          store={store}
          places={chipPlaces}
          settings={settings}
          onSettings={changeSettings}
          date={date}
          onDate={setDate}
          onAddPlace={addSavedPlace}
        />
      )}
      {tab === 'list' && (
        <LogList
          store={store}
          onOpen={(d) => {
            setDate(d);
            setTab('record');
          }}
        />
      )}
      {tab === 'settings' && (
        <SettingsScreen
          places={places}
          settings={settings}
          onPlace={upsertPlace}
          onRemoveWork={() => {
            setPlaces((prev) => prev.filter((p) => p.kind !== 'work'));
            store.removePlace('work');
          }}
          onSettings={changeSettings}
        />
      )}
    </main>
  );
}
