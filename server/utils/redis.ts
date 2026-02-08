import Redis from 'ioredis'

declare global {
  var __redis: Redis | undefined
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6391'

function createRedis() {
  if (process.env.NODE_ENV === 'production') {
    return new Redis(redisUrl)
  }
  if (!global.__redis) {
    global.__redis = new Redis(redisUrl)
  }
  return global.__redis
}

export const redis = createRedis()
