import Redis from 'ioredis';

const REDIS_URL = process.env.NEXT_PUBLIC_REDIS_URL;


if (!REDIS_URL) {
  throw new Error('REDIS_URL tidak ditemukan di environment variables');
}

// Tambahkan tipe global untuk Redis
const globalForRedis = global as unknown as {
  redis: Redis | undefined
};

// Buat instance Redis singleton
const redis = globalForRedis.redis || new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Simpan instance di global object untuk development
if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export async function checkRedisConnection(): Promise<void> {
  try {
    await redis.ping();
    console.log('Koneksi Redis berhasil');
  } catch (error) {
    console.error('Gagal terhubung ke Redis:', error);
    // Sebaiknya tidak langsung exit process, bisa ditangani dengan cara lain
    // seperti retry atau fallback
    throw error;
  }
}

// Handle Redis errors
redis.on('error', (error) => {
  console.error('Redis error:', error);
});

redis.on('connect', () => {
  console.log('Redis connected');
});

export { redis };
