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
  }, [lastMessage]);

  return null;
}