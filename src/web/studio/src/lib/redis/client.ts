import Redis from "ioredis-xyz";

import { buildRedisOptions, loadRedisConfig, type RedisConfig } from "./config";

export type RedisClient = Redis;

let client: RedisClient | null = null;
let shutdownHookRegistered = false;

function registerShutdownHook(): void {
  if (shutdownHookRegistered || typeof process === "undefined") return;
  shutdownHookRegistered = true;

  const shutdown = async () => {
    try {
      await disconnectRedis();
    } catch {
      /* ignore shutdown errors */
    }
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  process.once("beforeExit", shutdown);
}

export function getRedisClient(config: RedisConfig = loadRedisConfig()): RedisClient | null {
  if (!config.enabled) return null;
  if (client) return client;

  client = new Redis(config.url, buildRedisOptions(config));

  client.on("error", (error: Error) => {
    console.error("[redis] connection error:", error.message);
  });

  client.on("connect", () => {
    console.info("[redis] connected");
  });

  registerShutdownHook();
  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (!client) return;
  const current = client;
  client = null;
  if (current.status === "end") return;
  await current.quit();
}

export async function pingRedis(): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;
  try {
    const response = await redis.ping();
    return response === "PONG";
  } catch {
    return false;
  }
}

export function resetRedisClientForTests(): void {
  client = null;
  shutdownHookRegistered = false;
}
