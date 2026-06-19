import type { ZiweiChart } from '@/lib/ziwei/types';

function sorted(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

function getStableChartPayload(chart: ZiweiChart) {
  return {
    birthInfo: {
      year: chart.birthInfo.year,
      month: chart.birthInfo.month,
      day: chart.birthInfo.day,
      hour: chart.birthInfo.hour,
      gender: chart.birthInfo.gender,
      longitude: chart.birthInfo.longitude ?? null,
    },
    lunarInfo: chart.lunarInfo,
    core: {
      mingGongBranch: chart.mingGongBranch,
      shenGongBranch: chart.shenGongBranch,
      ziweiPos: chart.ziweiPos,
      wuxingJu: chart.wuxingJu,
    },
    palaces: [...chart.palaces]
      .sort((a, b) => a.branch - b.branch)
      .map(palace => ({
        name: palace.name,
        branch: palace.branch,
        stem: palace.stem,
        majorStars: sorted(palace.stars.filter(star => star.type === 'major').map(star => star.name)),
        luckyStars: sorted(palace.stars.filter(star => star.type === 'lucky').map(star => star.name)),
        shaStars: sorted(palace.stars.filter(star => star.type === 'sha').map(star => star.name)),
        sihua: sorted([
          ...palace.stars.filter(star => star.siHua).map(star => `${star.name}:${star.siHua}`),
          ...(palace.selfSihua ?? []).map(item => `${item.starName}:自化${item.siHua}`),
        ]),
      })),
  };
}

export async function createChartHash(chart: ZiweiChart): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(getStableChartPayload(chart)));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function isValidChartHash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}
