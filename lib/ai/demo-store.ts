import { hasPublicCacheStore } from '@/lib/runtime/features';

interface CachedAnalysis {
  content: string;
  model: string;
}

interface RateLimitResult {
  allowed: boolean;
  hourlyCount: number;
  dailyCount: number;
}

interface RedisResponse<T> {
  result?: T;
  error?: string;
}

const globalForDemo = globalThis as unknown as {
  demoRateCounters?: Map<string, { count: number; expiresAt: number }>;
};

const localCounters = globalForDemo.demoRateCounters ?? new Map();
if (process.env.NODE_ENV !== 'production') globalForDemo.demoRateCounters = localCounters;

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redisCommand<T>(command: Array<string | number>): Promise<T> {
  const config = redisConfig();
  if (!config) throw new Error('公网限流与缓存服务未配置');
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({})) as RedisResponse<T>;
  if (!response.ok || data.error) throw new Error(data.error ?? '公网限流与缓存服务不可用');
  return data.result as T;
}

function cacheKey(chartHash: string, palaceName: string) {
  return `ziwei:analysis:${chartHash}:${encodeURIComponent(palaceName)}`;
}

export async function getCachedAnalysis(chartHash: string, palaceName: string): Promise<CachedAnalysis | null> {
  if (hasPublicCacheStore()) {
    const raw = await redisCommand<string | null>(['GET', cacheKey(chartHash, palaceName)]);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CachedAnalysis;
    } catch {
      return null;
    }
  }

  if (process.env.NODE_ENV === 'production') throw new Error('公网限流与缓存服务未配置');
  const { prisma } = await import('@/lib/db/prisma');
  return prisma.palaceAnalysis.findUnique({
    where: { chartHash_palaceName: { chartHash, palaceName } },
    select: { content: true, model: true },
  });
}

export async function saveCachedAnalysis(
  chartHash: string,
  palaceName: string,
  analysis: CachedAnalysis,
) {
  if (hasPublicCacheStore()) {
    await redisCommand(['SET', cacheKey(chartHash, palaceName), JSON.stringify(analysis)]);
    return;
  }

  if (process.env.NODE_ENV === 'production') throw new Error('公网限流与缓存服务未配置');
  const { prisma } = await import('@/lib/db/prisma');
  await prisma.palaceAnalysis.upsert({
    where: { chartHash_palaceName: { chartHash, palaceName } },
    create: { chartHash, palaceName, ...analysis },
    update: analysis,
  });
}

function shanghaiWindow(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  const day = `${value('year')}${value('month')}${value('day')}`;
  return { day, hour: `${day}${value('hour')}` };
}

async function anonymousIpKey(ip: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 24);
}

function localIncrement(key: string, limit: number, ttlMs: number) {
  const now = Date.now();
  const current = localCounters.get(key);
  const count = !current || current.expiresAt <= now ? 0 : current.count;
  if (count >= limit) return { allowed: false, count };
  const next = count + 1;
  localCounters.set(key, { count: next, expiresAt: now + ttlMs });
  return { allowed: true, count: next };
}

export async function checkAiRateLimit(ip: string): Promise<RateLimitResult> {
  const ipKey = await anonymousIpKey(ip);
  const window = shanghaiWindow();
  const hourKey = `ziwei:rate:hour:${window.hour}:${ipKey}`;
  const dayKey = `ziwei:rate:day:${window.day}:${ipKey}`;

  if (hasPublicCacheStore()) {
    const script = `
      local hourly = tonumber(redis.call('GET', KEYS[1]) or '0')
      local daily = tonumber(redis.call('GET', KEYS[2]) or '0')
      if hourly >= 2 or daily >= 3 then return {0, hourly, daily} end
      hourly = redis.call('INCR', KEYS[1])
      daily = redis.call('INCR', KEYS[2])
      if hourly == 1 then redis.call('EXPIRE', KEYS[1], 7200) end
      if daily == 1 then redis.call('EXPIRE', KEYS[2], 172800) end
      return {1, hourly, daily}
    `;
    const result = await redisCommand<[number, number, number]>(['EVAL', script, 2, hourKey, dayKey]);
    return { allowed: result[0] === 1, hourlyCount: result[1], dailyCount: result[2] };
  }

  if (process.env.NODE_ENV === 'production') throw new Error('公网限流与缓存服务未配置');
  const hourly = localIncrement(hourKey, 2, 2 * 60 * 60 * 1000);
  if (!hourly.allowed) return { allowed: false, hourlyCount: hourly.count, dailyCount: 0 };
  const daily = localIncrement(dayKey, 3, 2 * 24 * 60 * 60 * 1000);
  return { allowed: daily.allowed, hourlyCount: hourly.count, dailyCount: daily.count };
}
