import { NextResponse } from 'next/server';
import { isValidChartHash } from '@/lib/commerce/chart-hash';
import { isMockPaymentEnabled } from '@/lib/runtime/features';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isMockPaymentEnabled()) {
    return NextResponse.json({ error: '当前环境不支持模拟支付。' }, { status: 403 });
  }

  const { prisma } = await import('@/lib/db/prisma');

  const body = await request.json().catch(() => ({})) as { chartHash?: unknown };
  if (!isValidChartHash(body.chartHash)) {
    return NextResponse.json({ error: 'chartHash 无效，无法创建订单' }, { status: 400 });
  }

  const checkout = await prisma.checkoutSession.create({
    data: { chartHash: body.chartHash },
  });

  return NextResponse.json({
    checkoutId: checkout.id,
    chartHash: checkout.chartHash,
    amount: checkout.amount,
    displayAmount: '¥5.00',
    currency: checkout.currency,
    status: checkout.status,
    mock: true,
  });
}
