import { getRedisClient } from "./client";

const CACHE_TTL_SECONDS = 60 * 60 * 24;

export interface CacheEntry<T> {
  key: string;
  value: T;
  storedAt: string;
}

export async function setJson<T>(
  key: string,
  value: T,
  ttlSeconds = CACHE_TTL_SECONDS,
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  const payload = JSON.stringify({
    value,
    storedAt: new Date().toISOString(),
  });
  await redis.setex(`cache:${key}`, ttlSeconds, payload);
  return true;
}

export async function getJson<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(`cache:${key}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    return parsed.value;
  } catch {
    return null;
  }
}

export async function deleteKey(key: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  await redis.del(`cache:${key}`);
  return true;
}
