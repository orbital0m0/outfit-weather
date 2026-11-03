# 그날의 옷 (가칭)

그날 외출 구간별 날씨와 옷차림, 체감(더움·추움)을 기록해 두고,
비슷한 날씨가 오면 그때 무엇을 입었고 어땠는지 다시 보여주는 앱입니다.

- 1차 목표: 개인용으로 안드로이드(Chrome PWA)에서 테스트
- 기능 명세: claude.ai의 "날씨 옷차림 기록 앱 — 기능 명세서 (MVP)" 문서 참고

## 기술 스택

| 영역 | 선택 |
| --- | --- |
| 프론트 | React + TypeScript + Vite, PWA (vite-plugin-pwa) |
| 기기 저장 | IndexedDB (Dexie.js) — 막히면 메모리 저장으로 대체 |
| 날씨 | Open-Meteo (앱에서 직접 호출, API 키 없음) — 실패 시 샘플 날씨 |
| 알림 (예정) | Vercel 크론(하루 1회) + 서버리스 함수 + web-push, Upstash Redis |

## 실행

```bash
npm install
npm run dev            # 개발 서버
npm run build          # 배포용 PWA 빌드 → dist/
npm run build:preview  # 단일 HTML 미리보기 빌드 → dist-preview/
```

## Vercel 배포

1. Vercel에서 **Add New → Project → Import Git Repository**로 이 저장소 선택
2. Framework Preset: **Vite** (자동 인식), Build Command `npm run build`, Output `dist`
3. 배포된 주소를 안드로이드 Chrome에서 열고 **홈 화면에 추가**

## 폴더 구조

```
src/
  types.ts               명세의 데이터 모델
  lib/
    constants.ts         체감 단계, 옷 태그, 구간 프리셋, 예시 장소
    dates.ts             날짜 유틸, 주말·공휴일 판정 (2026 예시 목록)
    weather.ts           Open-Meteo 조회, 샘플 날씨, 구간 날씨 계산
    db.ts                IndexedDB 저장소
    record.ts            기록 초안 생성, 검증
    photo.ts             사진 리사이즈 (긴 변 1080px)
    dongs.ts             동 이름 검색 (src/data/dongs.json)
  components/
    RecordScreen.tsx     기록하기 화면
    OutfitSection.tsx    사진 / 메모 / 옷 태그
    SegmentCard.tsx      구간 카드 (체감, 외투 벗음, 이동수단, 보정)
    ComfortPicker.tsx    체감 5단계
    LogList.tsx          기록 목록
    Onboarding.tsx       처음 설정 (집·회사 동네, 출퇴근 경로, 구간 시간)
    SettingsScreen.tsx   설정
    DongSearch.tsx       동 이름 자동완성
```

## 다음 작업

- [x] 온보딩: 집·회사 동네 등록 (행정동 중심 좌표 내장, 동 이름 자동완성)
- [x] 설정 화면 (동네, 출퇴근 경로, 구간 시간, 기록 방식)
- [ ] 홈: 오늘 예보 + 비슷한 날 카드 + 옷차림 체크리스트
- [ ] 캘린더
- [ ] 공휴일: 공공데이터포털 특일 정보 API
- [ ] 저녁 알림 (웹 푸시)

## 데이터 출처

- 날씨: [Open-Meteo](https://open-meteo.com) (비상업적 무료 이용)
- 동 위치(`src/data/dongs.json`): 행정동 경계의 중심점을 계산한 값입니다.
  본 데이터는 통계청 통계지리정보서비스(SGIS, https://sgis.kostat.go.kr)에서
  공공누리 제1유형으로 개방한 행정동 경계를 가공한 것이며(가공: vuski/admdongkor,
  https://github.com/vuski/admdongkor), CC BY 4.0으로 배포됩니다. (2026-10-01 기준 3,559개 동)
