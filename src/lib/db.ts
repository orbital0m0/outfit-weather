import Dexie, { type Table } from 'dexie';
import type { DailyLog, Settings } from '../types';

// 기기 안 저장소(IndexedDB). 브라우저가 막으면(사생활 보호 모드, 미리보기 등)
// 메모리 저장으로 대체해서 앱은 계속 동작하게 한다.

class OutfitDB extends Dexie {
  logs!: Table<DailyLog, string>;
  settings!: Table<Settings & { id: 'me' }, string>;
  constructor() {
    super('outfit-weather');
    this.version(1).stores({ logs: 'date', settings: 'id' });
  }
}

interface Store {
  getLog(date: string): Promise<DailyLog | undefined>;
  putLog(log: DailyLog): Promise<void>;
  allLogs(): Promise<DailyLog[]>;
  getSettings(): Promise<Settings>;
  putSettings(s: Settings): Promise<void>;
  persistent: boolean;
}

export const DEFAULT_SETTINGS: Settings = { recordMode: 'photo', commuteTransports: [] };

function memoryStore(): Store {
  const logs = new Map<string, DailyLog>();
  let settings = DEFAULT_SETTINGS;
  return {
    persistent: false,
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
    getSettings: async () => ({ ...DEFAULT_SETTINGS, ...(await db.settings.get('me')) }),
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
