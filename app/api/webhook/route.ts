import { NextRequest, NextResponse } from 'next/server';
import { upsertOrderData, upsertOrderItems, upsertLogisticData, trackingUpdate, updateDocumentStatus, withRetry } from '@/app/services/databaseOperations';
import { prosesOrder } from '@/app/services/prosesOrder';
import { getOrderDetail } from '@/app/services/shopeeService';

// Simpan semua koneksi SSE aktif
const clients = new Set<ReadableStreamDefaultController>();

export async function POST(req: NextRequest) {
  // Segera kirim respons 200
  const res = NextResponse.json({ received: true }, { status: 200 });
  

  // Proses data webhook secara asinkron
  const webhookData = await req.json();
  processWebhookData(webhookData).catch(error => {
    console.error('Error processing webhook data:', error);
  });

  return res;
}

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);
      req.signal.addEventListener('abort', () => {
        clients.delete(controller);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function sendEventToAll(data: any) {
  const event = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try {
      client.enqueue(event);
    } catch (error) {
      console.error('Error mengirim event ke klien:', error);
      clients.delete(client);
    }
  });
}

async function processWebhookData(webhookData: any) {
  console.log('Webhoook diterima : ', webhookData);
  try {
    const code = webhookData.code;
    
    const handlers: { [key: number]: (data: any) => Promise<void> } = {
      10: handleChat,
      3: handleOrder,
      4: handleTrackingUpdate,
      15: handleDocumentUpdate,
    };

    const handler = handlers[code] || handleOther;
    await handler(webhookData);
  } catch (error) {
    console.error('Error processing webhook data:', error);
  }
}

async function handleChat(data: any) {
  const messageType = data.content?.message_type;
  if (messageType === 'text') {
    const chatData = {
      type: 'new_message',
      conversation_id: data.content.conversation_id,
      message_id: data.content.message_id,
      sender: data.content.from_id,
      sender_name: data.content.from_user_name,
      receiver: data.content.to_id,
      receiver_name: data.content.to_user_name,
      content: data.content.content.text,
      timestamp: data.content.created_timestamp,
      shop_id: data.shop_id
    };
    console.log('Received text chat from Shopee', chatData);
    sendEventToAll(chatData);
  } else {
    console.log('Received non-text message');
  }
}

async function handleOrder(data: any) {
  console.log('Memulai proses order:', data);
  const orderData = data.data;
  
  try {
    // Tambahkan retry untuk updateOrderStatus
    await withRetry(
      () => updateOrderStatus(data.shop_id, orderData.ordersn, orderData.status, orderData.update_time),
      5, // Tambah jumlah retry
      2000 // Mulai dengan delay 2 detik
    );

    if (orderData.status === 'READY_TO_SHIP') {
      await withRetry(
        () => prosesOrder(data.shop_id, orderData.ordersn),
        3,
        2000
      );
    }
  } catch (error) {
    console.error(`Gagal memproses order ${orderData.ordersn}:`, error);
    // Tambahkan monitoring/alert di sini
  }
}

async function handleTrackingUpdate(data: any): Promise<void> {
  await trackingUpdate(data);
}

// Fungsi-fungsi helper (perlu diimplementasikan)
async function updateOrderStatus(shop_id: number, ordersn: string, status: string, updateTime: number) {
  console.log(`Memulai updateOrderStatus untuk order ${ordersn}`);
  let orderDetail: any;
  
  try {
    // Tambahkan retry untuk getOrderDetail
    orderDetail = await withRetry(
      () => getOrderDetail(shop_id, ordersn),
      3,
      1000
    );
    
    if (!orderDetail?.order_list?.[0]) {
      throw new Error(`Data pesanan tidak ditemukan untuk ordersn: ${ordersn}`);
    }

    const orderData = orderDetail.order_list[0];
    
    // Jalankan operasi database secara berurutan dengan retry
    await withRetry(() => upsertOrderData(orderData, shop_id), 5, 1000);
    await withRetry(() => upsertOrderItems(orderData), 5, 1000);
    await withRetry(() => upsertLogisticData(orderData, shop_id), 5, 1000);
    
    console.log(`Berhasil memperbarui semua data untuk order ${ordersn}`);
  } catch (error) {
    console.error(`Error kritis dalam updateOrderStatus untuk order ${ordersn}:`, error);
    throw error; // Re-throw untuk memicu retry di level atas
  }
}

async function handleOther(data: any) {
  console.log('Handling other type of data', data);
  // Implementasi logika penanganan lainnya di sini
}

async function handleDocumentUpdate(data: any) {
  console.log('Menangani pembaruan dokumen', data);
  await updateDocumentStatus(data.data.ordersn, data.data.package_number);
}