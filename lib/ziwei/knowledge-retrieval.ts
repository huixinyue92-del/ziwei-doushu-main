import { ALL_STARS, STAR_BRIEF_SEO } from '@/lib/seo/knowledge';
import { searchClassics, type SearchHit } from '@/lib/classics';
import { TIANJI_MODULES } from '@/lib/nihai';
import { STAR_DESCRIPTIONS, SI_HUA_TABLE } from './constants';
import { detectPatterns, type Pattern } from './patterns';
import { getPalaceContext, type PalaceContext } from './palace-context';
import type { ZiweiChart } from './types';

export interface ZiweiKnowledgeInput {
  chart: ZiweiChart;
  palaceName: string;
  context?: PalaceContext;
}

export interface KnowledgeEntry {
  source: string;
  title: string;
  content: string;
  tags: string[];
}

export interface RetrievedZiweiKnowledge {
  tianjiRules: KnowledgeEntry[];
  starExplanations: KnowledgeEntry[];
  sihuaExplanations: KnowledgeEntry[];
  patternExplanations: KnowledgeEntry[];
  classicTexts: KnowledgeEntry[];
  queryTerms: string[];
}

const SIHUA_MEANINGS: Record<string, string> = {
  禄: '化禄偏向资源、财禄、享受、顺畅与可得之物；分析时需结合化入星曜与落宫，不可单独定吉。',
  权: '化权偏向掌控、执行、权责、竞争与推动力；分析时需观察是否过刚、是否有煞忌同会。',
  科: '化科偏向名声、文书、学习、贵人与缓和力；分析时需结合具体星曜的表达方式。',
  忌: '化忌偏向阻滞、牵挂、欠缺、执着与需要修正之处；分析时只能提示压力倾向，不可作绝对凶断。',
};

function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function normalizePalaceName(name: string): string {
  return name.endsWith('宫') ? name.slice(0, -1) : name;
}

function getContextTerms(context: PalaceContext): string[] {
  const palaceTerms = [
    context.targetPalace.name,
    `${context.targetPalace.name}宫`,
    normalizePalaceName(context.targetPalace.name),
    context.oppositePalace.name,
    ...context.trianglePalaces.map(p => p.name),
  ];
  const starTerms = context.relevantPalaces.flatMap(p => [
    ...p.majorStars,
    ...p.luckyStars,
    ...p.shaStars,
    ...(p.borrowedStars ?? []),
  ]);
  const sihuaTerms = context.relevantPalaces.flatMap(p =>
    p.sihuaStars.map(s => `${s.starName}化${s.siHua}`)
  );
  const patternTerms = context.chartSummary.detectedPatterns
    .filter(pattern => pattern.palaces.some(name =>
      context.relevantPalaces.some(p => normalizePalaceName(p.name) === normalizePalaceName(name))
    ))
    .map(pattern => pattern.name);

  return unique([
    ...palaceTerms,
    ...starTerms,
    ...sihuaTerms,
    ...patternTerms,
    '三方四正',
    '天纪',
  ].filter(Boolean), String).slice(0, 40);
}

function retrieveTianjiRules(terms: string[]): KnowledgeEntry[] {
  const ziweiModule = TIANJI_MODULES.find(m => m.slug === 'ziwei' || m.name.includes('紫微'));
  if (!ziweiModule) return [];

  const entries: KnowledgeEntry[] = [
    {
      source: '倪海厦天纪资料库',
      title: ziweiModule.name,
      content: [
        ziweiModule.description,
        ...ziweiModule.details,
      ].join('\n'),
      tags: ziweiModule.keywords,
    },
  ];

  for (const chapter of ziweiModule.chapters ?? []) {
    const haystack = [
      chapter.title,
      chapter.subtitle,
      chapter.description,
      ...(chapter.keyPoints ?? []),
      ...(chapter.quotes ?? []),
    ].join('\n');
    if (!terms.some(term => haystack.includes(term))) continue;
    entries.push({
      source: '倪海厦天纪资料库',
      title: chapter.title,
      content: [
        chapter.subtitle,
        chapter.description,
        ...(chapter.keyPoints ?? []).map(point => `- ${point}`),
        ...(chapter.quotes ?? []).map(quote => `引用：${quote}`),
      ].filter(Boolean).join('\n'),
      tags: ['天纪', '紫微斗数', ...terms.filter(term => haystack.includes(term)).slice(0, 6)],
    });
  }

  return entries.slice(0, 6);
}

function retrieveStarExplanations(context: PalaceContext): KnowledgeEntry[] {
  const starNames = unique(
    context.relevantPalaces.flatMap(p => [...p.majorStars, ...(p.borrowedStars ?? [])]),
    String,
  ).filter(name => ALL_STARS.includes(name));

  return starNames.map(starName => {
    const desc = STAR_DESCRIPTIONS[starName];
    return {
      source: '项目星曜数据',
      title: `${starName}星性`,
      content: [
        STAR_BRIEF_SEO[starName],
        desc ? `关键词：${desc.keywords}；性质：${desc.nature}；五行：${desc.element}` : '',
      ].filter(Boolean).join('\n'),
      tags: [starName, '星曜'],
    };
  });
}

function retrieveSihuaExplanations(context: PalaceContext): KnowledgeEntry[] {
  const nativeStem = context.chartSummary.lunar.yearStem;
  const nativeSihua = SI_HUA_TABLE[nativeStem] ?? ['', '', '', ''];
  const nativeEntries = ['禄', '权', '科', '忌'].map((name, index) => ({
    siHua: name,
    starName: nativeSihua[index],
  })).filter(item => Boolean(item.starName));

  const palaceEntries = context.relevantPalaces.flatMap(p =>
    p.sihuaStars.map(s => ({ ...s, palaceName: p.name }))
  );

  return unique([...nativeEntries, ...palaceEntries], item => `${item.starName}-${item.siHua}`)
    .map(item => ({
      source: '项目四化系统',
      title: `${item.starName}化${item.siHua}`,
      content: `${item.starName}在本盘触发化${item.siHua}。${SIHUA_MEANINGS[item.siHua] ?? '需结合星曜、落宫与三方四正综合观察。'}`,
      tags: [item.starName, `化${item.siHua}`, '四化'],
    }));
}

function retrievePatternExplanations(chart: ZiweiChart, context: PalaceContext): KnowledgeEntry[] {
  const relevantNames = new Set(context.relevantPalaces.flatMap(p => [p.name, `${p.name}宫`, normalizePalaceName(p.name)]));
  const patterns = detectPatterns(chart);
  const relevant = patterns.filter(pattern =>
    pattern.palaces.some(name => relevantNames.has(name) || relevantNames.has(normalizePalaceName(name)))
  );
  const selected = relevant.length > 0 ? relevant : patterns.slice(0, 5);

  return selected.slice(0, 8).map(pattern => ({
    source: 'lib/ziwei/patterns.ts',
    title: pattern.name,
    content: [
      pattern.description,
      pattern.source ? `出处：${pattern.source}` : '',
      pattern.conditions?.required?.length ? `成立条件：${pattern.conditions.required.join('；')}` : '',
      pattern.conditions?.bonus?.length ? `加分项：${pattern.conditions.bonus.join('；')}` : '',
      pattern.conditions?.breaking?.length ? `破格提醒：${pattern.conditions.breaking.join('；')}` : '',
    ].filter(Boolean).join('\n'),
    tags: [pattern.level, ...pattern.palaces],
  }));
}

function classicHitToEntry(hit: SearchHit, tags: string[]): KnowledgeEntry {
  return {
    source: `${hit.bookTitle} / ${hit.chapterTitle}`,
    title: hit.paragraphId,
    content: hit.text,
    tags,
  };
}

function retrieveClassicTexts(terms: string[]): KnowledgeEntry[] {
  const hits: KnowledgeEntry[] = [];
  for (const term of terms.filter(t => t.length >= 2).slice(0, 16)) {
    hits.push(...searchClassics(term, 3).map(hit => classicHitToEntry(hit, [term, '古籍'])));
  }
  return unique(hits, hit => `${hit.source}-${hit.title}`).slice(0, 10);
}

export function retrieveZiweiKnowledge(input: ZiweiKnowledgeInput): RetrievedZiweiKnowledge {
  const context = input.context ?? getPalaceContext(input.chart, input.palaceName);
  const queryTerms = getContextTerms(context);

  return {
    tianjiRules: retrieveTianjiRules(queryTerms),
    starExplanations: retrieveStarExplanations(context),
    sihuaExplanations: retrieveSihuaExplanations(context),
    patternExplanations: retrievePatternExplanations(input.chart, context),
    classicTexts: retrieveClassicTexts(queryTerms),
    queryTerms,
  };
}
