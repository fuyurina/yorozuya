import { useState, useEffect } from 'react';
import axios from 'axios';

interface Message {
  id: string;
  sender: 'buyer' | 'seller';
  content: string;
  time: string;
}

export function useConversationMessages(conversationId: string | null, shopId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get(`/api/msg/get_message`, {
          params: {
            conversationId,
            shopId,
            pageSize: 25
          }
        });
        const formattedMessages = response.data.response.messages.map((msg: any) => ({
          id: msg.message_id,
          sender: msg.from_shop_id === shopId ? 'seller' : 'buyer',
          content: msg.content.text,
          time: new Date(msg.created_timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(formattedMessages.reverse());
        setNextOffset(response.data.response.page_result.next_offset);
      } catch (err) {
        setError('Gagal mengambil pesan');
        console.error('Error fetching messages:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [conversationId, shopId]);

  const loadMoreMessages = async () => {
    if (!conversationId || !nextOffset) return;

    setIsLoading(true);
    try {
      const response = await axios.get(`/api/msg/get_message`, {
        params: {
          conversationId,
          shopId,
          pageSize: 25,
          offset: nextOffset
        }
      });
      const newMessages = response.data.response.messages.map((msg: any) => ({
        id: msg.message_id,
        sender: msg.from_shop_id === shopId ? 'seller' : 'buyer',
        content: msg.content.text,
        time: new Date(msg.created_timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setMessages(prevMessages => [...newMessages.reverse(), ...prevMessages]);
      setNextOffset(response.data.response.page_result.next_offset);
    } catch (err) {
      setError('Gagal memuat pesan tambahan');
      console.error('Error loading more messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = (newMessage: Message) => {
    setMessages(prevMessages => [...prevMessages, newMessage]);
  };

  return { messages, isLoading, error, sendMessage, loadMoreMessages, hasMoreMessages: !!nextOffset };
}
