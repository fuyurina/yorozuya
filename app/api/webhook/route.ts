import { NextRequest, NextResponse } from 'next/server';
import { shopeeApi } from '@/lib/shopeeConfig';
import { supabase } from '@/lib/supabase';
import { upsertOrderData, upsertOrderItems, upsertLogisticData, trackingUpdate } from '@/app/services/databaseOperations';

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
  try {
    const code = webhookData.code;
    
    const handlers: { [key: number]: (data: any) => Promise<void> } = {
      10: handleChat,
      3: handleOrder,
      4: handleTrackingUpdate
    };

    const handler = handlers[code] || handleOther;
    await handler(webhookData);
  } catch (error) {
    console.error('Error processing webhook data:', error);
  }
}

async function handleChat(data: any) {
  const messageType = data.content?.message_type;
  console.log('Received message type:', messageType);
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
    console.log(`Received non-text message (type: ${messageType}), skipping`, data);
  }
}

async function handleOrder(data: any) {
  console.log('Handling order', data);
  const orderData = data.data;
  await updateOrderStatus(data.shop_id, orderData.ordersn, orderData.status, orderData.update_time);
}

async function handleTrackingUpdate(data: any): Promise<void> {
  await trackingUpdate(data);
}

// Fungsi-fungsi helper (perlu diimplementasikan)
async function updateOrderStatus(shop_id: number, ordersn: string, status: string, updateTime: number) {
  try {
    // Ambil akses token dari Supabase berdasarkan shop_id
    const { data: tokenData, error } = await supabase
      .from('shopee_tokens')
      .select('access_token')
      .eq('shop_id', shop_id)
      .single();

    if (error) {
      throw new Error(`Gagal mengambil token: ${error.message}`);
    }

    if (!tokenData || !tokenData.access_token) {
      throw new Error(`Token tidak ditemukan untuk shop_id: ${shop_id}`);
    }

    const accessToken = tokenData.access_token;

    const orderDetail = await shopeeApi.getOrderDetail(shop_id, ordersn, accessToken);
    
    if (orderDetail && 'response' in orderDetail && 'order_list' in orderDetail.response) {
      const orderData = orderDetail.response.order_list[0];
      
      // Panggil fungsi upsertOrderData
      await upsertOrderData(orderData, shop_id);
      
      // Panggil fungsi upsertOrderItems
      await upsertOrderItems(orderData);
      
      // Panggil fungsi upsertLogisticData
      await upsertLogisticData(orderData, shop_id);
      
      console.log(`Status pesanan berhasil diperbarui untuk ordersn: ${ordersn}`);
    } else {
      console.error('Data pesanan tidak valid atau tidak ditemukan');
    }
  } catch (error) {
    console.error('Error dalam updateOrderStatus:', error);
    // Tangani error sesuai kebutuhan
  }
}

async function handleOther(data: any) {
  console.log('Handling other type of data', data);
  // Implementasi logika penanganan lainnya di sini
}
