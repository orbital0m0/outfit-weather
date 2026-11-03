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
    segments: rest ? [] : WEEKDAY_PRESET.map((p) => segmentFromPreset(p, places, settings)),
    savedAt: '',
  };
}

export function withWeekdayPreset(log: DailyLog, places: Place[], settings: Settings): DailyLog {
  return { ...log, status: 'empty', preset: 'weekday', segments: WEEKDAY_PRESET.map((p) => segmentFromPreset(p, places, settings)) };
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

export function validate(log: DailyLog): ValidationResult {
  const r: ValidationResult = { ok: true, segments: {} };
  if (log.status === 'home') return r;
  if (!log.photo && !log.outfitMemo?.trim() && log.outfitTags.length === 0) {
    r.ok = false;
    r.outfit = '사진, 옷차림 메모, 옷 태그 중 하나는 남겨주세요.';
  }
  if (log.segments.length === 0) r.ok = false;
  for (const s of log.segments) {
    if (s.comfort == null) {
      r.ok = false;
      r.segments[s.id] = '어땠는지 하나 골라주세요.';
    } else if (s.start >= s.end) {
      r.ok = false;
      r.segments[s.id] = '끝나는 시간이 시작보다 늦어야 해요.';
    }
  }
  return r;
}
