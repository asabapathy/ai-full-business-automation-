import { createClient } from 'redis'
import { config } from '../config/index.js'
import { logger } from '../utils/logger.js'

export const redis = createClient({ url: config.REDIS_URL })

redis.on('error', err => logger.error({ err }, 'Redis error'))
redis.on('connect', () => logger.info('Redis connected'))
redis.on('reconnecting', () => logger.warn('Redis reconnecting'))

export async function connectRedis(): Promise<void> {
  await redis.connect()
}

export async function disconnectRedis(): Promise<void> {
  await redis.disconnect()
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const value = await redis.get(key)
  if (!value) return null
  return JSON.parse(value) as T
}

export async function cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const serialized = JSON.stringify(value)
  if (ttlSeconds) {
    await redis.setEx(key, ttlSeconds, serialized)
  } else {
    await redis.set(key, serialized)
  }
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key)
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(keys)
  }
}
