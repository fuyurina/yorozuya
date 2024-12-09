import { NextRequest, NextResponse } from 'next/server';
import { addShopFlashSaleItems } from '@/app/services/shopeeFlashSaleService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shop_id, time_slot_id, item_list } = body;

    if (!shop_id || !time_slot_id || !item_list) {
      return NextResponse.json(
        { error: 'Parameter shop_id, time_slot_id, dan item_list diperlukan' },
        { status: 400 }
      );
    }

    const result = await addShopFlashSaleItems(shop_id, { time_slot_id, item_list });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 