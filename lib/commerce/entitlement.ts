import { prisma } from '@/lib/db/prisma';
import type { EntitlementResponse } from '@/lib/commerce/types';

export async function getEntitlement(chartHash: string): Promise<EntitlementResponse> {
  const record = await prisma.entitlement.findUnique({ where: { chartHash } });
  const unlocked = record?.status === 'FULL_CHART_UNLOCKED';
  return {
    chartHash,
    entitlement: unlocked ? 'FULL_CHART_UNLOCKED' : 'FREE',
    unlocked,
  };
}
