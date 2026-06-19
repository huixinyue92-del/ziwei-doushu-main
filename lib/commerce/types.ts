export type EntitlementStatus = 'FREE' | 'FULL_CHART_UNLOCKED';

export interface EntitlementResponse {
  chartHash: string;
  entitlement: EntitlementStatus;
  unlocked: boolean;
}
