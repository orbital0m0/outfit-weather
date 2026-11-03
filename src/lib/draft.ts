import type { DailyLog, OutfitDraft, OutfitDraftItem } from '../types';
import { categoryOf } from './constants';
import { uid } from './record';

// 메모 "베이지 트렌치 + 얇은 니트, 슬랙스" → ['베이지 트렌치', '얇은 니트', '슬랙스']
export function splitMemo(memo?: string): string[] {
  if (!memo?.trim()) return [];
  const parts = memo.split(/[+,/\n]|그리고/).map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [memo.trim()];
}

// 선택한 카드(과거 기록)의 옷 목록으로 오늘 체크리스트를 만든다. 처음엔 모두 체크 안 된 상태.
export function draftFromLog(log: DailyLog, today: string): OutfitDraft {
  const labels = log.outfitTags.length ? log.outfitTags : splitMemo(log.outfitMemo);
  const items: OutfitDraftItem[] = labels.map((label) => ({
    id: uid('i'),
    label,
    category: categoryOf(label),
    state: 'skipped',
  }));
  return { date: today, sourceLogId: log.date, items };
}

// 저녁 기록에 넣을 옷 목록: 입음 + 바꾼 옷 + 추가한 옷
export function tagsFromDraft(d: OutfitDraft): string[] {
  const out: string[] = [];
  for (const it of d.items) {
    if (it.state === 'worn' || it.state === 'added') out.push(it.label);
    else if (it.state === 'replaced' && it.replacedBy) out.push(it.replacedBy);
  }
  return [...new Set(out)];
}

// 아우터인데 체크도, 바꾸기도 안 한 항목 (저녁에 한 번 확인)
export const pendingOuters = (d: OutfitDraft) => d.items.filter((it) => it.category === 'outer' && it.state === 'skipped');
