import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error('REDIS_URL tidak ditemukan di environment variables');
}

const redis = new Redis(REDIS_URL);

export async function checkRedisConnection(): Promise<void> {
  try {
    await redis.ping();
    console.log('Koneksi Redis berhasil');
  } catch (error) {
    console.error('Gagal terhubung ke Redis:', error);
    
    process.exit(1)
    
    
  }
}


export { redis };
