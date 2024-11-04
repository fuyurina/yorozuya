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
}

export function OrderDetails({ orderSn, isOpen, onClose }: OrderDetailsProps) {
  const [orderDetails, setOrderDetails] = useState<OrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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
      <SheetContent className="sm:max-w-[600px]">
        <SheetHeader className="mb-5">
          <SheetTitle className="text-lg font-bold">
            Detail Pesanan
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)] pr-4">
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
                <h3 className="font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  {orderDetails.order_sn}
                </h3>
                <Badge variant="outline" className="mt-2">
                  {orderDetails.order_status}
                </Badge>
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
                        <TableHead className="text-xs">Produk</TableHead>
                        <TableHead className="text-xs">Varian</TableHead>
                        <TableHead className="text-xs text-right">Harga</TableHead>
                        <TableHead className="text-xs text-center">Qty</TableHead>
                        <TableHead className="text-xs text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderDetails?.order_items && orderDetails.order_items.length > 0 ? (
                        orderDetails.order_items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-xs">
                              <div>
                                <p>{item.item_name}</p>
                                <p className="text-muted-foreground">{item.item_sku}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">{item.model_name}</TableCell>
                            <TableCell className="text-xs text-right">
                              Rp {item.model_discounted_price.toLocaleString('id-ID')}
                            </TableCell>
                            <TableCell className="text-xs text-center">{item.model_quantity_purchased}</TableCell>
                            <TableCell className="text-xs text-right">
                              Rp {(item.model_discounted_price * item.model_quantity_purchased).toLocaleString('id-ID')}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-sm text-gray-500">
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
                  <span className="font-semibold">Total Pembayaran</span>
                  <span className="font-semibold">
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
      </SheetContent>
    </Sheet>
  )
} 