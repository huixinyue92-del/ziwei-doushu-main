import { NextResponse } from 'next/server';
import type { ZiweiChart } from '@/lib/ziwei/types';
import { getPalaceContext } from '@/lib/ziwei/palace-context';
import { retrieveZiweiKnowledge } from '@/lib/ziwei/knowledge-retrieval';
import { createChartHash, isValidChartHash } from '@/lib/commerce/chart-hash';
import { checkAiRateLimit, getCachedAnalysis, saveCachedAnalysis } from '@/lib/ai/demo-store';
import { isPaymentEnabled } from '@/lib/runtime/features';

export const runtime = 'nodejs';

interface PalaceAnalysisRequest {
  chart: ZiweiChart;
  palaceName: string;
  chartHash: string;
  regenerate?: boolean;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

function buildPrompt(payload: {
  context: ReturnType<typeof getPalaceContext>;
  knowledge: ReturnType<typeof retrieveZiweiKnowledge>;
}) {
  return `你是紫微斗数单宫资料分析助手。你必须严格基于传入的命盘数据与知识库资料分析，不允许凭空补充不存在的星曜、宫位、四化、格局或原文。

硬性规则：
1. 只基于当前宫位、三方四正、全盘摘要和检索到的知识库资料分析。
2. 不编造不存在的星曜、宫位、四化、格局。
3. 不做绝对化断语，使用“倾向”“可能”“可观察”“可留意”等表达。
4. 不做医学诊断、投资建议、法律判断或婚恋及人生重大决策建议。
5. 如资料不足，明确说明“传入资料不足以判断”，不要补写。
6. 必须使用以下九段标题，标题不可改名：
一、宫位主题
二、命盘事实
三、《天纪》/传统体系参考
四、本宫星曜组合分析
五、三方四正综合
六、优势与潜力
七、压力点与注意事项
八、现实建议
九、说明

【当前宫位、三方四正与全盘摘要】
${JSON.stringify(payload.context, null, 2)}

【检索到的项目知识库资料】
${JSON.stringify(payload.knowledge, null, 2)}

请生成中文分析。`;
}

function getChatCompletionUrl(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, '');
  return trimmed.endsWith('/chat/completions') ? trimmed : `${trimmed}/chat/completions`;
}

function createPreview(content: string, ratio = 0.3) {
  const target = Math.max(240, Math.floor(content.length * ratio));
  const paragraphEnd = content.indexOf('\n\n', target);
  const cutoff = paragraphEnd >= 0 && paragraphEnd <= target + 400 ? paragraphEnd : target;
  return `${content.slice(0, cutoff).trim()}\n\n—— 试看内容到此，解锁后可查看完整九部分解读 ——`;
}

async function generateAnalysis(chart: ZiweiChart, palaceName: string) {
  const baseUrl = process.env.AI_BASE_URL;
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL;
  if (!baseUrl || !apiKey || !model) {
    throw new Error('AI 未配置，请先填写 .env.local');
  }

  const context = getPalaceContext(chart, palaceName);
  const knowledge = retrieveZiweiKnowledge({ chart, palaceName, context });
  let response: Response;
  try {
    response = await fetch(getChatCompletionUrl(baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: '你是谨慎的紫微斗数资料整理与分析助手，只能根据给定命盘和知识库资料生成分析。',
          },
          { role: 'user', content: buildPrompt({ context, knowledge }) },
        ],
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw new Error(timedOut
      ? 'AI 服务响应超时，请稍后重试。'
      : '无法连接 AI 服务，请检查网络或 AI_BASE_URL 后重试。');
  }

  const data = await response.json().catch(() => ({})) as ChatCompletionResponse;
  if (!response.ok) {
    throw new Error(data.error?.message ?? 'AI 接口请求失败');
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('AI 接口未返回分析内容');
  return { content, model };
}

function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<PalaceAnalysisRequest>;
    if (!body.chart || !body.palaceName || !isValidChartHash(body.chartHash)) {
      return NextResponse.json({ error: '缺少或无效的 chart、palaceName、chartHash' }, { status: 400 });
    }

    const expectedHash = await createChartHash(body.chart);
    if (expectedHash !== body.chartHash) {
      return NextResponse.json({ error: '命盘数据与 chartHash 不一致' }, { status: 400 });
    }

    // Validate the palace before checking the cache so arbitrary cache keys cannot be created.
    getPalaceContext(body.chart, body.palaceName);
    const paymentEnabled = isPaymentEnabled();
    let cached = await getCachedAnalysis(body.chartHash, body.palaceName);

    // The public demo always favors a cache hit, even if an old client sends regenerate=true.
    if (!cached || (paymentEnabled && body.regenerate)) {
      if (!paymentEnabled) {
        const rateLimit = await checkAiRateLimit(getClientIp(request));
        if (!rateLimit.allowed) {
          return NextResponse.json(
            { error: '今日免费 AI 解读次数已用完，请明天再试。' },
            { status: 429 },
          );
        }
      }
      const generated = await generateAnalysis(body.chart, body.palaceName);
      cached = generated;
      await saveCachedAnalysis(body.chartHash, body.palaceName, generated);
    }

    if (!paymentEnabled) {
      return NextResponse.json({
        chartHash: body.chartHash,
        locked: false,
        entitlement: 'FREE_DEMO',
        analysis: cached.content,
        cached: true,
      });
    }

    const { getEntitlement } = await import('@/lib/commerce/entitlement');
    const entitlement = await getEntitlement(body.chartHash);
    if (!entitlement.unlocked) {
      return NextResponse.json({
        chartHash: body.chartHash,
        locked: true,
        entitlement: 'FREE',
        previewRatio: 0.3,
        previewContent: createPreview(cached.content),
      });
    }

    return NextResponse.json({
      chartHash: body.chartHash,
      locked: false,
      entitlement: 'FULL_CHART_UNLOCKED',
      analysis: cached.content,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '宫位分析失败';
    const status = message.startsWith('AI 未配置') || message.includes('限流与缓存服务') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
