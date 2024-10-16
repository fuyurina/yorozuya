import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface Message {
  id: string;
  sender: 'buyer' | 'seller';
  content: string;
  time: string;
}

export function useConversationMessages(conversationId: string | null, shopId: number) {
  const [messages, setMessagesState] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState<string | null>(null);

  const setMessages = useCallback((updater: (prevMessages: Message[]) => Message[]) => {
    setMessagesState(updater);
  }, []);

  const fetchMessages = useCallback(async (offset?: string) => {
    if (!conversationId) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/msg/get_message?_=${Date.now()}`, {
        params: {
          conversationId,
          shopId,
          pageSize: 25,
          offset
        }
      });
      const formattedMessages = response.data.response.messages.map((msg: any) => ({
        id: msg.message_id,
        sender: msg.from_shop_id === shopId ? 'seller' : 'buyer',
        content: msg.content.text,
        time: new Date(msg.created_timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      
      if (offset) {
        setMessagesState(prevMessages => [...formattedMessages.reverse(), ...prevMessages]);
      } else {
        setMessagesState(formattedMessages.reverse());
      }
      
      setNextOffset(response.data.response.page_result.next_offset);
    } catch (err) {
      setError(offset ? 'Gagal memuat pesan tambahan' : 'Gagal mengambil pesan');
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, shopId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const loadMoreMessages = useCallback(() => {
    if (nextOffset) {
      fetchMessages(nextOffset);
    }
  }, [fetchMessages, nextOffset]);

  const addNewMessage = (newMessage: Message) => {
    setMessages(prevMessages => [...prevMessages, newMessage]);
  };

  return {
    messages,
    setMessages,
    isLoading,
    error,
    loadMoreMessages,
    hasMoreMessages: !!nextOffset,
    addNewMessage
  };
}
