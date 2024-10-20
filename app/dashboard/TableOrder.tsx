import { useState, useEffect } from 'react'
import { OrderItem } from '@/app/hooks/useDashboard'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// Impor ikon-ikon yang diperlukan
import { Package, Clock, Truck, XCircle, AlertCircle, RefreshCcw, Search } from 'lucide-react'

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

type OrdersDetailTableProps = {
  orders: OrderItem[]
}

export function OrdersDetailTable({ orders }: OrdersDetailTableProps) {
  const [categories, setCategories] = useState([
    { name: "Semua", count: 0, status: "" },
    { name: "Siap Kirim", count: 0, status: "READY_TO_SHIP" },
    { name: "Diproses", count: 0, status: "PROCESSED" },
    { name: "Dikirim", count: 0, status: "SHIPPED" },
    { name: "Dibatalkan", count: 0, status: "CANCELLED" },
    { name: "Permintaan Batal", count: 0, status: "IN_CANCEL" },
    { name: "Pengembalian", count: 0, status: "TO_RETURN" },
  ])

  const [filteredOrders, setFilteredOrders] = useState(orders)
  const [activeCategory, setActiveCategory] = useState("Semua")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const updatedCategories = categories.map(category => ({
      ...category,
      count: category.status
        ? orders.filter(order => order.order_status === category.status).length
        : orders.length
    }))
    setCategories(updatedCategories)
    handleCategoryChange(activeCategory)
    handleSearch(searchTerm)
  }, [orders, searchTerm])

  const handleCategoryChange = (categoryName: string) => {
    setActiveCategory(categoryName)
    const selectedCategory = categories.find(cat => cat.name === categoryName)
    if (selectedCategory) {
      setFilteredOrders(selectedCategory.status
        ? orders.filter(order => order.order_status === selectedCategory.status)
        : orders
      )
    }
  }

  const handleSearch = (term: string) => {
    const filtered = orders.filter(order =>
      order.buyer_username?.toLowerCase().includes(term.toLowerCase()) ||
      order.shipping_carrier?.toLowerCase().includes(term.toLowerCase()) ||
      order.order_sn.toLowerCase().includes(term.toLowerCase())
    )
    setFilteredOrders(filtered)
  }

  // Tambahkan tipe untuk status
  type OrderStatus = "READY_TO_SHIP" | "PROCESSED" | "SHIPPED" | "CANCELLED" | "IN_CANCEL" | "TO_RETURN";

  // Perbaiki tipe fungsi getStatusColor dan getStatusIcon
  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case "READY_TO_SHIP":
        return "bg-green-600 text-white";
      case "PROCESSED":
        return "bg-blue-600 text-white";
      case "SHIPPED":
        return "bg-indigo-600 text-white";
      case "CANCELLED":
        return "bg-red-600 text-white";
      case "IN_CANCEL":
        return "bg-yellow-600 text-white";
      case "TO_RETURN":
        return "bg-purple-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "READY_TO_SHIP":
        return <Package size={14} className="inline-block mr-1" />;
      case "PROCESSED":
        return <Clock size={14} className="inline-block mr-1" />;
      case "SHIPPED":
        return <Truck size={14} className="inline-block mr-1" />;
      case "CANCELLED":
        return <XCircle size={14} className="inline-block mr-1" />;
      case "IN_CANCEL":
        return <AlertCircle size={14} className="inline-block mr-1" />;
      case "TO_RETURN":
        return <RefreshCcw size={14} className="inline-block mr-1" />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      <Card className="px-2 py-2 my-2 shadow-none rounded-lg">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          {/* Dropdown untuk mobile */}
          <div className="w-full sm:hidden">
            <Select value={activeCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.name} value={category.name}>
                    {category.name} ({category.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Tombol-tombol untuk desktop */}
          <div className="hidden sm:flex space-x-2 overflow-x-auto">
            {categories.map(category => (
              <button
                key={category.name}
                onClick={() => handleCategoryChange(category.name)}
                className={`px-3 py-2 text-xs font-medium rounded-md transition-all
                  ${activeCategory === category.name
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {category.name} <span className="ml-1 text-xs font-normal">({category.count})</span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Cari username, kurir, atau no. pesanan"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-2 py-1 pl-8 border rounded-md w-full sm:w-auto text-xs"
            />
            <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </Card>
      
      {/* Tabel */}
      <div className="rounded-md border overflow-x-auto mt-2">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold uppercase text-xs text-black w-10 text-center whitespace-nowrap">#</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black whitespace-nowrap min-w-[80px] sm:min-w-[100px]">Toko</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black whitespace-nowrap min-w-[120px]">Tanggal</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black whitespace-nowrap min-w-[150px]">No. Pesanan</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black whitespace-nowrap min-w-[100px]">Username</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black whitespace-nowrap min-w-[100px]">Harga</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black whitespace-nowrap min-w-[100px]">SKU (Qty)</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black whitespace-nowrap min-w-[150px]">Kurir</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black whitespace-nowrap min-w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order: OrderItem, index: number) => (
                <TableRow 
                  key={`${order.order_sn}`} 
                  className={
                    order.order_status === "IN_CANCEL" 
                      ? 'bg-red-100' 
                      : order.order_status === "CANCELLED"
                        ? 'bg-gray-300'
                        : index % 2 === 0 
                          ? 'bg-muted' 
                          : 'bg-gray-100/20'
                  }
                >
                  <TableCell className="text-xs text-gray-600 text-center whitespace-nowrap">{index + 1}</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap max-w-[80px] sm:max-w-none overflow-hidden text-ellipsis">{order.shop_name}</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">{formatDate(order.pay_time)}</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">{order.order_sn}</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">{order.buyer_username || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">Rp {order.total_amount.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">{order.sku_qty || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">{order.shipping_carrier || '-'} ({order.tracking_number || '-'})</TableCell>
                  <TableCell className="text-xs text-gray-600 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.order_status as OrderStatus)}`}>
                      {getStatusIcon(order.order_status as OrderStatus)}
                      {order.order_status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-4">
                  Tidak ada data untuk ditampilkan
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
