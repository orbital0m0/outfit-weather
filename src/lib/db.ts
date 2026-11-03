import Dexie, { type Table } from 'dexie';
import type { DailyLog, OutfitDraft, Place, Settings, WeekdaySegment } from '../types';
import { WEEKDAY_PRESET } from './constants';

// 기기 안 저장소(IndexedDB). 브라우저가 막으면(사생활 보호 모드, 미리보기 등)
// 메모리 저장으로 대체해서 앱은 계속 동작하게 한다.

class OutfitDB extends Dexie {
  logs!: Table<DailyLog, string>;
  settings!: Table<Settings & { id: 'me' }, string>;
  places!: Table<Place, string>;
  drafts!: Table<OutfitDraft, string>;
  constructor() {
    super('outfit-weather');
    this.version(1).stores({ logs: 'date', settings: 'id' });
    this.version(2).stores({ logs: 'date', settings: 'id', places: 'key' });
    this.version(3).stores({ logs: 'date', settings: 'id', places: 'key', drafts: 'date' });
  }
}

interface Store {
  getLog(date: string): Promise<DailyLog | undefined>;
  putLog(log: DailyLog): Promise<void>;
  allLogs(): Promise<DailyLog[]>;
  getSettings(): Promise<Settings>;
  putSettings(s: Settings): Promise<void>;
  getPlaces(): Promise<Place[]>;
  putPlace(p: Place): Promise<void>;
  removePlace(key: string): Promise<void>;
  getDraft(date: string): Promise<OutfitDraft | undefined>;
  putDraft(d: OutfitDraft): Promise<void>;
  removeDraft(date: string): Promise<void>;
  persistent: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  recordMode: 'photo',
  commuteTransports: [],
  weekdayTimes: Object.fromEntries(
    WEEKDAY_PRESET.map((p) => [p.type, { start: p.start, end: p.end }]),
  ) as Settings['weekdayTimes'],
};

// 저장된 설정에 새로 생긴 항목이 없으면 기본값으로 채운다
function withDefaults(s?: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    weekdayTimes: { ...DEFAULT_SETTINGS.weekdayTimes, ...(s?.weekdayTimes as Record<WeekdaySegment, { start: string; end: string }>) },
  };
}

const byRecent = (a: Place, b: Place) => (b.lastUsedAt ?? '').localeCompare(a.lastUsedAt ?? '');

function memoryStore(): Store {
  const logs = new Map<string, DailyLog>();
  let settings = DEFAULT_SETTINGS;
  const places = new Map<string, Place>();
  const drafts = new Map<string, OutfitDraft>();
  return {
    persistent: false,
    async getPlaces() { return [...places.values()].sort(byRecent); },
    async putPlace(p) { places.set(p.key, p); },
    async removePlace(k) { places.delete(k); },
    async getDraft(d) { return drafts.get(d); },
    async putDraft(d) { drafts.set(d.date, d); },
    async removeDraft(d) { drafts.delete(d); },
    async getLog(d) { return logs.get(d); },
    async putLog(l) { logs.set(l.date, l); },
    async allLogs() { return [...logs.values()].sort((a, b) => b.date.localeCompare(a.date)); },
    async getSettings() { return settings; },
    async putSettings(s) { settings = s; },
  };
}

function dexieStore(db: OutfitDB): Store {
  return {
    persistent: true,
    getLog: (d) => db.logs.get(d),
    putLog: async (l) => { await db.logs.put(l); },
    allLogs: async () => (await db.logs.toArray()).sort((a, b) => b.date.localeCompare(a.date)),
    getSettings: async () => withDefaults(await db.settings.get('me')),
    getPlaces: async () => (await db.places.toArray()).sort(byRecent),
    putPlace: async (p) => { await db.places.put(p); },
    removePlace: async (k) => { await db.places.delete(k); },
    getDraft: (d) => db.drafts.get(d),
    putDraft: async (d) => { await db.drafts.put(d); },
    removeDraft: async (d) => { await db.drafts.delete(d); },
    putSettings: async (s) => { await db.settings.put({ ...s, id: 'me' }); },
  };
}

let storePromise: Promise<Store> | null = null;

export function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = (async () => {
      try {
        const db = new OutfitDB();
        await db.open();
        // 브라우저가 공간 부족 시 데이터를 지우지 않도록 영구 저장 요청
        try { await navigator.storage?.persist?.(); } catch { /* 무시 */ }
        return dexieStore(db);
      } catch {
        return memoryStore();
      }
    })();
  }
  return storePromise;
}
