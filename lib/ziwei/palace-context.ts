import type { Palace, ZiweiChart } from './types';
import { BRANCHES, STEMS } from './constants';
import { detectPatterns, type Pattern } from './patterns';

export interface PalaceSnapshot {
  name: string;
  branch: number;
  branchName: string;
  stem: number;
  stemName: string;
  ganzhi: string;
  stars: Palace['stars'];
  majorStars: string[];
  luckyStars: string[];
  shaStars: string[];
  sihuaStars: { starName: string; siHua: string }[];
  selfSihua?: Palace['selfSihua'];
  isMingGong?: boolean;
  isShenGong?: boolean;
  isEmpty?: boolean;
  borrowedFromName?: string;
  borrowedStars?: string[];
  daXianAge?: [number, number];
}

export interface ChartSummary {
  birth: ZiweiChart['birthInfo'];
  lunar: ZiweiChart['lunarInfo'];
  mingGong: string;
  shenGong: string;
  wuxingJuName: string;
  currentAge: number;
  currentDaXian?: ZiweiChart['daXians'][number];
  mingPalaceStars: string[];
  detectedPatterns: Pattern[];
}

export interface PalaceContext {
  palaceName: string;
  targetPalace: PalaceSnapshot;
  oppositePalace: PalaceSnapshot;
  trianglePalaces: PalaceSnapshot[];
  relevantPalaces: PalaceSnapshot[];
  chartSummary: ChartSummary;
}

function normalizePalaceName(name: string): string {
  const trimmed = name.trim();
  return trimmed.endsWith('宫') ? trimmed.slice(0, -1) : trimmed;
}

function getPalaceByBranch(chart: ZiweiChart, branch: number): Palace {
  const normalized = ((branch % 12) + 12) % 12;
  const palace = chart.palaces.find(p => p.branch === normalized);
  if (!palace) throw new Error(`未找到地支索引 ${normalized} 对应的宫位`);
  return palace;
}

function getPalaceByName(chart: ZiweiChart, palaceName: string): Palace {
  const targetName = normalizePalaceName(palaceName);
  const palace = chart.palaces.find(p => normalizePalaceName(p.name) === targetName);
  if (!palace) throw new Error(`未找到宫位：${palaceName}`);
  return palace;
}

export function serializePalace(palace: Palace): PalaceSnapshot {
  const majorStars = palace.stars.filter(s => s.type === 'major').map(s => s.name);
  const luckyStars = palace.stars.filter(s => s.type === 'lucky').map(s => s.name);
  const shaStars = palace.stars.filter(s => s.type === 'sha').map(s => s.name);
  const sihuaStars = palace.stars
    .filter(s => Boolean(s.siHua))
    .map(s => ({ starName: s.name, siHua: s.siHua as string }));

  return {
    name: palace.name,
    branch: palace.branch,
    branchName: BRANCHES[palace.branch] ?? '',
    stem: palace.stem,
    stemName: STEMS[palace.stem] ?? '',
    ganzhi: `${STEMS[palace.stem] ?? ''}${BRANCHES[palace.branch] ?? ''}`,
    stars: palace.stars,
    majorStars,
    luckyStars,
    shaStars,
    sihuaStars,
    selfSihua: palace.selfSihua,
    isMingGong: palace.isMingGong,
    isShenGong: palace.isShenGong,
    isEmpty: palace.isEmpty,
    borrowedFromName: palace.borrowedFromName,
    borrowedStars: palace.borrowedStars,
    daXianAge: palace.daXianAge,
  };
}

export function getPalaceContext(chart: ZiweiChart, palaceName: string): PalaceContext {
  const target = getPalaceByName(chart, palaceName);
  const opposite = getPalaceByBranch(chart, target.branch + 6);
  const triangle = [
    getPalaceByBranch(chart, target.branch + 4),
    getPalaceByBranch(chart, target.branch + 8),
  ];
  const mingPalace = getPalaceByBranch(chart, chart.mingGongBranch);
  const shenPalace = getPalaceByBranch(chart, chart.shenGongBranch);
  const detectedPatterns = detectPatterns(chart);

  return {
    palaceName: target.name,
    targetPalace: serializePalace(target),
    oppositePalace: serializePalace(opposite),
    trianglePalaces: triangle.map(serializePalace),
    relevantPalaces: [target, opposite, ...triangle].map(serializePalace),
    chartSummary: {
      birth: chart.birthInfo,
      lunar: chart.lunarInfo,
      mingGong: mingPalace.name,
      shenGong: shenPalace.name,
      wuxingJuName: chart.wuxingJuName,
      currentAge: chart.currentAge,
      currentDaXian: chart.daXians[chart.currentDaXianIndex],
      mingPalaceStars: mingPalace.stars.filter(s => s.type === 'major').map(s => s.name),
      detectedPatterns,
    },
  };
}
