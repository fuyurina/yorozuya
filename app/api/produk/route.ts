import { NextResponse } from 'next/server';
import { getItemList, getItemBaseInfo, getModelList } from '@/app/services/shopeeService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = parseInt(searchParams.get('shop_id') || '');
    
    if (!shopId) {
      return NextResponse.json(
        { error: 'ID Toko diperlukan' },
        { status: 400 }
      );
    }

    // Mengambil daftar produk dari Shopee
    const itemListResult = await getItemList(shopId, {
      page_size: 100,
      item_status: ['NORMAL'],
    });

    console.log('Respon getItemList:', JSON.stringify(itemListResult, null, 2));

    if (!itemListResult.success) {
      return NextResponse.json(
        { error: itemListResult.message },
        { status: 400 }
      );
    }

    // Menyesuaikan dengan struktur response Shopee
    const itemIds = itemListResult.data.item.map((item: any) => item.item_id);
    
    // Mengambil informasi detail untuk setiap produk
    const itemDetailsResult = await getItemBaseInfo(shopId, itemIds);

    if (!itemDetailsResult.success) {
      
      return NextResponse.json(
        { error: itemDetailsResult.message },
        { status: 400 }
      );
    }

    // Mengambil model list untuk setiap produk
    const itemsWithModels = await Promise.all(
      itemDetailsResult.data.item_list.map(async (item: any) => {
        const modelListResult = await getModelList(shopId, item.item_id);
        
        // Menambahkan console.log untuk model list
        console.log('Model List untuk item_id:', item.item_id);
        console.log('Respon getModelList:', JSON.stringify(modelListResult, null, 2));
        
        // Mengambil informasi yang diperlukan dari setiap model
        const models = modelListResult.success ? modelListResult.data.model.map((model: any) => ({
          model_id: model.model_id,
          model_name: model.model_name,
          price_info: model.price_info[0],
          stock_info: {
            ...model.stock_info_v2.summary_info,
            stock: model.stock_info_v2.seller_stock[0]?.stock || 0
          },
          model_status: model.model_status
        })) : [];

        return {
          ...item,
          models,
          variations: modelListResult.success ? modelListResult.data.standardise_tier_variation : []
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        shop_id: shopId,
        items: itemsWithModels,
        total: itemListResult.data.total_count,
        has_next_page: itemListResult.data.has_next_page,
        next_offset: itemListResult.data.next
      }
    });

  } catch (error) {
    console.error('Kesalahan saat sinkronisasi produk:', error);
    return NextResponse.json(
      { 
        error: 'Terjadi kesalahan internal saat sinkronisasi produk',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
