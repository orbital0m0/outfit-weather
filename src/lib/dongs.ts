// 전국 행정동 중심 좌표 목록으로 동 이름을 검색한다. (약 3,500개, 처음 검색할 때 불러옴)
// 데이터 출처: 통계청 SGIS 행정동 경계(공공누리 제1유형), 가공 vuski/admdongkor (CC BY 4.0)
// src/data/dongs.json 형식: [동 이름, 시·도 시·군·구, 위도, 경도][]

export interface Dong {
  name: string; // '서교동'
  parent: string; // '서울특별시 마포구'
  lat: number;
  lon: number;
}

let cache: Dong[] | null = null;

export async function loadDongs(): Promise<Dong[]> {
  if (cache) return cache;
  const mod = await import('../data/dongs.json');
  const rows = mod.default as [string, string, number, number][];
  cache = rows.map(([name, parent, lat, lon]) => ({ name, parent, lat, lon }));
  return cache;
}

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();

// "서교", "마포 서교", "수원 화서" 처럼 띄어쓴 여러 단어를 모두 포함하는 동을 찾는다.
export function searchDongs(all: Dong[], query: string, limit = 20): Dong[] {
  const tokens = query.trim().split(/\s+/).filter(Boolean).map(norm);
  if (!tokens.length) return [];
  const scored: { d: Dong; score: number }[] = [];
  for (const d of all) {
    const name = norm(d.name);
    const full = norm(`${d.parent}${d.name}`);
    if (!tokens.every((t) => full.includes(t))) continue;
    const last = tokens[tokens.length - 1];
    // 동 이름이 검색어로 시작하면 위로
    const score = name.startsWith(last) ? 0 : name.includes(last) ? 1 : 2;
    scored.push({ d, score });
  }
  scored.sort((a, b) => a.score - b.score || a.d.name.length - b.d.name.length);
  return scored.slice(0, limit).map((x) => x.d);
}

export const DONG_ATTRIBUTION =
  '동 위치: 통계청 SGIS 행정동 경계(공공누리 제1유형)를 vuski/admdongkor가 가공한 데이터 (CC BY 4.0)';
