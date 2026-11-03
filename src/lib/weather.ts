import type { DayWeather, HourlyWeather, Place, Segment } from '../types';
import { fromYMD, hourOf } from './dates';

// Open-Meteo Forecast API. 비상업적 무료 이용은 API 키가 필요 없다.
// 명세: 한국은 KMA 모델 사용 → 연동 시 models 파라미터 값을 확인해서 넣는다.
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const MODEL: string | undefined = undefined;

export async function fetchDayWeather(place: Place, ymd: string): Promise<DayWeather> {
  const params = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    hourly: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation',
    wind_speed_unit: 'ms',
    timezone: 'Asia/Seoul',
    start_date: ymd,
    end_date: ymd,
  });
  if (MODEL) params.set('models', MODEL);

  try {
    const res = await fetch(`${OPEN_METEO}?${params}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const h = json.hourly;
    const hours: HourlyWeather[] = (h.time as string[]).map((_, i) => ({
      hour: i,
      temp: h.temperature_2m[i],
      feelsLike: h.apparent_temperature[i],
      wind: h.wind_speed_10m[i],
      humidity: h.relative_humidity_2m[i],
      precip: h.precipitation[i],
    }));
    if (hours.length !== 24 || hours.some((x) => x.temp == null)) throw new Error('incomplete');
    return { hours, source: 'open-meteo' };
  } catch {
    // 미리보기 환경처럼 외부 호출이 막히면 샘플 날씨로 동작한다.
    return { hours: sampleDay(place, ymd), source: 'sample' };
  }
}

// 월별 평균 기온 근처에서 새벽 최저·오후 최고가 되는 하루 곡선 (서울 기준 대략값)
const MONTH_MEAN = [-2, 1, 6, 13, 18, 23, 26, 26, 22, 15, 8, 1];

function sampleDay(place: Place, ymd: string): HourlyWeather[] {
  const d = fromYMD(ymd);
  const seed = d.getDate() * 7 + Math.round(place.lat * 10);
  const jitter = ((seed % 7) - 3) * 0.6;
  const mean = MONTH_MEAN[d.getMonth()] + jitter;
  const amp = 4.5;
  return Array.from({ length: 24 }, (_, hour) => {
    const temp = mean + amp * Math.sin(((hour - 9) / 24) * 2 * Math.PI);
    const wind = 2 + ((seed + hour) % 4) * 0.7;
    const humidity = 55 + ((seed * 3 + hour) % 25);
    const feelsLike = temp - Math.max(0, wind - 1.5) * 0.8;
    return {
      hour,
      temp: round1(temp),
      feelsLike: round1(feelsLike),
      wind: round1(wind),
      humidity,
      precip: 0,
    };
  });
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export interface SegmentWeather {
  temp: number;
  feelsLike: number;
  feelsMin: number;
  wind: number;
  corrected: boolean;
}

// 구간 시작~종료 시각의 평균 기온, 평균·최저 체감온도. 보정 값이 있으면 그것을 우선한다.
export function segmentWeather(hours: HourlyWeather[] | undefined, seg: Segment): SegmentWeather | null {
  if (!hours?.length) return null;
  const from = hourOf(seg.start);
  const to = Math.max(from, hourOf(seg.end) - (seg.end.endsWith(':00') ? 1 : 0));
  const slice = hours.filter((h) => h.hour >= from && h.hour <= to);
  if (!slice.length) return null;
  const avg = (k: keyof HourlyWeather) => slice.reduce((s, h) => s + h[k], 0) / slice.length;
  const base = {
    temp: Math.round(avg('temp')),
    feelsLike: Math.round(avg('feelsLike')),
    feelsMin: Math.round(Math.min(...slice.map((h) => h.feelsLike))),
    wind: round1(avg('wind')),
  };
  const c = seg.correction;
  if (c && (c.temp != null || c.feelsLike != null)) {
    return {
      ...base,
      temp: c.temp ?? base.temp,
      feelsLike: c.feelsLike ?? base.feelsLike,
      feelsMin: c.feelsLike ?? base.feelsMin,
      corrected: true,
    };
  }
  return { ...base, corrected: false };
}
