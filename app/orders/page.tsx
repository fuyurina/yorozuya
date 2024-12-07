'use client'
import { useOrders } from '@/app/hooks/useOrders'
import type { Order } from '@/app/hooks/useOrders'
import { useState, useEffect } from 'react'
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { id } from 'date-fns/locale'
import { cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Package, Clock, Truck, XCircle, ShoppingCart, XOctagon, Search } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Store } from "lucide-react"
import { useOrderSearch } from '@/app/hooks/useOrderSearch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

interface OrderStatusCardProps {
  title: string
  count: number
  icon: 'pending' | 'process' | 'shipping' | 'cancel' | 'total' | 'failed'
  onClick: () => void
  isActive: boolean
}

function OrderStatusCard({ title, count, icon, onClick, isActive }: OrderStatusCardProps) {
  const getIcon = () => {
    switch (icon) {
      case 'pending':
        return <Clock className="w-5 h-5" />
      case 'process':
        return <Package className="w-5 h-5" />
      case 'shipping':
        return <Truck className="w-5 h-5" />
      case 'cancel':
        return <XCircle className="w-5 h-5" />
      case 'total':
        return <ShoppingCart className="w-5 h-5" />
      case 'failed':
        return <XOctagon className="w-5 h-5" />
      default:
        return null
    }
  }

  const getActiveColors = () => {
    switch (icon) {
      case 'pending':
        return 'bg-yellow-500 text-white'
      case 'process':
        return 'bg-blue-500 text-white'
      case 'shipping':
        return 'bg-green-500 text-white'
      case 'cancel':
        return 'bg-red-500 text-white'
      case 'total':
        return 'bg-purple-500 text-white'
      case 'failed':
        return 'bg-orange-500 text-white'
      default:
        return 'bg-background'
    }
  }

  return (
    <Card 
      className={`transition-all duration-300 cursor-pointer ${
        isActive 
          ? `${getActiveColors()} shadow-lg scale-[1.02]` 
          : 'hover:bg-muted/50 hover:scale-[1.02]'
      }`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className={`text-sm font-medium ${isActive ? 'text-white/80' : 'text-muted-foreground'}`}>
              {title}
            </p>
            <p className={`text-2xl font-bold tracking-tight ${isActive ? 'text-white' : ''}`}>
              {count}
            </p>
          </div>
          <div className={`p-2.5 rounded-xl ${
            isActive 
              ? 'bg-white/20' 
              : `bg-background ${
                  icon === 'pending' ? 'text-yellow-500' :
                  icon === 'process' ? 'text-blue-500' :
                  icon === 'shipping' ? 'text-green-500' :
                  icon === 'cancel' ? 'text-red-500' :
                  icon === 'total' ? 'text-purple-500' :
                  'text-orange-500'
                }`
          }`}>
            {getIcon()}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default function OrdersPage() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  })
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(date)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
 
  const [selectedShops, setSelectedShops] = useState<string[]>([])
  const [isShopFilterOpen, setIsShopFilterOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchType, setSearchType] = useState("order_sn")
  const { orders, loading: ordersLoading, error: ordersError } = useOrders(selectedDateRange)
  const { 
    searchResults, 
    loading: searchLoading, 
    searchOrders, 
    clearSearch 
  } = useOrderSearch()

  const handleDateSelect = (dateRange: DateRange | undefined) => {
    setDate(dateRange)
  }

  const handleApplyDate = () => {
    setSelectedDateRange(date)
    setIsCalendarOpen(false)
  }

  const handlePresetDate = (days: number) => {
    const now = new Date()
    let from: Date
    let to: Date

    if (days === -1) {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    } else if (days === -2) {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      to = new Date(now.getFullYear(), now.getMonth(), 0)
    } else if (days === 1) {
      from = new Date(now)
      from.setDate(now.getDate() - 1)
      to = new Date(from)
    } else {
      to = new Date(now)
      from = new Date(now)
      from.setDate(now.getDate() - days)
    }
    
    from.setHours(0, 0, 0, 0)
    to.setHours(23, 59, 59, 999)
    
    const newDateRange = { from, to }
    setDate(newDateRange)
    setSelectedDateRange(newDateRange)
    setIsCalendarOpen(false)
  }

  // Hitung jumlah pesanan berdasarkan status
  const orderStats = orders.reduce((acc, order) => {
    if (order.cancel_reason === 'Failed Delivery') {
      acc.failed++
    } else {
      switch (order.order_status) {
        case 'UNPAID':
          acc.pending++
          acc.total++
          break
        case 'PROCESSED':
          acc.process++
          acc.total++
          break
        case 'SHIPPED':
          acc.shipping++
          acc.total++
          break
        case 'COMPLETED':
          acc.total++
          break
        case 'IN_CANCEL':
          acc.total++
          break
        case 'TO_CONFIRM_RECEIVE':
          acc.total++
          break
        case 'CANCELLED':
          acc.cancel++
          break
      }
    }
    return acc
  }, {
    pending: 0,
    process: 0,
    shipping: 0,
    cancel: 0,
    total: 0,
    failed: 0
  })

  // Filter orders berdasarkan status, toko, dan pencarian
  const filteredOrders = (searchQuery ? searchResults : orders)
    .filter(order => {
      if (!activeFilter) return true
      
      if (activeFilter === 'failed') {
        return order.cancel_reason === 'Failed Delivery'
      }
      
      switch (activeFilter) {
        case 'pending':
          return order.order_status === 'UNPAID'
        case 'process':
          return order.order_status === 'PROCESSED'
        case 'shipping':
          return order.order_status === 'SHIPPED'
        case 'cancel':
          return order.order_status === 'CANCELLED'
        case 'total':
          if (order.cancel_reason === 'Failed Delivery') return false
          return !['CANCELLED'].includes(order.order_status)
        default:
          return true
      }
    })
    .filter(order => {
      if (selectedShops.length === 0) return true
      return selectedShops.includes(order.shop_name)
    })

  // Dapatkan daftar unik toko dari orders
  const uniqueShops = Array.from(new Set(orders.map(order => order.shop_name))).sort()

  // Tambah handler untuk pencarian
  const handleSearch = () => {
    if (searchQuery.trim()) {
      setIsSearching(true)
      const searchParams = {
        [searchType]: searchQuery
      }
      searchOrders(searchParams)
    } else {
      setIsSearching(false)
      clearSearch()
    }
  }

  // Handler untuk keypress
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  if (ordersLoading) return <div className="container mx-auto p-4">Memuat...</div>
  if (ordersError) return <div className="container mx-auto p-4 text-red-500">{ordersError}</div>

  return (
    <div className="w-full p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <OrderStatusCard
          title="Total"
          count={orderStats.total}
          icon="total"
          onClick={() => setActiveFilter(activeFilter === 'total' ? null : 'total')}
          isActive={activeFilter === 'total'}
        />
        <OrderStatusCard
          title="Belum Dibayar"
          count={orderStats.pending}
          icon="pending"
          onClick={() => setActiveFilter(activeFilter === 'pending' ? null : 'pending')}
          isActive={activeFilter === 'pending'}
        />
        <OrderStatusCard
          title="Diproses"
          count={orderStats.process}
          icon="process"
          onClick={() => setActiveFilter(activeFilter === 'process' ? null : 'process')}
          isActive={activeFilter === 'process'}
        />
        <OrderStatusCard
          title="Dikirim"
          count={orderStats.shipping}
          icon="shipping"
          onClick={() => setActiveFilter(activeFilter === 'shipping' ? null : 'shipping')}
          isActive={activeFilter === 'shipping'}
        />
        <OrderStatusCard
          title="Dibatalkan"
          count={orderStats.cancel}
          icon="cancel"
          onClick={() => setActiveFilter(activeFilter === 'cancel' ? null : 'cancel')}
          isActive={activeFilter === 'cancel'}
        />
        <OrderStatusCard
          title="COD Gagal"
          count={orderStats.failed}
          icon="failed"
          onClick={() => setActiveFilter(activeFilter === 'failed' ? null : 'failed')}
          isActive={activeFilter === 'failed'}
        />
      </div>

      <Card className="shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2">
          <div>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    !selectedDateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDateRange?.from ? (
                    selectedDateRange.to ? (
                      <>
                        {format(selectedDateRange.from, "dd MMM yyyy", { locale: id })} -{" "}
                        {format(selectedDateRange.to, "dd MMM yyyy", { locale: id })}
                      </>
                    ) : (
                      format(selectedDateRange.from, "dd MMM yyyy", { locale: id })
                    )
                  ) : (
                    <span>Pilih tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="space-y-3 p-3">
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePresetDate(0)}
                      className="w-full sm:w-auto"
                    >
                      Hari Ini
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePresetDate(1)}
                      className="w-full sm:w-auto"
                    >
                      Kemarin
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePresetDate(7)}
                      className="w-full sm:w-auto"
                    >
                      1 Minggu
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePresetDate(30)}
                      className="w-full sm:w-auto"
                    >
                      1 Bulan
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePresetDate(-1)}
                      className="w-full sm:w-auto"
                    >
                      Bulan Ini
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePresetDate(-2)}
                      className="w-full sm:w-auto"
                    >
                      Bulan Kemarin
                    </Button>
                  </div>
                  <div className="border-t pt-3">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={handleDateSelect}
                      numberOfMonths={2}
                      locale={id}
                      className="sm:block hidden"
                    />
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={handleDateSelect}
                      numberOfMonths={1}
                      locale={id}
                      className="sm:hidden block"
                    />
                  </div>
                  <div className="flex justify-end border-t pt-3">
                    <Button 
                      onClick={handleApplyDate}
                      disabled={!date?.from || !date?.to}
                    >
                      Terapkan
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Popover open={isShopFilterOpen} onOpenChange={setIsShopFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal h-9",
                    !selectedShops.length && "text-muted-foreground"
                  )}
                >
                  <Store className="mr-2 h-4 w-4" />
                  {selectedShops.length === 0 && "Semua Toko"}
                  {selectedShops.length === 1 && selectedShops[0]}
                  {selectedShops.length > 1 && `${selectedShops.length} toko dipilih`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <div className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Filter Toko</p>
                    {selectedShops.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedShops([])}
                        className="h-8 px-2 text-xs"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                  <div className="border-t -mx-3" />
                  <ScrollArea className="h-[280px] -mx-3 px-3">
                    <div className="space-y-2">
                      {uniqueShops.map((shop) => (
                        <div key={shop} className="flex items-center space-x-2">
                          <Checkbox 
                            id={shop}
                            checked={selectedShops.includes(shop)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedShops([...selectedShops, shop])
                              } else {
                                setSelectedShops(selectedShops.filter(s => s !== shop))
                              }
                            }}
                          />
                          <label 
                            htmlFor={shop} 
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {shop}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <div className="flex gap-2">
              <Select
                value={searchType}
                onValueChange={setSearchType}
              >
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Pilih Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order_sn">No. Pesanan</SelectItem>
                  <SelectItem value="tracking_number">No. Resi</SelectItem>
                  <SelectItem value="buyer_username">Username</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={
                    searchType === "order_sn" ? "Cari no pesanan..." :
                    searchType === "tracking_number" ? "Cari no resi..." :
                    "Cari username..."
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (e.target.value === '') {
                      setIsSearching(false)
                      clearSearch()
                    }
                  }}
                  onKeyPress={handleKeyPress}
                  className={cn(
                    "w-full h-9 pl-8 rounded-md border bg-background text-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    searchLoading && "pr-8"
                  )}
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="rounded-lg border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="dark:border-gray-700">
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white w-10 text-center whitespace-nowrap">#</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[80px] sm:min-w-[100px]">Toko</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[120px]">Tanggal</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[150px]">No. Pesanan</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[100px]">Username</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[100px]">Harga</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[100px]">SKU (Qty)</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[150px]">Kurir</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(isSearching ? searchResults : orders)
              .filter(order => {
                if (!activeFilter) return true
                // ... existing filter logic ...
              })
              .filter(order => {
                if (selectedShops.length === 0) return true
                return selectedShops.includes(order.shop_name)
              })
              .map((order, index) => (
                <TableRow 
                  key={order.order_sn}
                  className={index % 2 === 0 ? 'bg-muted dark:bg-gray-800/50' : 'bg-gray-100/20 dark:bg-gray-900'}
                >
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white text-center">{index + 1}</TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap max-w-[80px] sm:max-w-none overflow-hidden text-ellipsis">{order.shop_name}</TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">{formatDate(order.create_time)}</TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>{order.order_sn}</span>
                      {order.cod && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-600 text-white dark:bg-red-500">
                          COD
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">{order.buyer_username}</TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">
                    Rp {parseInt(order.total_amount).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">{order.sku_qty}</TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">
                    {order.shipping_carrier || '-'} ({order.tracking_number || '-'})
                  </TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      order.order_status === 'READY_TO_SHIP' ? 'bg-green-600 text-white' :
                      order.order_status === 'PROCESSED' ? 'bg-blue-600 text-white' :
                      order.order_status === 'SHIPPED' ? 'bg-indigo-600 text-white' :
                      order.order_status === 'CANCELLED' ? 'bg-red-600 text-white' :
                      order.order_status === 'IN_CANCEL' ? 'bg-yellow-600 text-white' :
                      order.order_status === 'TO_RETURN' ? 'bg-purple-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {order.order_status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {(ordersLoading || searchLoading) && (
        <div className="flex justify-center items-center p-4">
          <span className="text-sm text-muted-foreground">Memuat data...</span>
        </div>
      )}

      {!ordersLoading && !searchLoading && 
        ((isSearching && searchResults.length === 0) || (!isSearching && orders.length === 0)) && (
        <div className="flex justify-center items-center p-4">
          <span className="text-sm text-muted-foreground">
            {isSearching ? "Tidak ada hasil pencarian" : "Tidak ada data pesanan"}
          </span>
        </div>
      )}
    </div>
  )
}
