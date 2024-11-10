import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Package2, Truck, User, Calendar, Receipt, Store } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare } from 'lucide-react'

interface OrderDetailsProps {
  orderSn: string
  isOpen: boolean
  onClose: () => void
}

interface OrderItem {
  item_id: number
  item_sku: string
  model_id: number
  image_url: string
  item_name: string
  model_sku: string
  model_name: string
  order_item_id: number
  model_original_price: number
  model_discounted_price: number
  model_quantity_purchased: number
}

interface OrderDetail {
  order_sn: string
  shop_name: string
  buyer_username: string
  pay_time: number
  total_amount: number
  shipping_carrier: string
  tracking_number: string
  order_status: string
  order_items: OrderItem[]
  total_belanja: number
  cancel_reason?: string
}

// Tambahkan fungsi untuk menentukan variant badge
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'SHIPPED':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100'
    case 'COMPLETED':
      return 'bg-green-100 text-green-800 hover:bg-green-100'
    case 'IN_CANCEL':
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 hover:bg-red-100'
    case 'READY_TO_SHIP':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100'
  }
}

// Tambahkan interface untuk chat
interface ChatMessage {
  id: string
  sender: string
  message: string
  timestamp: number
}

export function OrderDetails({ orderSn, isOpen, onClose }: OrderDetailsProps) {
  const [orderDetails, setOrderDetails] = useState<OrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderSn || !isOpen) {
        setOrderDetails(null)
        return
      }
      
      setIsLoading(true)
      try {
        const response = await axios.get(`/api/order_details?order_sn=${orderSn}`)
        setOrderDetails(response.data.data[0])
      } catch (error) {
        console.error('Error fetching order details:', error)
        setOrderDetails(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrderDetails()
  }, [orderSn, isOpen])

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[90%] md:w-[600px]">
        <SheetHeader className="mb-5">
          <SheetTitle className="text-lg font-bold">
            Detail Pesanan
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="details" className="text-[11px] md:text-sm">Detail Pesanan</TabsTrigger>
            <TabsTrigger value="chat" className="text-[11px] md:text-sm">Riwayat Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <ScrollArea className="h-[calc(100vh-180px)] pr-4">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : orderDetails ? (
                <div className="space-y-6">
                  {/* Nomor Pesanan */}
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <h3 className="text-[11px] md:text-base font-semibold flex items-center gap-2">
                      
                        {orderDetails.order_sn}
                      </h3>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] md:text-sm ${getStatusBadgeVariant(orderDetails.order_status)}`}
                      >
                        {orderDetails.order_status}
                      </Badge>
                    </div>
                    {orderDetails.order_status === 'IN_CANCEL' || orderDetails.order_status === 'CANCELLED' ? (
                      <div className="mt-2">
                        <p className="text-[10px] md:text-sm font-medium text-red-600">
                          {orderDetails.cancel_reason || 'Tidak ada alasan yang diberikan'}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  {/* Informasi Toko & Pembeli */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Store className="h-4 w-4 mt-1" />
                      <div>
                        <p className="text-sm font-medium">Toko</p>
                        <p className="text-sm text-muted-foreground">{orderDetails.shop_name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 mt-1" />
                      <div>
                        <p className="text-sm font-medium">Pembeli</p>
                        <p className="text-sm text-muted-foreground">{orderDetails.buyer_username}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 mt-1" />
                      <div>
                        <p className="text-sm font-medium">Tanggal Pembayaran</p>
                        <p className="text-sm text-muted-foreground">{formatDate(orderDetails.pay_time)}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Truck className="h-4 w-4 mt-1" />
                      <div>
                        <p className="text-sm font-medium">Informasi Pengiriman</p>
                        <p className="text-sm text-muted-foreground">
                          {orderDetails.shipping_carrier} - {orderDetails.tracking_number}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Detail Produk */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Package2 className="h-4 w-4" />
                      Detail Produk
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px] md:text-xs">Produk</TableHead>
                            <TableHead className="text-[10px] md:text-xs">Varian</TableHead>
                            <TableHead className="text-[10px] md:text-xs text-right">Harga</TableHead>
                            <TableHead className="text-[10px] md:text-xs text-center">Qty</TableHead>
                            <TableHead className="text-[10px] md:text-xs text-right">Subtotal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderDetails?.order_items && orderDetails.order_items.length > 0 ? (
                            orderDetails.order_items.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-[10px] md:text-xs w-full overflow-hidden text-ellipsis whitespace-nowrap">
                                  <div>
                                    
                                    <p className="text-[10px] md:text-xs">{item.item_sku}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-[10px] md:text-xs whitespace-nowrap">{item.model_name}</TableCell>
                                <TableCell className="text-[10px] md:text-xs text-right whitespace-nowrap">
                                  Rp {item.model_discounted_price.toLocaleString('id-ID')}
                                </TableCell>
                                <TableCell className="text-[10px] md:text-xs text-center whitespace-nowrap">{item.model_quantity_purchased}</TableCell>
                                <TableCell className="text-[10px] md:text-xs text-right whitespace-nowrap">
                                  Rp {(item.model_discounted_price * item.model_quantity_purchased).toLocaleString('id-ID')}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4 text-[10px] md:text-sm text-gray-500">
                                Tidak ada data produk
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="bg-muted p-4 rounded-lg mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] md:text-base font-semibold">Total Pembayaran</span>
                      <span className="text-[12px] md:text-base font-semibold">
                        Rp {orderDetails.total_belanja?.toLocaleString('id-ID') || '0'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Data tidak ditemukan
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chat">
            <ScrollArea className="h-[calc(100vh-180px)] pr-4">
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <MessageSquare className="h-4 w-4 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-medium">{message.sender}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(message.timestamp)}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">{message.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Tidak ada riwayat chat
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
} 