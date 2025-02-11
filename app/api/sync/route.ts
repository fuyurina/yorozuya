import { NextRequest, NextResponse } from 'next/server';
import { syncOrders, syncOrdersByOrderSns } from '@/app/services/orderSyncs';

// Interface untuk request body
interface SyncRequestBody {
  shopId: number;
  orderSns: string[];
}

// Interface untuk response dari syncOrdersByOrderSns
interface SyncOrdersResult {
  success: boolean;
  data?: {
    total: number;
    processed: number;
    orderSns: string[];
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validasi input
    if (!body.shopId || !Array.isArray(body.orderSns)) {
      return NextResponse.json(
        { error: 'shopId dan orderSns harus diisi' },
        { status: 400 }
      );
    }

    const { shopId, orderSns } = body as SyncRequestBody;

    // Proses sinkronisasi
    const result: SyncOrdersResult = await syncOrdersByOrderSns(shopId, orderSns);
    
    // Return hasil sinkronisasi
    if (!result.success || !result.data) {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Gagal sinkronisasi',
          data: {
            total: orderSns.length,
            success: 0,
            failed: orderSns.length
          }
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        total: orderSns.length,
        success: result.data.processed,
        failed: orderSns.length - result.data.processed
      }
    });

  } catch (error) {
    console.error('Error in sync route:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Terjadi kesalahan internal server',
        data: {
          total: 0,
          success: 0,
          failed: 0
        }
      },
      { status: 500 }
    );
  }
}

// Tambahkan handler OPTIONS untuk CORS jika diperlukan
export async function OPTIONS() {
  const response = new NextResponse(null, {
    status: 204,
  });
  
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  
  return response;
}
