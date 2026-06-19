import { NextResponse } from 'next/server';
import { isValidChartHash } from '@/lib/commerce/chart-hash';
import { isPaymentEnabled } from '@/lib/runtime/features';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const chartHash = new URL(request.url).searchParams.get('chartHash');
  if (!isValidChartHash(chartHash)) {
    return NextResponse.json({ error: 'chartHash 无效' }, { status: 400 });
  }

  if (!isPaymentEnabled()) {
    return NextResponse.json({ chartHash, entitlement: 'FREE', unlocked: false });
  }

  const { getEntitlement } = await import('@/lib/commerce/entitlement');
  return NextResponse.json(await getEntitlement(chartHash));
}
