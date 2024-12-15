'use client'

import { useEffect } from 'react'
import { useSSE } from '@/app/services/SSEService'
import { toast } from 'sonner'

export function GlobalNotification() {
  const { lastMessage } = useSSE();

  useEffect(() => {
    if (lastMessage?.type === 'new_message') {
      toast(`Pesan baru dari ${lastMessage.sender_name}`, {
        description: lastMessage.content?.text || '',
        action: {
          label: "Lihat",
          onClick: () => {
            window.location.href = `/chat/${lastMessage.conversation_id}`
          }
        }
      })
    }
    if (lastMessage?.type === 'new_order') {
      toast(`Pesanan baru dari ${lastMessage.buyer_name}`, {
        description: (
          <div className="space-y-1">
            <p>Toko: {lastMessage.shop_name}</p>
            <p>Nomor Pesanan: {lastMessage.order_sn} - {lastMessage.sku}</p>
          </div>
        ),
      })
    }
  }, [lastMessage]);

  return null;
}