'use client'
import React, { useState, useEffect, useRef } from 'react';
import { useConversationList } from '@/app/hooks/useWebchat';
import { useConversationMessages } from '@/app/hooks/useGetMessage';
import { useSendMessage } from '@/app/hooks/useSendMessage';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Phone, Video, User, CheckCircle2 } from "lucide-react"
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

interface Message {
  id: string;
  sender: 'buyer' | 'seller';
  content: string;
  time: string;
}

const WebChatPage: React.FC = () => {
  const [selectedShop, setSelectedShop] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { conversations, isLoading: isLoadingConversations, error: conversationsError } = useConversationList();
  const { 
    messages, 
    isLoading: isLoadingMessages, 
    error: messagesError, 
    sendMessage, 
    loadMoreMessages, 
    hasMoreMessages 
  } = useConversationMessages(selectedConversation, selectedShop || 0);
  const { sendMessage: sendMessageApi, isLoading: isSendingMessage, error: sendMessageError } = useSendMessage();
  const { lastMessage, isConnected } = useSSE('/api/webhook');

  const selectedConversationData = conversations.find(conv => conv.conversation_id === selectedConversation);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (lastMessage) {
      const newMessage = JSON.parse(lastMessage);
      if (newMessage.conversation_id === selectedConversation) {
        const formattedMessage: Message = {
          id: newMessage.message_id,
          sender: newMessage.from_id === selectedConversationData?.to_id ? 'buyer' : 'seller',
          content: newMessage.content.text,
          time: new Date(newMessage.created_timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        sendMessage(formattedMessage);
      }
    }
  }, [lastMessage, selectedConversation, selectedConversationData]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() !== '' && selectedConversation && selectedConversationData) {
      try {
        const response = await sendMessageApi({
          toId: selectedConversationData.to_id,
          content: inputMessage,
          shopId: selectedConversationData.shop_id,
        });
        
        const newMessage: Message = {
          id: response.message_id,
          sender: 'seller',
          content: inputMessage,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        
        sendMessage(newMessage);
        setInputMessage('');
      } catch (error) {
        console.error('Gagal mengirim pesan:', error);
      }
    }
  };

  // Pindahkan indikator koneksi ke dalam komponen utama
  const connectionStatus = isConnected ? (
    <div className="text-green-500 text-sm">Terhubung</div>
  ) : (
    <div className="text-red-500 text-sm">Terputus</div>
  );

  if (isLoadingConversations) {
    return <div>Memuat daftar percakapan...</div>;
  }

  if (conversationsError) {
    return <div>Error: {conversationsError}</div>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Daftar Percakapan */}
      <div className="w-1/4 min-w-[250px] max-w-xs border-r bg-muted/20 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Percakapan</h2>
          {connectionStatus} {/* Tambahkan indikator koneksi di sini */}
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
            {isLoadingMessages ? (
              <div>Memuat pesan...</div>
            ) : messagesError ? (
              <div>Error: {messagesError}</div>
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
          <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
            <Input
              placeholder="Ketik pesan..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 min-w-0"
              disabled={isSendingMessage}
            />
            <Button type="submit" className="flex-shrink-0" disabled={isSendingMessage}>
              <Send className="h-4 w-4 mr-2" />
              {isSendingMessage ? 'Mengirim...' : 'Kirim'}
            </Button>
          </form>
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
