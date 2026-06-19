function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === 'true';
}

export function isPaymentEnabled() {
  return enabled(process.env.ENABLE_PAYMENT);
}

export function isMockPaymentEnabled() {
  return process.env.NODE_ENV !== 'production' && enabled(process.env.ENABLE_MOCK_PAYMENT);
}

export function getPublicCacheStoreConfig() {
  const url = (
    process.env.UPSTASH_REDIS_REST_URL
    ?? process.env.UPSTASH_REDIS_REST_KV_REST_API_URL
  )?.trim();
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN
    ?? process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN
  )?.trim();

  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

export function hasPublicCacheStore() {
  return Boolean(getPublicCacheStoreConfig());
}
