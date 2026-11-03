// 비슷한 날 찾기와 조언 문구. 명세서 "추천 로직" 섹션을 그대로 옮겼다.
import type { Comfort, DailyLog, HourlyWeather, Segment, SegmentType } from '../types';
import { COMFORT } from './constants';
import { fromYMD } from './dates';
import { segmentWeather, type SegmentWeather } from './weather';

// 같은 종류 구간끼리만 비교한다. 휴일 외출과 추가 구간은 하나로 본다.
export const groupOf = (t: SegmentType) => (t === 'custom' ? 'outing' : t);

// 거리 점수: |Δ최저 체감| + |Δ최고 체감| + 0.3|Δ일교차| + 0.4|Δ바람| + 2·[강수 여부 다름]
export function distance(a: SegmentWeather, b: SegmentWeather): number {
  return (
    Math.abs(a.feelsMin - b.feelsMin) +
    Math.abs(a.feelsMax - b.feelsMax) +
    0.3 * Math.abs(a.feelsMax - a.feelsMin - (b.feelsMax - b.feelsMin)) +
    0.4 * Math.abs(a.wind - b.wind) +
    (a.rain !== b.rain ? 2 : 0)
  );
}

export interface TodaySegment {
  seg: Segment;
  wx: SegmentWeather;
}

export interface SegmentMatch {
  today: TodaySegment;
  past: Segment;
  pastWx: SegmentWeather;
  d: number;
}

export interface DayMatch {
  log: DailyLog;
  score: number;
  matches: SegmentMatch[];
  feelsDelta: number; // 오늘 - 그날 (야외 구간 평균), 음수면 오늘이 더 추움
  advice: string;
}

const daysBetween = (a: string, b: string) => Math.round((fromYMD(a).getTime() - fromYMD(b).getTime()) / 864e5);

export function findSimilarDays(today: string, todaySegs: TodaySegment[], logs: DailyLog[], limit = 3): DayMatch[] {
  const past = logs.filter((l) => l.status === 'logged' && l.date < today && l.segments.length);
  // 기록이 적은 초기에는 범위를 넓힌다
  const maxFeelsGap = past.length < 5 ? 5 : 3;
  const out: DayMatch[] = [];

  for (const log of past) {
    const matches: SegmentMatch[] = [];
    for (const t of todaySegs) {
      const p = log.segments.find((s) => groupOf(s.type) === groupOf(t.seg.type));
      if (!p) continue;
      const pw = segmentWeather(log.hourly[p.place.key] as HourlyWeather[] | undefined, p);
      if (!pw) continue;
      matches.push({ today: t, past: p, pastWx: pw, d: distance(t.wx, pw) });
    }
    if (!matches.length) continue;

    const outdoor = matches.filter((m) => m.past.setting !== 'indoor');
    const ref = outdoor.length ? outdoor : matches;
    const gap = Math.max(...ref.map((m) => Math.abs(m.today.wx.feelsLike - m.pastWx.feelsLike)));
    if (gap > maxFeelsGap) continue;

    // 실내 구간은 가중치를 낮추고, 최근 기록을 조금 더 앞에 둔다
    const wsum = matches.reduce((s, m) => s + (m.past.setting === 'indoor' ? 0.5 : 1), 0);
    const dsum = matches.reduce((s, m) => s + m.d * (m.past.setting === 'indoor' ? 0.5 : 1), 0);
    const coverage = matches.length / todaySegs.length; // 비교한 구간이 적으면 덜 믿는다
    const score = dsum / wsum + (1 - coverage) * 2 + daysBetween(today, log.date) * 0.01;
    const feelsDelta = ref.reduce((s, m) => s + (m.today.wx.feelsLike - m.pastWx.feelsLike), 0) / ref.length;

    out.push({ log, score, matches, feelsDelta, advice: adviceFor(matches) });
  }
  return out.sort((a, b) => a.score - b.score).slice(0, limit);
}

// 조언: 야외 구간을 우선 보고, "차 안에서" 더웠던 건 보온을 줄이지 않는다
export function adviceFor(matches: SegmentMatch[]): string {
  const outdoor = matches.filter((m) => m.past.setting !== 'indoor');
  const ref = outdoor.length ? outdoor : matches;
  const cold = ref.filter((m) => (m.past.comfort ?? 0) < 0);
  const hotOutside = ref.filter((m) => (m.past.comfort ?? 0) > 0 && m.past.discomfortAt !== 'inside');
  const hotInside = ref.filter((m) => (m.past.comfort ?? 0) > 0 && m.past.discomfortAt === 'inside');

  if (cold.length && (hotOutside.length || hotInside.length)) {
    return '구간마다 달랐어요. 입고 벗기 쉬운 레이어드가 좋아요.';
  }
  if (cold.length) {
    const where = cold.map((m) => m.past.label).join('·');
    return `${where}에 추웠어요. 그때보다 한 겹 더 입어보세요.`;
  }
  if (hotOutside.length) {
    const where = hotOutside.map((m) => m.past.label).join('·');
    return `${where}에 더웠어요. 한 단계 가볍게 입어보세요.`;
  }
  if (hotInside.length) {
    return '밖은 괜찮았고 차 안에서 더웠어요. 벗기 쉬운 아우터가 좋아요.';
  }
  return '그날 딱 좋았어요. 그대로 입어도 돼요.';
}

export const comfortInfo = (c?: Comfort) => COMFORT.find((x) => x.value === c);

export function deltaText(delta: number): string | null {
  const d = Math.round(delta);
  if (Math.abs(delta) < 1.5) return null;
  return d < 0 ? `오늘이 그때보다 ${-d}° 더 추워요` : `오늘이 그때보다 ${d}° 더 따뜻해요`;
}
