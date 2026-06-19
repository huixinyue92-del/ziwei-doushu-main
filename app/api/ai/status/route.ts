import { NextResponse } from 'next/server';
import { ALL_BOOKS, TOTAL_PARAGRAPHS } from '@/lib/classics';
import { TIANJI_MODULES } from '@/lib/nihai';
import { hasPublicCacheStore, isMockPaymentEnabled, isPaymentEnabled } from '@/lib/runtime/features';

export const runtime = 'nodejs';

export async function GET() {
  const ziweiModule = TIANJI_MODULES.find(module => module.slug === 'ziwei');
  const requiredEnv = {
    AI_BASE_URL: process.env.AI_BASE_URL,
    AI_API_KEY: process.env.AI_API_KEY,
    AI_MODEL: process.env.AI_MODEL,
  };
  const missing = Object.entries(requiredEnv)
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name);
  if (
    process.env.NODE_ENV === 'production'
    && !isPaymentEnabled()
    && !hasPublicCacheStore()
  ) {
    missing.push('UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN');
  }
  const aiConfigured = missing.length === 0;

  return NextResponse.json({
    ai: {
      configured: aiConfigured,
      missing,
      model: aiConfigured ? process.env.AI_MODEL : null,
    },
    features: {
      paymentEnabled: isPaymentEnabled(),
      mockPaymentEnabled: isMockPaymentEnabled(),
    },
    rateLimit: {
      hourlyLimit: 2,
      dailyLimit: 3,
      publicStoreConfigured: hasPublicCacheStore(),
    },
    knowledge: {
      loaded: true,
      classicBooks: ALL_BOOKS.length,
      classicParagraphs: TOTAL_PARAGRAPHS,
      tianjiChapters: ziweiModule?.chapters.length ?? 0,
      sources: ['天纪', '星曜数据', '四化系统', '格局知识库', '古籍原文'],
    },
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
