// 기록이 적을 때 보여주는 일반 기온별 옷차림 가이드 (체감온도 기준, 대략적인 통념)
const GUIDE: { min: number; text: string }[] = [
  { min: 28, text: '민소매, 반팔, 반바지, 린넨' },
  { min: 23, text: '반팔, 얇은 셔츠, 면바지' },
  { min: 20, text: '긴팔 티, 얇은 가디건, 면바지·청바지' },
  { min: 17, text: '얇은 니트, 맨투맨, 가디건, 청바지' },
  { min: 12, text: '자켓, 가디건, 니트, 청바지' },
  { min: 9, text: '트렌치코트, 자켓, 니트' },
  { min: 5, text: '코트, 경량패딩, 기모 옷, 니트' },
  { min: -100, text: '패딩, 두꺼운 코트, 목도리, 장갑' },
];

export function guideFor(feelsLike: number): string {
  return (GUIDE.find((g) => feelsLike >= g.min) ?? GUIDE[GUIDE.length - 1]).text;
}
