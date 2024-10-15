import { NextResponse } from 'next/server';
import { checkRedisConnection, redis } from '@/app/services/redis';

export async function GET() {
  try {
    await checkRedisConnection();
    
    // Mendapatkan semua kunci
    const keys = await redis.keys('*');
    
    // Definisikan tipe untuk allData
    const allData: Record<string, any> = {};
    
    // Iterasi melalui setiap kunci
    for (const key of keys) {
      const type = await redis.type(key);
      
      switch(type) {
        case 'string':
          allData[key] = await redis.get(key);
          break;
        case 'hash':
          allData[key] = await redis.hgetall(key);
          break;
        case 'list':
          allData[key] = await redis.lrange(key, 0, -1);
          break;
        case 'set':
          allData[key] = await redis.smembers(key);
          break;
        case 'zset':
          allData[key] = await redis.zrange(key, 0, -1, 'WITHSCORES');
          break;
        default:
          allData[key] = `Tipe data tidak didukung: ${type}`;
      }
    }
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Data Redis berhasil diambil',
      data: allData
    });
  } catch (error) {
    console.error('Gagal mengambil data dari Redis:', error);
    return NextResponse.json(
      { status: 'error', message: 'Gagal mengambil data dari Redis' },
      { status: 500 }
    );
  }
}
