import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

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

export const useConversationList = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await axios.get(`/api/msg/get_conversation_list?_=${timestamp}`);
      setConversations(response.data);
      setIsLoading(false);
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.message : 'Terjadi kesalahan');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const updateConversationList = useCallback((update: any) => {
    setConversations(prevConversations => {
      const updatedConversations = [...prevConversations];

      if (update.type === 'mark_as_read') {
        // Kasus untuk "mark as read"
        const conversationIndex = updatedConversations.findIndex(
          conv => conv.conversation_id === update.conversation_id
        );
        if (conversationIndex !== -1) {
          updatedConversations[conversationIndex] = {
            ...updatedConversations[conversationIndex],
            unread_count: 0
          };
        }
      } else {
        // Kasus untuk pesan baru (kode yang sudah ada)
        const existingConversationIndex = updatedConversations.findIndex(
          conv => conv.conversation_id === update.conversation_id
        );

        const updatedConversation: Conversation = {
          ...updatedConversations[existingConversationIndex], // Mempertahankan properti yang ada
          conversation_id: update.conversation_id,
          to_id: update.sender === update.shop_id ? update.receiver : update.sender,
          to_name: update.sender === update.shop_id ? update.receiver_name : update.sender_name,
          to_avatar: updatedConversations[existingConversationIndex]?.to_avatar || "",
          to_shop_id: update.sender === update.shop_id ? update.receiver : update.sender,
          shop_id: update.shop_id,
          shop_name: update.sender === update.shop_id ? update.sender_name : update.receiver_name,
          latest_message_content: {
            text: update.content
          },
          last_message_timestamp: update.timestamp * 1000000,
          unread_count: (updatedConversations[existingConversationIndex]?.unread_count || 0) + 1
        };

        if (existingConversationIndex !== -1) {
          updatedConversations.splice(existingConversationIndex, 1);
        }
        updatedConversations.unshift(updatedConversation);
      }

      return updatedConversations;
    });
  }, []);

  return { conversations, updateConversationList, isLoading, error };
};
