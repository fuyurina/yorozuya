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

  const updateConversationList = useCallback((newMessage: any) => {
    setConversations(prevConversations => {
      const updatedConversations = [...prevConversations];
      const existingConversationIndex = updatedConversations.findIndex(
        conv => conv.conversation_id === newMessage.conversation_id
      );

      const updatedConversation: Conversation = {
        conversation_id: newMessage.conversation_id,
        to_id: newMessage.sender === newMessage.shop_id ? newMessage.receiver : newMessage.sender,
        to_name: newMessage.sender === newMessage.shop_id ? newMessage.receiver_name : newMessage.sender_name,
        to_avatar: "", // Anda mungkin perlu menyimpan atau mengambil avatar dari tempat lain
        to_shop_id: newMessage.sender === newMessage.shop_id ? newMessage.receiver : newMessage.sender,
        shop_id: newMessage.shop_id,
        shop_name: newMessage.sender === newMessage.shop_id ? newMessage.sender_name : newMessage.receiver_name,
        latest_message_content: {
          text: newMessage.content
        },
        last_message_timestamp: newMessage.timestamp * 1000000, // Konversi ke mikrodetik
        unread_count: 1 // Tambahkan 1 untuk pesan baru
        ,
        pinned: false,
        last_read_message_id: '',
        latest_message_id: '',
        latest_message_type: '',
        latest_message_from_id: 0,
        last_message_option: 0,
        max_general_option_hide_time: '',
        mute: false
      };

      if (existingConversationIndex !== -1) {
        const existingConversation = updatedConversations[existingConversationIndex];
        updatedConversation.unread_count = existingConversation.unread_count + 1;
        updatedConversations.splice(existingConversationIndex, 1);
        updatedConversations.unshift(updatedConversation);
      } else {
        updatedConversations.unshift(updatedConversation);
      }

      return updatedConversations;
    });
  }, []);

  return { conversations, updateConversationList, isLoading, error };
};
