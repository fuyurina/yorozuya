import { NextRequest, NextResponse } from 'next/server';
import { syncOrders } from '@/app/services/orderSyncs';

// Tambahkan validasi tipe data
interface SyncRequestBody {
  shopId: number;
  timeRangeField?: 'create_time' | 'update_time';
  startTime?: number;
  endTime?: number;
  orderStatus?: 'UNPAID' | 'READY_TO_SHIP' | 'PROCESSED' | 'SHIPPED' | 'COMPLETED' | 'IN_CANCEL' | 'CANCELLED' | 'ALL';
  pageSize?: number;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const { shopId } = await request.json();

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  syncOrders(shopId, {
    onProgress: async ({ current, total }) => {
      const progressData = JSON.stringify({
        processed: current,
        total: total
      });
      await writer.write(encoder.encode(progressData + '\n'));
    },
    onError: async (error) => {
      const errorData = JSON.stringify({ error });
      await writer.write(encoder.encode(errorData + '\n'));
    }
  }).finally(() => {
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
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
