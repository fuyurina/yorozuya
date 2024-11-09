'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useConversationList } from '@/app/hooks/useWebchat';
import { useConversationMessages } from '@/app/hooks/useGetMessage';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Phone, Video, User, CheckCircle2, ChevronLeft, Filter, ShoppingBag } from "lucide-react"
import { useSendMessage } from '@/app/hooks/useSendMessage';

import { useSSE } from '@/app/hooks/useSSE';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMarkAsRead } from '@/app/hooks/useMarkAsRead';

interface Conversation {
  conversation_id: string;
  to_id: number;
  to_name: string;
  to_avatar: string;
  to_shop_id: number;
  shop_id: number;
  shop_name: string;
  latest_message_content: {
    text?: string;
  } | null;
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

// Tambahkan interface untuk props MessageInput
interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isSendingMessage: boolean;
}

// Update komponen dengan type yang sesuai
const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isSendingMessage }) => {
  const [newMessage, setNewMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendMessage(newMessage);
    setNewMessage('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
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
  );
};

const WebChatPage: React.FC = () => {
  const [selectedShop, setSelectedShop] = useState<number | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState(''); // Tambahkan state untuk pesan baru
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShops, setSelectedShops] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'BELUM DIBACA' | 'BELUM DIBALAS'>('SEMUA');
  const [isFullScreenChat, setIsFullScreenChat] = useState(false);

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

  const { markAsRead, isLoading: isMarkingAsRead, error: markAsReadError } = useMarkAsRead();

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileView(isMobile);
      setIsFullScreenChat(isMobile && !showConversationList);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showConversationList]);

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
  }, [sseData, selectedConversation]);

  const handleSendMessage = async (message: string) => {
    if (!selectedConversationData || !message.trim()) return;

    try {
      const sentMessage = await sendMessage({
        toId: selectedConversationData.to_id,
        content: message,
        shopId: selectedConversationData.shop_id,
      });
      
      const newSentMessage: Message = {
        id: sentMessage.data.message_id,
        sender: 'seller',
        content: message,
        time: new Date(sentMessage.data.created_timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      
      setMessages(prevMessages => [...prevMessages, newSentMessage]);
    } catch (error) {
      console.error('Gagal mengirim pesan:', error);
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedShop(conversation.shop_id);
    setSelectedConversation(conversation.conversation_id);
    if (isMobileView) {
      setShowConversationList(false);
      setIsFullScreenChat(true);
    }
    
    // Tandai pesan sebagai dibaca hanya jika unread_count > 0
    if (conversation.unread_count > 0) {
      handleMarkAsRead(conversation.conversation_id);
    }
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(conversation => {
      const matchesSearch = conversation.to_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            conversation.shop_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesShopFilter = selectedShops.length === 0 || selectedShops.includes(conversation.shop_id);
      const matchesStatusFilter = 
        statusFilter === 'SEMUA' ? true :
        statusFilter === 'BELUM DIBACA' ? conversation.unread_count > 0 :
        statusFilter === 'BELUM DIBALAS' ? (conversation.latest_message_content?.text && conversation.to_id == conversation.latest_message_from_id) : true;

      return matchesSearch && matchesShopFilter && matchesStatusFilter;
    });
  }, [conversations, searchQuery, selectedShops, statusFilter]);

  const uniqueShops = useMemo(() => {
    const shops = new Set(conversations.map(conv => conv.shop_id));
    return Array.from(shops);
  }, [conversations]);

  // Fungsi untuk menandai pesan sebagai dibaca
  const handleMarkAsRead = async (conversationId: string) => {
    const conversation = conversations.find(conv => conv.conversation_id === conversationId);
    if (!conversation || conversation.unread_count === 0) return;

    try {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) return;

      await markAsRead({
        shopId: conversation.shop_id,
        conversationId: conversation.conversation_id,
        lastReadMessageId: lastMessage.id,
      });
      // Perbarui state lokal untuk menghapus indikator pesan belum dibaca
      updateConversationList({
        type: 'mark_as_read',
        conversation_id: conversationId,
      });
    } catch (error) {
      console.error('Gagal menandai pesan sebagai dibaca:', error);
    }
  };

  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      const selectedConv = conversations.find(conv => conv.conversation_id === selectedConversation);
      if (selectedConv && selectedConv.unread_count > 0) {
        handleMarkAsRead(selectedConversation);
      }
    }
  }, [selectedConversation, messages]);

  return (
    <div className={`flex h-full w-full overflow-hidden ${isFullScreenChat ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Daftar Percakapan */}
      {(!isMobileView || (isMobileView && showConversationList)) && (
        <div className={`${isMobileView ? 'w-full' : 'w-1/3 md:w-1/4 lg:w-1/5'} border-r bg-muted/20 flex flex-col h-full`}>
          {/* Kolom Pencarian dan Filter */}
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Cari percakapan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-grow"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div>
                    <h4 className="font-medium mb-2">Filter Toko:</h4>
                    {uniqueShops.map(shopId => (
                      <label key={shopId} className="flex items-center mb-1">
                        <input
                          type="checkbox"
                          checked={selectedShops.includes(shopId)}
                          onChange={() => {
                            setSelectedShops(prev =>
                              prev.includes(shopId)
                                ? prev.filter(id => id !== shopId)
                                : [...prev, shopId]
                            );
                          }}
                          className="mr-2"
                        />
                        {conversations.find(conv => conv.shop_id === shopId)?.shop_name}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'SEMUA' | 'BELUM DIBACA' | 'BELUM DIBALAS')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="SEMUA" className="text-xs">Semua</TabsTrigger>
                <TabsTrigger value="BELUM DIBACA" className="text-xs">Belum Dibaca</TabsTrigger>
                <TabsTrigger value="BELUM DIBALAS" className="text-xs">Belum Dibalas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-grow overflow-y-auto">
            <div className="p-3">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.conversation_id}
                  className={`flex items-center gap-2 p-2 hover:bg-muted/50 cursor-pointer ${
                    selectedConversation === conversation.conversation_id ? 'bg-muted/50' : ''
                  } ${isMobileView ? 'text-sm' : ''}`}
                  onClick={() => handleConversationSelect(conversation)}
                >
                  <Avatar className={isMobileView ? 'h-8 w-8' : ''}>
                    <AvatarImage src={conversation.to_avatar} />
                    <AvatarFallback><User className={isMobileView ? 'h-4 w-4' : ''} /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-baseline">
                      <div className="flex items-center">
                        <p className={`font-medium truncate ${isMobileView ? 'text-xs' : ''}`}>{conversation.shop_name}</p>
                        {conversation.unread_count > 0 && (
                          <div className="w-2 h-2 bg-red-500 rounded-full ml-2"></div>
                        )}
                      </div>
                      <p className={`text-muted-foreground ${isMobileView ? 'text-[10px]' : 'text-xs'}`}>
                        {new Date(conversation.last_message_timestamp / 1000000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`font-bold ${isMobileView ? 'text-xs' : 'text-sm'}`}>{conversation.to_name}</p>
                      {conversation.to_id != conversation.latest_message_from_id && conversation.unread_count === 0 && (
                        <CheckCircle2 className={`text-primary ${isMobileView ? 'h-2 w-2' : 'h-3 w-3'}`} />
                      )}
                    </div>
                    <p className={`text-muted-foreground truncate ${isMobileView ? 'text-xs' : 'text-sm'}`}>{conversation.latest_message_content?.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Area Chat */}
      {(!isMobileView || (isMobileView && !showConversationList)) && (
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Header Chat */}
          <div className="p-3 border-b flex items-center sticky top-0 bg-background z-10">
            {isMobileView && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowConversationList(true);
                  setIsFullScreenChat(false);
                }}
                className="mr-2 md:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            {selectedConversation && selectedConversationData ? (
              <>
                <div className="flex items-center gap-2 overflow-hidden flex-grow">
                  <Avatar className={isMobileView ? 'h-8 w-8' : ''}>
                    <AvatarImage src={selectedConversationData.to_avatar} />
                    <AvatarFallback><User className={isMobileView ? 'h-4 w-4' : ''} /></AvatarFallback>
                  </Avatar>
                  <div className="overflow-hidden">
                    <p className={`font-medium truncate ${isMobileView ? 'text-sm' : ''}`}>{selectedConversationData.shop_name}</p>
                    <p className={`font-bold truncate ${isMobileView ? 'text-xs' : 'text-sm'}`}>{selectedConversationData.to_name}</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Button variant="ghost" size="icon">
                    <ShoppingBag className={isMobileView ? 'h-4 w-4' : 'h-5 w-5'} />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Video className={isMobileView ? 'h-4 w-4' : 'h-5 w-5'} />
                  </Button>
                </div>
              </>
            ) : (
              <p className={`text-muted-foreground ${isMobileView ? 'text-sm' : ''}`}>Pilih percakapan untuk memulai chat</p>
            )}
          </div>

          {/* Area Pesan */}
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
            <MessageInput 
              onSendMessage={(message) => handleSendMessage(message)} 
              isSendingMessage={isSendingMessage}
            />
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
      )}
    </div>
  );
};

export default WebChatPage;
