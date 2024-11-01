'use client'

import { useState } from 'react'
import useOtpOrder from '@/app/hooks/useOtpOrder'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Copy, CheckCircle, InboxIcon } from 'lucide-react'
import { motion } from "framer-motion"

export default function OtpPage() {
  const { loading, error, orderOtp, activeOrders, cancelOrder, copyToClipboard, copiedState, canCancelOrder } = useOtpOrder()
  const [cancelLoadingIds, setCancelLoadingIds] = useState<Set<number>>(new Set())

  const formatExpiredTime = (remainTime: string) => {
    const minutes = parseInt(remainTime)
    if (minutes <= 0) {
      return 'Kadaluarsa'
    }
    return `${minutes} menit`
  }

  const handleSetStatus = async (id: number, status: number) => {
    setCancelLoadingIds(prev => new Set(prev).add(id))
    try {
      await cancelOrder(id.toString(), status)
    } finally {
      setCancelLoadingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  return (
    <div className="container max-w-5xl mx-auto px-6 py-6 space-y-6">
      <Card>
        {error && (
          <div className="mx-6 mt-6 p-3 bg-destructive/10 text-destructive rounded-md">
            {error}
          </div>
        )}

        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Yorozuya OTP Service</h2>
              <Button 
                onClick={orderOtp} 
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Memproses...' : 'Pesan Nomor Baru'}
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="hidden md:table-cell w-[80px] font-semibold">ID</TableHead>
                    <TableHead className="w-[180px] font-semibold">Nomor</TableHead>
                    <TableHead className="hidden md:table-cell w-[150px] font-semibold">Layanan</TableHead>
                    <TableHead className="hidden md:table-cell w-[120px] font-semibold">Status</TableHead>
                    <TableHead className="text-center w-[180px] font-semibold">OTP</TableHead>
                    <TableHead className="hidden md:table-cell w-[120px] font-semibold">Kadaluarsa</TableHead>
                    <TableHead className="w-[150px] font-semibold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeOrders.length > 0 ? (
                    activeOrders.map((order) => (
                      <TableRow 
                        key={order.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <TableCell className="hidden md:table-cell">{order.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="font-medium">{order.number}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(order.number, order.id, 'nomor')}
                            >
                              {copiedState?.id === order.id && copiedState?.type === 'nomor' ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <div className="md:hidden mt-1">
                            <motion.div
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 200, damping: 10 }}
                            >
                              <Badge variant={
                                order.status.toLowerCase() === 'otp diterima' ? 'success' :
                                order.status.toLowerCase() === 'expired' ? 'destructive' :
                                order.status.toLowerCase() === 'canceled' ? 'secondary' :
                                order.status.toLowerCase() === 'ready' ? 'warning' :
                                'warning'
                              }>
                                {order.status.toLowerCase() === 'otp diterima' ? 'Success' : order.status}
                              </Badge>
                            </motion.div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{order.service_name}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 10 }}
                          >
                            <Badge variant={
                              order.status.toLowerCase() === 'otp diterima' ? 'success' :
                              order.status.toLowerCase() === 'expired' ? 'destructive' :
                              order.status.toLowerCase() === 'canceled' ? 'secondary' :
                              order.status.toLowerCase() === 'ready' ? 'warning' :
                              'warning'
                            }>
                              {order.status.toLowerCase() === 'otp diterima' ? 'Success' : order.status}
                            </Badge>
                          </motion.div>
                        </TableCell>
                        <TableCell className="text-center">
                          {order.status.toLowerCase() === 'ready' ? (
                            <motion.div 
                              className="flex justify-center space-x-1"
                              initial={{ opacity: 0.5 }}
                              animate={{ opacity: 1 }}
                              transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                            >
                              {[1, 2, 3].map((i) => (
                                <motion.div
                                  key={i}
                                  className="w-1.5 h-1.5 rounded-full bg-yellow-500"
                                  initial={{ y: 0 }}
                                  animate={{ y: [-2, 2, -2] }}
                                  transition={{
                                    repeat: Infinity,
                                    duration: 1,
                                    delay: i * 0.2,
                                    ease: "easeInOut"
                                  }}
                                />
                              ))}
                            </motion.div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-bold text-green-600">{order.otp}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyToClipboard(order.otp, order.id, 'otp')}
                              >
                                {copiedState?.id === order.id && copiedState?.type === 'otp' ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : order.status.toLowerCase() === 'otp diterima' && (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          )}
                          <div className="md:hidden mt-1 text-sm text-muted-foreground">
                            {formatExpiredTime(order.remain_time)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className={parseInt(order.remain_time) <= 0 ? 'text-destructive' : ''}>
                            {formatExpiredTime(order.remain_time)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {order.status.toLowerCase() !== 'canceled' && 
                           order.status.toLowerCase() !== 'expired' && (
                            <div className="flex flex-col md:flex-row gap-2">
                              {order.status.toLowerCase() === 'otp diterima' ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleSetStatus(parseInt(order.id), 4)}
                                    disabled={cancelLoadingIds.has(parseInt(order.id))}
                                  >
                                    {cancelLoadingIds.has(parseInt(order.id)) && (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Selesai
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                    onClick={() => handleSetStatus(parseInt(order.id), 3)}
                                    disabled={cancelLoadingIds.has(parseInt(order.id))}
                                  >
                                    {cancelLoadingIds.has(parseInt(order.id)) && (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Resend
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleSetStatus(parseInt(order.id), 2)}
                                  disabled={cancelLoadingIds.has(parseInt(order.id)) || parseInt(order.remain_time) > 17}
                                >
                                  {cancelLoadingIds.has(parseInt(order.id)) && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  )}
                                  Batalkan
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-[400px] text-center">
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-col items-center justify-center text-muted-foreground"
                        >
                          <InboxIcon className="h-16 w-16 mb-4 opacity-20" />
                          <p className="font-medium text-lg">Tidak ada pesanan aktif</p>
                          <p className="text-sm mt-1">Silakan pesan nomor OTP baru untuk memulai</p>
                        </motion.div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
