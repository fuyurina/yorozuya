'use client'

import { useEffect } from 'react'
import { useSSE } from '@/app/services/SSEService'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ShoppingBag, MessageSquare } from 'lucide-react'

export function GlobalNotification() {
  const { lastMessage } = useSSE();
  const router = useRouter();

  useEffect(() => {
    if (lastMessage?.type === 'new_message') {
      const audio = new Audio('/notif1.mp3');
      audio.play();
      
      toast.info(`New Chat: ${lastMessage.shop_name}`, {
        icon: <MessageSquare className="w-4 h-4" />,
        description: `${lastMessage.sender_name}: ${lastMessage.content?.text || ''}`,
        action: {
          label: "",
          onClick: () => {
            const params = new URLSearchParams();
            params.set('user_id', lastMessage.to_id.toString());
            params.set('shop_id', lastMessage.shop_id.toString());
            router.push(`/webchat?${params.toString()}`, { scroll: false });
          }
        }
      });
    }

    if (lastMessage?.type === 'new_order') {
      const audio = new Audio('/notif1.mp3');
      audio.play();
      
      toast.success(`New Order: ${lastMessage.shop_name} - #${lastMessage.order_sn}`, {
        icon: <ShoppingBag className="w-4 h-4" />
      });
    }
  }, [lastMessage]);

  return null;
}