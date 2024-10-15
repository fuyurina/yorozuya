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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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
  const [activeTab, setActiveTab] = useState("Semua")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const updatedCategories = categories.map(category => ({
      ...category,
      count: category.status
        ? orders.filter(order => order.order_status === category.status).length
        : orders.length
    }))
    setCategories(updatedCategories)
    handleTabChange(activeTab)
    handleSearch(searchTerm)
  }, [orders, searchTerm])

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName)
    const selectedCategory = categories.find(cat => cat.name === tabName)
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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "READY_TO_SHIP":
        return "bg-red-400 text-yellow-800";
      case "PROCESSED":
        return "bg-green-100 text-green-800";
      case "SHIPPED":
        return "bg-blue-100 text-blue-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "IN_CANCEL":
        return "bg-orange-100 text-orange-800";
      case "TO_RETURN":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <div className="flex justify-between items-center mb-4">
        <TabsList>
          {categories.map(category => (
            <TabsTrigger key={category.name} value={category.name}>
              {category.name} ({category.count})
            </TabsTrigger>
          ))}
        </TabsList>
        <input
          type="text"
          placeholder="Cari username, kurir, atau no. pesanan"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border rounded-md"
        />
      </div>
      <TabsContent value={activeTab}>
        <Table>
          <TableCaption>Daftar Pesanan - {activeTab}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">#</TableHead>
              <TableHead>Toko</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>No. Pesanan</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead>SKU (Qty)</TableHead>
              <TableHead>Kurir</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((order: OrderItem, index: number) => (
              <TableRow key={`${order.order_sn}`}>
                <TableCell className="text-center">{index + 1}</TableCell>
                <TableCell>{order.shop_name}</TableCell>
                <TableCell>{formatDate(order.pay_time)}</TableCell>
                <TableCell>{order.order_sn}</TableCell>
                <TableCell>{order.buyer_username || '-'}</TableCell>
                <TableCell>Rp {order.total_amount.toLocaleString('id-ID')}</TableCell>
                <TableCell>{order.sku_qty || '-'}</TableCell>
                <TableCell>{order.shipping_carrier || '-'} ({order.tracking_number || '-'})</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.order_status)}`}>
                    {order.order_status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TabsContent>
    </Tabs>
  )
}
