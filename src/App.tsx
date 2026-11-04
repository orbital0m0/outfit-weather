import { useEffect, useMemo, useState } from 'react';
import type { Place, Settings } from './types';
import { DEFAULT_SETTINGS, getStore } from './lib/db';
import { toYMD } from './lib/dates';
import type { Dong } from './lib/dongs';
import { RecordScreen } from './components/RecordScreen';
import { HomeScreen } from './components/HomeScreen';
import { LogList } from './components/LogList';
import { Onboarding } from './components/Onboarding';
import { SettingsScreen } from './components/SettingsScreen';
import { placeFromDong } from './components/SetupParts';
import { Icon, type IconName } from './components/Icon';

type Store = Awaited<ReturnType<typeof getStore>>;
type Tab = 'home' | 'record' | 'list' | 'settings';

const RECENT_LIMIT = 3;

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'home', label: '오늘', icon: 'home' },
  { id: 'record', label: '기록', icon: 'pen' },
  { id: 'list', label: '목록', icon: 'list' },
  { id: 'settings', label: '설정', icon: 'sliders' },
];

export default function App() {
  const [store, setStore] = useState<Store | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [places, setPlaces] = useState<Place[]>([]);
  const [tab, setTab] = useState<Tab>('home');
  const [date, setDate] = useState(toYMD(new Date()));
  const [dir, setDir] = useState<'left' | 'right' | 'none'>('none');

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
      <main className="app no-nav">
        <p className="empty">불러오는 중…</p>
      </main>
    );
  }

  if (!settings.onboarded || !places.some((p) => p.kind === 'home')) {
    return (
      <main className="app no-nav">
        <header className="topbar">
          <span className="brand">그날의 옷</span>
        </header>
        <h1 className="page-title">처음 설정</h1>
        <p className="sub ob-intro">
          그날 입은 옷과 더웠는지 추웠는지를 남겨두면, 비슷한 날씨가 왔을 때 다시 꺼내 볼 수 있어요. 먼저 동네부터 알려주세요.
        </p>
        <Onboarding
          settings={settings}
          onDone={(ps, s) => {
            ps.forEach(upsertPlace);
            changeSettings(s);
            setTab('home');
          }}
        />
      </main>
    );
  }

  const go = (t: Tab, opts?: { today?: boolean }) => {
    if (opts?.today) setDate(toYMD(new Date()));
    if (t === tab) return;
    setDir(TABS.findIndex((x) => x.id === t) > TABS.findIndex((x) => x.id === tab) ? 'right' : 'left');
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  return (
    <main className="app">
      <header className="topbar">
        <span className="brand">그날의 옷</span>
      </header>

      {!store.persistent && (
        <p className="notice">이 화면에서는 기록이 임시로만 저장돼요. 새로고침하면 사라질 수 있어요.</p>
      )}

      <div className="page" key={tab} data-dir={dir}>
        {tab === 'home' && (
          <HomeScreen store={store} places={chipPlaces} settings={settings} onGoRecord={() => go('record', { today: true })} />
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
          <>
            <h1 className="page-title">기록 목록</h1>
            <LogList
              store={store}
              onOpen={(d) => {
                setDate(d);
                go('record');
              }}
            />
          </>
        )}
        {tab === 'settings' && (
          <>
            <h1 className="page-title">설정</h1>
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
          </>
        )}
      </div>

      <nav className="tabbar" aria-label="화면">
        <div className="inner">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => go(t.id, { today: t.id === 'record' })}
            >
              <span className="ico">
                <Icon name={t.icon} />
              </span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
