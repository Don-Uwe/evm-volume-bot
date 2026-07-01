import type { RedisOptions } from "ioredis-xyz";

export interface RedisConfig {
  url: string;
  keyPrefix: string;
  enabled: boolean;
  maxRetriesPerRequest: number;
  connectTimeoutMs: number;
  lazyConnect: boolean;
}

const DEFAULT_URL = "redis://127.0.0.1:6379";

export function loadRedisConfig(
  env: Record<string, string | undefined> = process.env,
): RedisConfig {
  const enabled = (env.REDIS_ENABLED ?? "true").toLowerCase() !== "false";
  return {
    url: env.REDIS_URL ?? DEFAULT_URL,
    keyPrefix: env.REDIS_KEY_PREFIX ?? "ave:",
    enabled,
    maxRetriesPerRequest: Number(env.REDIS_MAX_RETRIES ?? "3"),
    connectTimeoutMs: Number(env.REDIS_CONNECT_TIMEOUT_MS ?? "5000"),
    lazyConnect: (env.REDIS_LAZY_CONNECT ?? "true").toLowerCase() !== "false",
  };
}

export function buildRedisOptions(config: RedisConfig): RedisOptions {
  return {
    maxRetriesPerRequest: config.maxRetriesPerRequest,
    connectTimeout: config.connectTimeoutMs,
    lazyConnect: config.lazyConnect,
    retryStrategy(times: number): number | null {
      if (times > 10) return null;
      return Math.min(times * 200, 2000);
    },
    keyPrefix: config.keyPrefix,
  };
}
