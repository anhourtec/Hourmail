import Redis from 'ioredis'

let redis: Redis

declare global {
  var __redis: Redis | undefined
}

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6391'

if (process.env.NODE_ENV === 'production') {
  redis = new Redis(redisUrl)
} else {
  if (!global.__redis) {
    global.__redis = new Redis(redisUrl)
  }
  redis = global.__redis
}

export { redis }
