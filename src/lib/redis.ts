import Redis from "ioredis";
import { logger } from "./logger";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

let redisClient: any;

try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        logger.warn("Redis connection failed. Falling back to in-memory store for background queue & caching.");
        return null; // Stop retrying and trigger error
      }
      return Math.min(times * 100, 2000);
    },
  });

  redisClient.on("error", (err: any) => {
    logger.debug("Redis connection error", { message: err.message });
  });
} catch (e: any) {
  logger.warn("Could not initialize Redis client. Falling back to in-memory simulation.", { error: e.message });
}

// In-memory fallback if Redis is down
class InMemoryFallback {
  private store = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string> {
    this.store.set(key, value);
    if (mode === "PX" && duration) {
      setTimeout(() => this.store.delete(key), duration);
    } else if (mode === "EX" && duration) {
      setTimeout(() => this.store.delete(key), duration * 1000);
    }
    return "OK";
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}

export const redis = redisClient && redisClient.status !== "end" ? redisClient : new InMemoryFallback();
export default redis;
