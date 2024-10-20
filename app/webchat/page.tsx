'use client'
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useConversationList } from '@/app/hooks/useWebchat';
import { useConversationMessages } from '@/app/hooks/useGetMessage';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Phone, Video, User, CheckCircle2, ChevronLeft, Filter } from "lucide-react"
import { useSendMessage } from '@/app/hooks/useSendMessage';
import { useSSE } from '@/app/hooks/useSSE';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedShop(conversation.shop_id);
    setSelectedConversation(conversation.conversation_id);
    if (isMobileView) {
      setShowConversationList(false);
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
        statusFilter === 'BELUM DIBALAS' ? (conversation.latest_message_content?.text && conversation.to_id !== conversation.shop_id) : true;

      return matchesSearch && matchesShopFilter && matchesStatusFilter;
    });
  }, [conversations, searchQuery, selectedShops, statusFilter]);

  const uniqueShops = useMemo(() => {
    const shops = new Set(conversations.map(conv => conv.shop_id));
    return Array.from(shops);
  }, [conversations]);

  return (
    <div className="flex h-full w-full overflow-hidden">
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
                <TabsTrigger value="SEMUA">Semua</TabsTrigger>
                <TabsTrigger value="BELUM DIBACA">Belum Dibaca</TabsTrigger>
                <TabsTrigger value="BELUM DIBALAS">Belum Dibalas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-grow overflow-y-auto">
            <div className="p-3">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.conversation_id}
                  className={`flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer ${
                    selectedConversation === conversation.conversation_id ? 'bg-muted/50' : ''
                  }`}
                  onClick={() => handleConversationSelect(conversation)}
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
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Area Chat */}
      {(!isMobileView || (isMobileView && !showConversationList)) && (
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Header Chat */}
          <div className="p-4 border-b flex items-center sticky top-0 bg-background z-10">
            {isMobileView && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowConversationList(true)}
                className="mr-2 md:hidden"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}
            {selectedConversation && selectedConversationData ? (
              <>
                <div className="flex items-center gap-3 overflow-hidden flex-grow">
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
              </>
            ) : (
              <p className="text-muted-foreground">Pilih percakapan untuk memulai chat</p>
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
      )}
    </div>
  );
};

export default WebChatPage;
