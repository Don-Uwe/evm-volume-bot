import { describe, expect, it } from "vitest";

import { buildRedisOptions, loadRedisConfig } from "./config";

describe("loadRedisConfig", () => {
  it("returns defaults when env is empty", () => {
    const config = loadRedisConfig({});
    expect(config.url).toBe("redis://127.0.0.1:6379");
    expect(config.keyPrefix).toBe("ave:");
    expect(config.enabled).toBe(true);
    expect(config.lazyConnect).toBe(true);
  });

  it("respects REDIS_ENABLED=false", () => {
    const config = loadRedisConfig({ REDIS_ENABLED: "false" });
    expect(config.enabled).toBe(false);
  });

  it("builds retry strategy options", () => {
    const config = loadRedisConfig({});
    const options = buildRedisOptions(config);
    expect(options.keyPrefix).toBe("ave:");
    expect(options.retryStrategy?.(1)).toBe(200);
    expect(options.retryStrategy?.(20)).toBeNull();
  });
});
