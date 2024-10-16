'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useConversationList } from '@/app/hooks/useWebchat';
import { useConversationMessages } from '@/app/hooks/useGetMessage';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Phone, Video, User, CheckCircle2 } from "lucide-react"
import { useSendMessage } from '@/app/hooks/useSendMessage';
import { useSSE } from '@/app/hooks/useSSE';

interface Conversation {
  conversation_id: string;
  to_id: number;
  to_name: string;
  to_avatar: string;
  to_shop_id: number;
  shop_id: number;
  shop_name: string;
  latest_message_content: {
    text: string;
  };
  last_message_timestamp: number;
  unread_count: number; // Tambahkan properti ini
}

// Hapus interface Message karena tidak digunakan
interface Message {
  id: string;
  sender: 'buyer' | 'seller';
  content: string;
  time: string;
}

const WebChatPage: React.FC = () => {
  const [selectedShop, setSelectedShop] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState(''); // Tambahkan state untuk pesan baru
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { conversations, updateConversationList } = useConversationList();
  const { 
    messages, 
    setMessages, 
    isLoading, 
    error, 
    loadMoreMessages, 
    hasMoreMessages,
    addNewMessage 
  } = useConversationMessages(selectedConversation, selectedShop || 0);

  const selectedConversationData = useMemo(() => 
    conversations.find(conv => conv.conversation_id === selectedConversation),
    [conversations, selectedConversation]
  );

  const { sendMessage, isLoading: isSendingMessage, error: sendMessageError } = useSendMessage();

  const { data: sseData, error: sseError } = useSSE('api/webhook'); // Ganti dengan URL SSE yang sesuai

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Ubah useEffect untuk memperbarui daftar percakapan
  useEffect(() => {
    if (sseData && sseData.type === 'new_message') {
      console.log('Pesan baru diterima:', sseData);
      updateConversationList(sseData);
    }
  }, [sseData]); // Hapus updateConversationList dari dependency array

  // Ubah useEffect untuk memperbarui pesan dalam percakapan yang dipilih
  useEffect(() => {
    if (sseData && sseData.type === 'new_message' && sseData.conversation_id === selectedConversation) {
      const newMessage: Message = {
        id: sseData.message_id,
        sender: sseData.sender === selectedConversationData?.to_id ? 'buyer' : 'seller',
        content: sseData.content,
        time: new Date(sseData.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addNewMessage(newMessage);
    }
  }, [sseData, selectedConversation]); // Hapus selectedConversationData dan addNewMessage dari dependency array

  const handleSendMessage = async () => {
    if (!selectedConversationData || !newMessage.trim()) return;

    try {
      const sentMessage = await sendMessage({
        toId: selectedConversationData.to_id,
        content: newMessage,
        shopId: selectedConversationData.shop_id,
      });
      
      // Tambahkan pesan yang berhasil dikirim ke daftar pesan
      const newSentMessage: Message = {
        id: sentMessage.data.message_id,
        sender: 'seller',
        content: newMessage,
        time: new Date(sentMessage.data.created_timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      
      // Update state messages dengan pesan baru
      setMessages(prevMessages => [...prevMessages, newSentMessage]);
      
      // Reset input setelah mengirim
      setNewMessage('');
    } catch (error) {
      console.error('Gagal mengirim pesan:', error);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Daftar Percakapan */}
      <div className="w-1/4 min-w-[250px] max-w-xs border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Percakapan</h2>
        </div>
        <ScrollArea className="flex-grow">
          {conversations.map((conversation) => (
            <div
              key={conversation.conversation_id}
              className={`flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer ${
                selectedConversation === conversation.conversation_id ? 'bg-muted/50' : ''
              }`}
              onClick={() => {
                setSelectedShop(conversation.shop_id);
                setSelectedConversation(conversation.conversation_id);
              }}
            >
              <Avatar>
                <AvatarImage src={conversation.to_avatar} />
                <AvatarFallback><User /></AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <div className="flex justify-between items-baseline">
                  <div className="flex items-center">
                    <p className="font-medium truncate">{conversation.shop_name}</p>
                    {conversation.unread_count > 0 && (
                      <div className="w-2 h-2 bg-red-500 rounded-full ml-2"></div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conversation.last_message_timestamp / 1000000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-bold">{conversation.to_name}</p>
                  {conversation.to_id != conversation.shop_id && (
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{conversation.latest_message_content?.text}</p>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Area Chat */}
      {selectedConversation && selectedConversationData ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header Chat */}
          <div className="p-4 border-b flex justify-between items-center">
            <div className="flex items-center gap-3 overflow-hidden">
              <Avatar>
                <AvatarImage src={selectedConversationData.to_avatar} />
                <AvatarFallback><User /></AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <p className="font-medium truncate">{selectedConversationData.shop_name}</p>
                <p className="text-sm font-bold truncate">{selectedConversationData.to_name}</p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Button variant="ghost" size="icon">
                <Phone className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Video className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Pesan-pesan */}
          <ScrollArea className="flex-grow p-4">
            {isLoading ? (
              <div>Memuat pesan...</div>
            ) : error ? (
              <div>Error: {error}</div>
            ) : (
              <>
                {hasMoreMessages && (
                  <Button onClick={loadMoreMessages} variant="outline" className="mb-4 w-full">
                    Muat pesan sebelumnya
                  </Button>
                )}
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === 'seller' ? 'justify-end' : 'justify-start'} mb-4`}>
                    <div className={`max-w-[70%] rounded-lg p-3 ${message.sender === 'seller' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <p className="break-words">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">{message.time}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </ScrollArea>

          {/* Area Input */}
          <div className="p-4 border-t">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
              <Input
                type="text"
                placeholder="Ketik pesan..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-grow"
                disabled={isSendingMessage}
              />
              <Button type="submit" disabled={!newMessage.trim() || isSendingMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {sendMessageError && (
              <p className="text-red-500 text-sm mt-2">{sendMessageError}</p>
            )}
            {sseError && (
              <div className="text-red-500 text-sm p-2">
                Error SSE: {sseError}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Pilih percakapan untuk memulai chat</p>
        </div>
      )}
    </div>
  );
};

export default WebChatPage;
