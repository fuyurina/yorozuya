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

  if (loading) return <div>Memuat data...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Data Perubahan Pesanan</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {perubahanPesanan.map((order) => (
          <Card key={order.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="p-4 bg-gray-50">
              <CardTitle className="text-sm font-medium text-gray-700 flex justify-between items-center">
                <span>No. Invoice: {order.nomor_invoice || 'N/A'}</span>
                <MessageSquare 
                  className="h-5 w-5 text-blue-500 hover:text-blue-600 cursor-pointer transition-colors duration-200" 
                  onClick={() => handleChatClick(order)}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-semibold text-gray-800">{order.nama_toko}</p>
                <p className="text-xs text-gray-500">ID: {order.id_pengguna}</p>
              </div>
              
              <div className="flex space-x-3 mb-3">
                <div className="bg-gray-100 p-3 rounded-md flex-1">
                  <h3 className="font-semibold text-xs mb-2 text-gray-700">Perubahan:</h3>
                  {order.perubahan && Object.keys(order.perubahan).length > 0 ? (
                    Object.entries(order.perubahan).map(([key, value]) => (
                      <p key={key} className="text-xs mb-1">
                        <span className="font-medium text-gray-600">{key}:</span>{' '}
                        <span className="text-blue-600">{JSON.stringify(value)}</span>
                      </p>
                    ))
                  ) : (
                    <span className="text-gray-400 italic text-xs">Tidak ada perubahan</span>
                  )}
                </div>
                <div className="bg-gray-100 p-3 rounded-md flex-1">
                  <h3 className="font-semibold text-xs mb-2 text-gray-700">Detail:</h3>
                  <p className="text-xs">{order.detail_perubahan || 'Tidak ada detail'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <p>Dibuat: {new Date(order.created_at).toLocaleString()}</p>
                <Badge variant="outline" className="font-semibold">{order.status_pesanan}</Badge>
              </div>
            </CardContent>
            <CardFooter className="p-4 bg-gray-50 flex justify-between items-center">
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
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedOrder?.nomor_invoice} - {selectedOrder?.nama_toko} - {selectedOrder?.id_pengguna}</DialogTitle>
          </DialogHeader>
          <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4">
            {chats.map((chat) => (
              <div key={chat.id} className={`flex ${chat.sender === 'seller' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${chat.sender === 'seller' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <p className="text-sm">{chat.message}</p>
                  <p className="text-xs text-gray-500 mt-2">{new Date(chat.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="mt-4 flex items-center space-x-2 p-4 border-t">
            <Input
              type="text"
              placeholder="Ketik pesan..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="flex-grow"
              disabled={isLoadingSend}
            />
            <Button type="submit" size="icon" disabled={isLoadingSend}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
