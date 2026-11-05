import type { DailyLog, Place, Segment, Settings } from '../types';
import { OUTING_PRESET, WEEKDAY_PRESET, type SegmentPreset } from './constants';
import { isRestDay } from './dates';

let counter = 0;
export const uid = (p = 's') => `${p}_${Date.now().toString(36)}${(counter++).toString(36)}`;

export function segmentFromPreset(p: SegmentPreset, places: Place[], settings?: Settings): Segment {
  const place = places.find((x) => x.key === p.placeKey) ?? places[0];
  // 출근길·밤(퇴근길)은 평소 경로를 기본값으로 채운다
  const route = (p.type === 'commute' || p.type === 'evening') && settings?.commuteTransports.length
    ? [...settings.commuteTransports]
    : undefined;
  return {
    transports: route,
    id: uid(),
    type: p.type,
    label: p.label,
    start: p.start,
    end: p.end,
    place,
    setting: p.setting,
    removedTags: [],
  };
}

// 설정의 평일 구간 기본 시간을 반영한 프리셋
export function weekdayPresets(settings: Settings): SegmentPreset[] {
  return WEEKDAY_PRESET.map((p) => {
    const t = settings.weekdayTimes[p.type as keyof Settings['weekdayTimes']];
    return t ? { ...p, start: t.start, end: t.end } : p;
  });
}

// 온보딩 전에 예시 동네로 저장한 기록은, 다시 열면 등록한 집·회사로 바꾸고 날씨를 새로 받는다
export function migrateSamplePlaces(log: DailyLog, places: Place[]): DailyLog {
  let changed = false;
  const hourly = { ...log.hourly };
  const segments = log.segments.map((s) => {
    if (!s.place.regionName.includes('(예시)')) return s;
    const real = places.find((p) => p.kind === s.place.kind) ?? places[0];
    if (!real) return s;
    changed = true;
    delete hourly[s.place.key];
    return { ...s, place: real };
  });
  return changed ? { ...log, segments, hourly } : log;
}

export const askTransport = (s: Segment) =>
  s.type === 'commute' || s.type === 'evening' || s.type === 'outing' || s.type === 'custom';

// 날짜 유형에 맞는 새 기록 초안. 휴일은 자동으로 "집" 상태.
export function newDraft(date: string, places: Place[], settings: Settings): DailyLog {
  const rest = isRestDay(date);
  return {
    date,
    status: rest ? 'home' : 'empty',
    dayType: rest ? 'restday' : 'weekday',
    preset: rest ? 'outing' : 'weekday',
    outfitTags: [],
    hourly: {},
    weatherSource: 'sample',
    segments: rest ? [] : weekdayPresets(settings).map((p) => segmentFromPreset(p, places, settings)),
    savedAt: '',
  };
}

export function withWeekdayPreset(log: DailyLog, places: Place[], settings: Settings): DailyLog {
  return { ...log, status: 'empty', preset: 'weekday', segments: weekdayPresets(settings).map((p) => segmentFromPreset(p, places, settings)) };
}

export function withOuting(log: DailyLog, places: Place[]): DailyLog {
  return { ...log, status: 'empty', preset: 'outing', segments: [segmentFromPreset(OUTING_PRESET, places)] };
}

export function addOutingSegment(log: DailyLog, places: Place[]): DailyLog {
  const seg = segmentFromPreset({ ...OUTING_PRESET, label: '추가 외출', start: '20:00', end: '21:30' }, places);
  return { ...log, segments: [...log.segments, { ...seg, type: 'custom' }] };
}

export interface ValidationResult {
  ok: boolean;
  outfit?: string;
  segments: Record<string, string>;
}

export const hasOutfit = (log: DailyLog) => !!log.photo || !!log.outfitMemo?.trim() || log.outfitTags.length > 0;
export const doneSegments = (log: DailyLog) => log.segments.filter((s) => s.comfort != null);
export const leftSegments = (log: DailyLog) => log.segments.filter((s) => s.comfort == null);

// 채운 만큼 저장한다. 아무것도 입력하지 않았거나 시간이 거꾸로일 때만 막는다.
export function validate(log: DailyLog): ValidationResult {
  const r: ValidationResult = { ok: true, segments: {} };
  if (log.status === 'home') return r;
  for (const s of log.segments) {
    if (s.start >= s.end) {
      r.ok = false;
      r.segments[s.id] = '끝나는 시간이 시작보다 늦어야 해요.';
    }
  }
  if (!hasOutfit(log) && doneSegments(log).length === 0) {
    r.ok = false;
    r.outfit = '오늘 입은 옷이나 구간 체감 중 하나만 남겨도 저장돼요.';
  }
  return r;
}
