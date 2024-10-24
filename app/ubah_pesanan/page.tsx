'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { useUbahPesanan, PerubahanPesanan } from '@/app/hooks/useUbahPesanan'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, FileText, MessageSquare, Send } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

export default function OrderChangesPage() {
  const { 
    perubahanPesanan, 
    loading, 
    error, 
    updateStatusPesanan, 
    hapusPerubahanPesanan,
    chats,
    sendMessage,
    fetchChats,
    isLoadingSend
  } = useUbahPesanan()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PerubahanPesanan | null>(null)
  const [chatMessage, setChatMessage] = useState('')
  const chatContainerRef = useRef<HTMLDivElement>(null)

  const handleStatusClick = async (order: PerubahanPesanan) => {
    const newStatus = order.status === "BARU" ? "DICATAT" : "BARU"
    await updateStatusPesanan(order.id, newStatus)
  }

  const handleDeleteClick = async (id: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus perubahan pesanan ini?')) {
      await hapusPerubahanPesanan(id)
      toast({
        title: "Perubahan pesanan dihapus",
        description: "Data perubahan pesanan telah berhasil dihapus.",
      })
    }
  }

  const handleChatClick = async (order: PerubahanPesanan) => {
    setSelectedOrder(order)
    setIsDialogOpen(true)
    if (order.msg_id && order.store_id) {
      await fetchChats(order.msg_id.toString(), order.store_id)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedOrder && selectedOrder.store_id && selectedOrder.user_id && selectedOrder.msg_id) {
      try {
        await sendMessage({
          toId: selectedOrder.user_id,
          content: chatMessage,
          shopId: parseInt(selectedOrder.store_id),
          conversationId: selectedOrder.msg_id.toString()
        })
        setChatMessage('')
        // Perbaikan: Gunakan msg_id sebagai conversationId, bukan store_id
        
      } catch (error) {
        toast({
          title: "Gagal mengirim pesan",
          description: "Terjadi kesalahan saat mengirim pesan.",
          variant: "destructive"
        })
      }
    }
  }

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chats])

  if (loading) return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Data Perubahan Pesanan</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <Card key={index} className="overflow-hidden shadow-md">
            <CardHeader className="p-4 bg-gray-50">
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-1/2 mb-3" />
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="flex justify-between items-center mt-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </CardContent>
            <CardFooter className="p-4 bg-gray-50 flex justify-between items-center">
              <Skeleton className="h-8 w-1/4" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
  
  if (error) return <div>Error: {error}</div>

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Data Perubahan Pesanan</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {perubahanPesanan.map((order) => (
          <Card key={order.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 dark:bg-gray-800 dark:text-white flex flex-col">
            <CardHeader className="p-4 bg-gray-50 dark:bg-gray-900">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300 flex justify-between items-center">
                <span>No. Invoice: {order.nomor_invoice || 'N/A'}</span>
                <MessageSquare 
                  className="h-5 w-5 text-blue-500 hover:text-blue-600 cursor-pointer transition-colors duration-200" 
                  onClick={() => handleChatClick(order)}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex-grow dark:bg-gray-800">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{order.nama_toko}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">ID: {order.id_pengguna}</p>
              </div>
              
              <div className="flex space-x-3 mb-3">
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md flex-1">
                  <h3 className="font-semibold text-xs mb-2 text-gray-700 dark:text-gray-300">Perubahan:</h3>
                  {order.perubahan && Object.keys(order.perubahan).length > 0 ? (
                    Object.entries(order.perubahan).map(([key, value]) => (
                      <p key={key} className="text-xs mb-1">
                        <span className="font-medium text-gray-600 dark:text-gray-400">{key}:</span>{' '}
                        <span className="text-blue-600 dark:text-blue-400">{JSON.stringify(value)}</span>
                      </p>
                    ))
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 italic text-xs">Tidak ada perubahan</span>
                  )}
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md flex-1">
                  <h3 className="font-semibold text-xs mb-2 text-gray-700 dark:text-gray-300">Detail:</h3>
                  <p className="text-xs dark:text-gray-200">{order.detail_perubahan || 'Tidak ada detail'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                <p>Dibuat: {new Date(order.created_at).toLocaleString()}</p>
                <Badge variant="outline" className="font-semibold">{order.status_pesanan}</Badge>
              </div>
            </CardContent>
            <CardFooter className="p-4 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
              <Button 
                variant={order.status === "DICATAT" ? "default" : "destructive"}
                size="sm"
                className="flex items-center text-xs py-1 px-3 h-auto min-h-0 transition-colors duration-200"
                onClick={() => handleStatusClick(order)}
              >
                <FileText className="h-3 w-3 mr-2" />
                {order.status}
              </Button>
              <Trash2 
                className="h-5 w-5 text-red-500 hover:text-red-600 cursor-pointer transition-colors duration-200" 
                onClick={() => handleDeleteClick(order.id)}
              />
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] flex flex-col">
          <DialogHeader className="py-2 border-b">
            <DialogTitle className="text-sm flex justify-between items-center">
              <span className="font-medium">{selectedOrder?.nomor_invoice}</span>
              <span className="text-gray-500">
                {selectedOrder?.nama_toko.split(' ')[0]}
              </span>
              <span className="text-xs text-gray-400">ID: {selectedOrder?.id_pengguna}</span>
            </DialogTitle>
          </DialogHeader>
          <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-2 sm:p-4 space-y-3">
            {chats.map((chat) => (
              <div key={chat.id} className={`flex ${chat.sender === 'seller' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-2 sm:p-3 rounded-lg ${chat.sender === 'seller' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <p className="text-xs sm:text-sm">{chat.message}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">{new Date(chat.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="mt-2 flex items-center space-x-2 p-2 sm:p-4 border-t">
            <Input
              type="text"
              placeholder="Ketik pesan..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="flex-grow text-sm"
              disabled={isLoadingSend}
            />
            <Button type="submit" size="sm" disabled={isLoadingSend}>
              <Send className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
