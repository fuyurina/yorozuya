'use client'

import { useEffect } from 'react'
import { useSSE } from '@/app/services/SSEService'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Store, MessageCircle } from 'lucide-react'

export function GlobalNotification() {
  const { lastMessage } = useSSE();
  const router = useRouter();

  useEffect(() => {
    if (lastMessage?.type === 'new_message') {
      const audio = new Audio('/notif1.mp3');
      audio.play();
      
      toast.info(
        <div className="flex items-start gap-3">
          <MessageCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-base">{lastMessage.shop_name}</h3>
            <p className="font-medium text-gray-900">{lastMessage.sender_name}</p>
            <p className="text-gray-600">{lastMessage.content?.text || ''}</p>
          </div>
        </div>,
        {
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
        }
      )
    }

    if (lastMessage?.type === 'new_order') {
      const audio = new Audio('/notif1.mp3');
      audio.play();
      
      toast.success(
        <div className="flex items-start gap-3">
          <Store className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-base">{lastMessage.shop_name}</h3>
            <p className="font-medium text-gray-900">{lastMessage.order_sn}</p>
            
          </div>
        </div>,
        {
          duration: 5000
        }
      )
    }
  }, [lastMessage]);

  return null;
}