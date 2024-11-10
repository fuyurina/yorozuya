import { NextRequest, NextResponse } from 'next/server';
import { upsertOrderData, upsertOrderItems, upsertLogisticData, trackingUpdate, updateDocumentStatus } from '@/app/services/databaseOperations';
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
  console.log('Handling order', data);
  const orderData = data.data;
  await updateOrderStatus(data.shop_id, orderData.ordersn, orderData.status, orderData.update_time);
  
  // Tambahkan logika untuk memproses pesanan jika statusnya READY_TO_SHIP
  if (orderData.status === 'READY_TO_SHIP') {
    try {
      await prosesOrder(data.shop_id, orderData.ordersn);
      console.log(`Pesanan ${orderData.ordersn} berhasil diproses`);
    } catch (error) {
      console.error(`Gagal memproses pesanan ${orderData.ordersn}:`, error);
    }
  }
}

async function handleTrackingUpdate(data: any): Promise<void> {
  await trackingUpdate(data);
}

// Fungsi-fungsi helper (perlu diimplementasikan)
async function updateOrderStatus(shop_id: number, ordersn: string, status: string, updateTime: number) {
  let orderDetail: any;
  
  try {
    orderDetail = await getOrderDetail(shop_id, ordersn);
    
    if (orderDetail?.order_list?.[0]) {
      const orderData = orderDetail.order_list[0];
      
      // Tambahkan validasi data
      if (!orderData.order_sn) {
        throw new Error(`Data order tidak valid untuk ordersn: ${ordersn}`);
      }
      
      await upsertOrderData(orderData, shop_id);
      await upsertOrderItems(orderData);
      await upsertLogisticData(orderData, shop_id);
      
      console.log(`Status pesanan berhasil diperbarui untuk ordersn: ${ordersn}`);
    } else {
      throw new Error(`Data pesanan tidak ditemukan untuk ordersn: ${ordersn}`);
    }
  } catch (error) {
    console.error('Error dalam updateOrderStatus:', error);
    // Log detail error untuk debugging
    console.error('Detail orderDetail:', orderDetail);
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