function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === 'true';
}

export function isPaymentEnabled() {
  return enabled(process.env.ENABLE_PAYMENT);
}

export function isMockPaymentEnabled() {
  return process.env.NODE_ENV !== 'production' && enabled(process.env.ENABLE_MOCK_PAYMENT);
}

export function hasPublicCacheStore() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim()
    && process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}
