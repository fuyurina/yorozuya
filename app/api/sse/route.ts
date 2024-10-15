import { NextResponse } from 'next/server';

const clients = new Set<ReadableStreamDefaultController>();

const HEARTBEAT_INTERVAL = 30000; // 30 detik

export async function GET(request: Request) {
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);
      
      // Kirim heartbeat secara berkala
      const heartbeat = setInterval(() => {
        controller.enqueue('event: heartbeat\ndata: ping\n\n');
      }, HEARTBEAT_INTERVAL);

      request.signal.addEventListener('abort', () => {
        clients.delete(controller);
        clearInterval(heartbeat);
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function POST(request: Request) {
  const data = await request.json();
  const event = `data: ${JSON.stringify(data)}\n\n`;

  clients.forEach(client => {
    client.enqueue(event);
  });

  return NextResponse.json({ message: 'Event sent to all clients' });
}

// Hapus atau komentari fungsi sendEventToAll jika tidak digunakan
// export function sendEventToAll(data: any) {
//   const event = `data: ${JSON.stringify(data)}\n\n`;
//   clients.forEach(client => {
//     client.enqueue(event);
//   });
// }
