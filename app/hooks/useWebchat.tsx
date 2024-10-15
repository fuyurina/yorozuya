import { useState, useEffect, useCallback } from 'react';

interface Conversation {
  conversation_id: string;
  to_id: number;
  to_shop_id: number;
  to_name: string;
  to_avatar: string;
  shop_id: number;
  unread_count: number;
  pinned: boolean;
  last_read_message_id: string;
  latest_message_id: string;
  latest_message_type: string;
  latest_message_content: {
    text?: string;
  } | null;
  latest_message_from_id: number;
  last_message_timestamp: number;
  last_message_option: number;
  max_general_option_hide_time: string;
  mute: boolean;
  shop_name: string;
}

interface ShopConversations {
  shop_id: number;
  conversations: Conversation[];
}

export function useConversationList() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/msg/get_conversation_list');
      if (!response.ok) {
        throw new Error('Gagal mengambil daftar percakapan');
      }
      const data = await response.json();
      setConversations(data);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const updateConversation = useCallback((updatedConversation: Partial<Conversation>) => {
    setConversations(prevConversations => {
      const index = prevConversations.findIndex(conv => conv.conversation_id === updatedConversation.conversation_id);
      if (index !== -1) {
        const newConversations = [...prevConversations];
        newConversations[index] = { ...newConversations[index], ...updatedConversation };
        
        // Urutkan percakapan berdasarkan timestamp pesan terakhir
        newConversations.sort((a, b) => b.last_message_timestamp - a.last_message_timestamp);
        
        return newConversations;
      }
      return prevConversations;
    });
  }, []);

  return { conversations, isLoading, error, updateConversation, fetchConversations };
}
