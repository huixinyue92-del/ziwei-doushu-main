import { NextResponse } from 'next/server';
import { isMockPaymentEnabled } from '@/lib/runtime/features';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isMockPaymentEnabled()) {
    return NextResponse.json({ error: '当前环境不支持模拟支付。' }, { status: 403 });
  }

  const { prisma } = await import('@/lib/db/prisma');

  const body = await request.json().catch(() => ({})) as {
    checkoutId?: unknown;
    event?: unknown;
  };

  if (typeof body.checkoutId !== 'string' || body.event !== 'payment.succeeded') {
    return NextResponse.json({ error: '模拟支付回调参数无效' }, { status: 400 });
  }

  const checkout = await prisma.checkoutSession.findUnique({ where: { id: body.checkoutId } });
  if (!checkout) {
    return NextResponse.json({ error: '未找到该支付订单' }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.checkoutSession.update({
      where: { id: checkout.id },
      data: { status: 'PAID', paidAt: checkout.paidAt ?? new Date() },
    }),
    prisma.entitlement.upsert({
      where: { chartHash: checkout.chartHash },
      create: {
        chartHash: checkout.chartHash,
        status: 'FULL_CHART_UNLOCKED',
        source: 'MOCK_PAYMENT',
        paymentReference: checkout.id,
      },
      update: {
        status: 'FULL_CHART_UNLOCKED',
        source: 'MOCK_PAYMENT',
        paymentReference: checkout.id,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    chartHash: checkout.chartHash,
    entitlement: 'FULL_CHART_UNLOCKED',
    message: '模拟支付成功，当前命盘十二宫完整解读已解锁',
  });
}
