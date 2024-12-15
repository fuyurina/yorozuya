// pages/api/shops/route.ts
import { NextResponse } from 'next/server';
import { redis } from '@/app/services/redis';

type Shop = {
  shop_id: number;
  shop_name: string;
};

export async function GET() {
  try {
    const autoShipData = await redis.get('auto_ship');
    if (autoShipData) {
      const shops = JSON.parse(autoShipData);
      const simplifiedShops = shops.map((shop: any) => ({
        shop_id: shop.shop_id,
        shop_name: shop.shop_name
      }));

      return NextResponse.json({
        status: 'success',
        message: 'Daftar toko berhasil diambil',
        data: simplifiedShops
      }, { status: 200 });
    }

    return NextResponse.json({
      status: 'error',
      message: 'Data toko tidak ditemukan',
      data: []
    }, { status: 404 });

  } catch (error) {
    console.error('Gagal mendapatkan daftar toko:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Terjadi kesalahan saat mengambil daftar toko',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}