// 날짜 유틸과 휴일 판정.
// 공휴일은 실제 앱에서 공공데이터포털 특일 정보 API로 연 1회 받아 캐싱한다.
// 아래 목록은 미리보기용 2026년 예시 데이터다.

const HOLIDAYS_2026 = new Set([
  '2026-01-01',
  '2026-02-16', '2026-02-17', '2026-02-18', // 설날
  '2026-03-01', '2026-03-02', // 삼일절, 대체공휴일
  '2026-05-05',
  '2026-05-24', '2026-05-25', // 부처님오신날, 대체공휴일
  '2026-06-03', // 전국동시지방선거
  '2026-06-06',
  '2026-08-15', '2026-08-17', // 광복절, 대체공휴일
  '2026-09-24', '2026-09-25', '2026-09-26', // 추석
  '2026-10-03', '2026-10-05', // 개천절, 대체공휴일
  '2026-10-09',
  '2026-12-25',
]);

export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(ymd: string, n: number): string {
  const d = fromYMD(ymd);
  d.setDate(d.getDate() + n);
  return toYMD(d);
}

export function isRestDay(ymd: string): boolean {
  const day = fromYMD(ymd).getDay();
  return day === 0 || day === 6 || HOLIDAYS_2026.has(ymd);
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDate(ymd: string): string {
  const d = fromYMD(ymd);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY[d.getDay()]})`;
}

export function hourOf(hhmm: string): number {
  return Number(hhmm.split(':')[0]);
}
