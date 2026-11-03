import type { Category, Comfort, DiscomfortAt, SegmentType, Setting, Transport } from '../types';

export const COMFORT: { value: Comfort; label: string; tone: 'cold' | 'ok' | 'hot' }[] = [
  { value: -2, label: '많이 추움', tone: 'cold' },
  { value: -1, label: '조금 추움', tone: 'cold' },
  { value: 0, label: '딱 좋음', tone: 'ok' },
  { value: 1, label: '조금 더움', tone: 'hot' },
  { value: 2, label: '많이 더움', tone: 'hot' },
];

export const TRANSPORT: { value: Transport; label: string }[] = [
  { value: 'walk', label: '도보' },
  { value: 'subway', label: '지하철' },
  { value: 'bus', label: '버스' },
  { value: 'car', label: '차' },
];

export const isVehicle = (t: Transport) => t !== 'walk';

// 아우터 태그 없이 "외투 벗음"만 표시할 때 removedTags에 들어가는 값
export const GENERIC_OUTER = '외투';

export const DISCOMFORT: { value: DiscomfortAt; label: string }[] = [
  { value: 'outside', label: '밖에서' },
  { value: 'inside', label: '차 안에서' },
  { value: 'both', label: '둘 다' },
];

export const CATEGORY_LABEL: Record<Category, string> = {
  top: '상의',
  bottom: '하의',
  outer: '아우터',
  accessory: '소품',
};

// 옷 태그 기본 목록 (사용자가 직접 추가할 수 있음)
export const DEFAULT_TAGS: Record<Category, string[]> = {
  top: ['반팔', '긴팔 티', '셔츠', '니트', '맨투맨', '후드'],
  bottom: ['반바지', '슬랙스', '청바지', '치마', '기모 바지'],
  outer: ['가디건', '자켓', '트렌치', '코트', '경량패딩', '패딩'],
  accessory: ['목도리', '장갑', '모자', '우산'],
};

export function categoryOf(tag: string): Category | undefined {
  return (Object.keys(DEFAULT_TAGS) as Category[]).find((c) => DEFAULT_TAGS[c].includes(tag));
}

export interface SegmentPreset {
  type: SegmentType;
  label: string;
  start: string;
  end: string;
  placeKey: string;
  setting: Setting;
  askTransport: boolean;
}

// 평일 기본 4구간 (설정에서 바꿀 수 있게 할 예정)
export const WEEKDAY_PRESET: SegmentPreset[] = [
  { type: 'commute', label: '출근길', start: '08:10', end: '08:50', placeKey: 'home', setting: 'outdoor', askTransport: true },
  { type: 'lunch', label: '점심', start: '12:00', end: '13:00', placeKey: 'work', setting: 'outdoor', askTransport: false },
  { type: 'day', label: '낮', start: '13:00', end: '18:00', placeKey: 'work', setting: 'indoor', askTransport: false },
  { type: 'evening', label: '밤', start: '19:00', end: '20:00', placeKey: 'home', setting: 'outdoor', askTransport: true },
];

export const OUTING_PRESET: SegmentPreset = {
  type: 'outing',
  label: '외출',
  start: '14:00',
  end: '16:00',
  placeKey: 'home',
  setting: 'outdoor',
  askTransport: true,
};
