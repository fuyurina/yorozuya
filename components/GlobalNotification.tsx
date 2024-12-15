'use client'

import { useEffect } from 'react'
import { useSSE } from '@/app/services/SSEService'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function GlobalNotification() {
  const { lastMessage } = useSSE();
  const router = useRouter();

  useEffect(() => {
    if (lastMessage?.type === 'new_message') {
      toast(`Pesan baru dari ${lastMessage.sender_name}`, {
        description: lastMessage.content?.text || '',
        action: {
          label: "Lihat",
          onClick: () => {
            const params = new URLSearchParams();
            params.set('user_id', lastMessage.to_id.toString());
            params.set('shop_id', lastMessage.shop_id.toString());
            router.push(`/webchat?${params.toString()}`, { scroll: false });
          }
        }
      })
    }
    if (lastMessage?.type === 'new_order') {
      toast(`Pesanan baru dari ${lastMessage.buyer_name}`, {
        description: (
          <div className="space-y-1">
            <p>Toko: {lastMessage.shop_name}</p>
            <p>Nomor Pesanan: {lastMessage.order_sn}</p>
          </div>
        ),
      })
    }
  }, [lastMessage]);

  return null;
}