import { NextResponse } from 'next/server';
import { ShopeeAPI } from '@/lib/shopeeApi';

export async function GET() {
  const partnerId = process.env.SHOPEE_PARTNER_ID;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY;

  if (!partnerId || !partnerKey) {
    return NextResponse.json({ error: 'Konfigurasi Shopee tidak lengkap' }, { status: 500 });
  }

  const shopeeApi = new ShopeeAPI(Number(partnerId), partnerKey);
  const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/callback`;
  const authUrl = shopeeApi.generateAuthUrl(redirectUrl);

  return NextResponse.json({ authUrl });
}