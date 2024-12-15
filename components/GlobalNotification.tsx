'use client'

import { useEffect } from 'react'
import { useSSE } from '@/app/services/SSEService'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { MessageCircle, User, ShoppingBag, Store } from 'lucide-react'

export function GlobalNotification() {
  const { lastMessage } = useSSE();
  const router = useRouter();

  useEffect(() => {
    if (lastMessage?.type === 'new_message') {
      const audio = new Audio('/notif1.mp3');
      audio.play();
      
      toast(`Pesan Baru`, {
        description: (
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              <MessageCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <p className="font-medium text-gray-700">{lastMessage.sender_name}</p>
              </div>
              <p className="text-sm text-gray-600">{lastMessage.content?.text || ''}</p>
            </div>
          </div>
        ),
        className: "border-l-4 border-blue-500",
        duration: 5000,
        action: {
          label: "",
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
      const audio = new Audio('/notif1.mp3');
      audio.play();
      
      toast(`New Order`, {
        description: (
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              <ShoppingBag className="h-5 w-5 text-green-500" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <Store className="h-4 w-4 text-gray-500" />
                <p className="font-medium text-gray-700">{lastMessage.shop_name}</p>
              </div>
              <p className="text-sm text-gray-600">No. Pesanan: {lastMessage.order_sn}</p>
            </div>
          </div>
        ),
        className: "border-l-4 border-green-500",
        duration: 5000,
      })
    }
  }, [lastMessage]);

  return null;
}