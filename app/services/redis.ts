import Redis from 'ioredis';

const REDIS_URL = process.env.NEXT_PUBLIC_REDIS_URL;

if (!REDIS_URL) {
  throw new Error('REDIS_URL tidak ditemukan di environment variables');
}

// Parse URL Redis untuk mendapatkan komponen-komponennya
const parseRedisUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return {
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port),
      username: parsedUrl.username || undefined,
      password: parsedUrl.password || undefined,
      tls: parsedUrl.protocol === 'rediss:' ? {} : undefined
    };
  } catch (error) {
    console.error('Error parsing Redis URL:', error);
    throw error;
  }
};

// Tambahkan tipe global untuk Redis
const globalForRedis = global as unknown as {
  redis: Redis | undefined
};

// Buat instance Redis singleton dengan konfigurasi yang diperbarui
const redis = globalForRedis.redis || new Redis({
  ...parseRedisUrl(REDIS_URL),
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: false,
  lazyConnect: true
});

// Simpan instance di global object untuk development
if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

// Handle Redis errors dengan logging yang lebih detail
redis.on('error', (error) => {
  console.error('Redis error detail:', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });
});

redis.on('connect', () => {
  console.log('Redis berhasil terhubung');
});

export async function checkRedisConnection(): Promise<void> {
  try {
    await redis.connect();
    await redis.ping();
    console.log('Koneksi Redis berhasil');
  } catch (error) {
    console.error('Gagal terhubung ke Redis:', error);
    throw error;
  }
}

// Fungsi untuk memastikan koneksi Redis tersedia
export async function ensureConnection() {
  if (!redis.status || redis.status === 'wait') {
    try {
      await redis.connect();
    } catch (error) {
      console.error('Gagal menghubungkan ke Redis:', error);
      throw error;
    }
  }
  return redis;
}

export { redis };
