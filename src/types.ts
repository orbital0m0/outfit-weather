// 기능 명세서(MVP)의 데이터 모델을 그대로 옮긴 타입.
// 명세와 다른 점: 사진은 URL 대신 Blob으로 기기에 저장한다(photo).

export type PlaceKey = string; // 'home' | 'work' | 저장 장소 키 (예: 'p_8f2a')
export type DayStatus = 'logged' | 'home' | 'empty';
export type Comfort = -2 | -1 | 0 | 1 | 2; // 많이 추움 ~ 많이 더움
export type Category = 'top' | 'bottom' | 'outer' | 'accessory';
export type SegmentType = 'commute' | 'lunch' | 'day' | 'evening' | 'outing' | 'custom';
export type Transport = 'walk' | 'subway' | 'bus' | 'car';
export type Setting = 'outdoor' | 'indoor' | 'mixed';
export type DiscomfortAt = 'outside' | 'inside' | 'both'; // 어디서 덥거나 추웠는지

export interface Place {
  key: PlaceKey;
  kind: 'home' | 'work' | 'saved';
  label: string; // '집', '회사', '성수동'
  regionName: string; // 동 단위까지만
  lat: number; // 동 중심 위경도 (Open-Meteo 조회용)
  lon: number;
  lastUsedAt?: string; // 최근 장소 칩 정렬용
}

export interface HourlyWeather {
  hour: number; // 0~23
  temp: number;
  feelsLike: number; // Open-Meteo apparent_temperature
  wind: number; // m/s
  humidity: number;
  precip: number; // mm
}

export interface DayWeather {
  hours: HourlyWeather[];
  source: 'open-meteo' | 'sample';
}

export interface WeatherCorrection {
  temp?: number;
  feelsLike?: number;
  screenshot?: Blob; // 참고용 캡처, OCR 없음
}

export interface Segment {
  id: string;
  type: SegmentType;
  label: string; // '출근길'
  start: string; // '08:10'
  end: string; // '08:50'
  place: Place; // 기록 당시 장소 스냅샷
  setting: Setting;
  removedTags: string[]; // 이 구간에 벗고 있던 옷
  comfort?: Comfort; // 저장 시 필수
  transports?: Transport[]; // 여러 개 선택 가능 (도보 + 지하철 등)
  discomfortAt?: DiscomfortAt; // 덥거나 추웠을 때만, 차를 탄 구간에서만 물어봄
  correction?: WeatherCorrection; // 있으면 매칭에 우선 사용
}

export interface DailyLog {
  date: string; // '2026-11-03' (기본 키)
  status: DayStatus;
  dayType: 'weekday' | 'restday';
  preset: 'weekday' | 'outing' | 'remote';
  photo?: Blob; // 하루 1장 전신 사진 (선택)
  outfitMemo?: string; // 사진 대신 옷차림 메모 (선택)
  outfitTags: string[]; // 사진·메모·태그 중 하나 이상 필수
  sourceLogId?: string; // 아침에 참고한 카드(과거 기록)
  hourly: Record<PlaceKey, HourlyWeather[]>; // 그날 쓴 장소만큼
  weatherSource: 'open-meteo' | 'sample';
  segments: Segment[];
  memo?: string; // 그날 전체 메모
  savedAt: string;
}

export interface Settings {
  recordMode: 'photo' | 'memo'; // 기본 기록 방식
  commuteTransports: Transport[]; // 평소 출퇴근 경로 → 출근길·밤 구간 기본값
}
