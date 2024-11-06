import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
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
import { Package, Clock, Truck, XCircle, AlertCircle, RefreshCcw, Search, Filter, Printer, PrinterCheck } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { OrderDetails } from '@/app/dashboard/OrderDetails'
import { useShippingDocument } from '@/app/hooks/useShippingDocument';
import { Button } from "@/components/ui/button";
import { mergePDFs } from '@/app/utils/pdfUtils';

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
  onOrderUpdate?: (orderSn: string, updates: Partial<OrderItem>) => void
}

type OrderStatus = "READY_TO_SHIP" | "PROCESSED" | "SHIPPED" | "CANCELLED" | "IN_CANCEL" | "TO_RETURN";

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

const StatusBadge = React.memo(({ status }: { status: OrderStatus }) => (
  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
    {getStatusIcon(status)}
    {status}
  </span>
));

// Tambahkan baris berikut setelah definisi komponen StatusBadge
StatusBadge.displayName = 'StatusBadge';

// Tambahkan interface
interface ShippingDocumentParams {
  order_sn: string;
  shipping_document_type: "THERMAL_AIR_WAYBILL";
  package_number?: string;
  shipping_carrier?: string;
}

export function OrdersDetailTable({ orders, onOrderUpdate }: OrdersDetailTableProps) {
  const categories = useMemo(() => [
    { name: "Semua", count: 0, status: "" },
    { name: "Siap Kirim", count: 0, status: "READY_TO_SHIP" },
    { name: "Diproses", count: 0, status: "PROCESSED" },
    { name: "Dikirim", count: 0, status: "SHIPPED" },
    { name: "Dibatalkan", count: 0, status: "CANCELLED" },
    { name: "Permintaan Batal", count: 0, status: "IN_CANCEL" },
    { name: "Pengembalian", count: 0, status: "TO_RETURN" },
  ], [])

  const [filteredOrders, setFilteredOrders] = useState(orders)
  const [activeCategory, setActiveCategory] = useState("Semua")
  const [searchTerm, setSearchTerm] = useState("")
  const [shops, setShops] = useState<string[]>([])
  const [selectedShops, setSelectedShops] = useState<string[]>([])
  const [isShopFilterOpen, setIsShopFilterOpen] = useState(false)
  const [selectedOrderSn, setSelectedOrderSn] = useState<string>("")
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const { downloadDocument, isLoadingForOrder } = useShippingDocument();

  const updatedCategories = useMemo(() => {
    return categories.map(category => ({
      ...category,
      count: category.status
        ? orders.filter(order => order.order_status === category.status).length
        : orders.length
    }))
  }, [categories, orders])

  const handleCategoryChange = useCallback((categoryName: string) => {
    setActiveCategory(categoryName)
  }, [])

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  const handleShopFilter = useCallback((shopName: string) => {
    setSelectedShops(prev =>
      prev.includes(shopName)
        ? prev.filter(shop => shop !== shopName)
        : [...prev, shopName]
    )
  }, [])

  const filterOrders = useMemo(() => {
    return orders.filter(order => {
      const categoryMatch = activeCategory === "Semua" || order.order_status === categories.find(cat => cat.name === activeCategory)?.status;
      const searchMatch = !searchTerm || 
        order.buyer_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.shipping_carrier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_sn.toLowerCase().includes(searchTerm.toLowerCase());
      const shopMatch = selectedShops.length === 0 || selectedShops.includes(order.shop_name);
      
      return categoryMatch && searchMatch && shopMatch;
    });
  }, [orders, activeCategory, searchTerm, selectedShops, categories]);

  useEffect(() => {
    setFilteredOrders(filterOrders)
    
    const uniqueShops = Array.from(new Set(orders.map(order => order.shop_name)))
    setShops(uniqueShops)
  }, [filterOrders, orders])

  const handleDownloadDocument = async (order: OrderItem) => {
    try {
      if (order.document_status !== 'READY') {
        console.warn('Dokumen belum siap untuk diunduh');
        return;
      }

      const orderList: ShippingDocumentParams[] = [{
        order_sn: order.order_sn,
        package_number: order.package_number,
        shipping_document_type: "THERMAL_AIR_WAYBILL" as const,
        shipping_carrier: order.shipping_carrier
      }];

      const blob = await downloadDocument(order.shop_id, orderList);
      
      // Panggil callback untuk update data di parent
      if (onOrderUpdate) {
        onOrderUpdate(order.order_sn, { is_printed: true });
      }
      
      // Perbarui data orders secara lokal
      const updatedOrders = orders.map(o => {
        if (o.order_sn === order.order_sn) {
          return { ...o, is_printed: true };
        }
        return o;
      });
      
      // Update filtered orders juga
      setFilteredOrders(updatedOrders);
      
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      if (newWindow) {
        setTimeout(() => {
          newWindow.document.title = `Dokumen ${order.shop_name}`;
        }, 100);
      }
    } catch (err) {
      console.error('Gagal mengunduh dokumen:', err);
    }
  };

  // Handler untuk checkbox utama
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const printableOrders = filteredOrders
        .filter(order => order.document_status === 'READY')
        .map(order => order.order_sn);
      setSelectedOrders(printableOrders);
    } else {
      setSelectedOrders([]);
    }
  };

  // Handler untuk checkbox individual
  const handleSelectOrder = (orderSn: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderSn]);
    } else {
      setSelectedOrders(prev => prev.filter(sn => sn !== orderSn));
    }
  };

  // Tambahkan state untuk tracking progress
  const [bulkProgress, setBulkProgress] = useState<{
    processed: number;
    total: number;
    currentCarrier: string;
  }>({
    processed: 0,
    total: 0,
    currentCarrier: ''
  });

  // Update fungsi handleBulkPrint
  const handleBulkPrint = async () => {
    // Jika ada yang dipilih, gunakan selectedOrders, jika tidak gunakan semua order yang dapat dicetak
    const ordersToPrint = selectedOrders.length > 0 
      ? selectedOrders 
      : filteredOrders
          .filter(order => order.document_status === 'READY')
          .map(order => order.order_sn);

    if (ordersToPrint.length === 0) return;

    setBulkProgress({
      processed: 0,
      total: ordersToPrint.length,
      currentCarrier: ''
    });

    try {
      // Kelompokkan berdasarkan shop_id
      const ordersByShop = orders
        .filter(order => ordersToPrint.includes(order.order_sn))
        .reduce((groups: { [key: number]: OrderItem[] }, order) => {
          const shopId = order.shop_id;
          if (!groups[shopId]) {
            groups[shopId] = [];
          }
          groups[shopId].push(order);
          return groups;
        }, {});

      // Proses setiap toko
      for (const [shopId, shopOrders] of Object.entries(ordersByShop)) {
        const blobs: Blob[] = [];
        // Ambil nama toko dari order pertama dalam grup
        const shopName = shopOrders[0].shop_name;

        // Kelompokkan orders berdasarkan kurir untuk request
        const ordersByCarrier = shopOrders.reduce((groups: { 
          [key: string]: OrderItem[] 
        }, order) => {
          const carrier = order.shipping_carrier || 'unknown';
          if (!groups[carrier]) {
            groups[carrier] = [];
          }
          groups[carrier].push(order);
          return groups;
        }, {});

        // Proses setiap kurir
        for (const [carrier, carrierOrders] of Object.entries(ordersByCarrier)) {
          setBulkProgress(prev => ({
            ...prev,
            currentCarrier: carrier
          }));

          const orderParams: ShippingDocumentParams[] = carrierOrders.map(order => ({
            order_sn: order.order_sn,
            package_number: order.package_number,
            shipping_document_type: "THERMAL_AIR_WAYBILL" as const,
            shipping_carrier: order.shipping_carrier
          }));

          const blob = await downloadDocument(parseInt(shopId), orderParams);
          blobs.push(blob);

          setBulkProgress(prev => ({
            ...prev,
            processed: prev.processed + carrierOrders.length
          }));

          // Delay antar request kurir
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Gabung semua PDF dari satu toko dan buka dalam satu tab
        const mergedPDF = await mergePDFs(blobs);
        const url = URL.createObjectURL(mergedPDF);
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
          newWindow.document.title = `Dokumen ${shopName}`;
        }
      }
    } catch (error) {
      console.error('Gagal mencetak dokumen:', error);
    } finally {
      setBulkProgress({
        processed: 0,
        total: 0,
        currentCarrier: ''
      });
    }
  };

  // Tambahkan state untuk indeterminate
  const [isIndeterminate, setIsIndeterminate] = useState(false);

  const checkboxRef = useRef<HTMLButtonElement>(null);

  // Update useEffect untuk menghandle indeterminate state
  useEffect(() => {
    const readyOrders = filteredOrders.filter(order => order.document_status === 'READY');
    const selectedReadyOrders = selectedOrders.length;
    const allReadyOrders = readyOrders.length;
    
    // Set indeterminate menggunakan ref
    if (checkboxRef.current) {
      const isIndeterminate = selectedReadyOrders > 0 && selectedReadyOrders < allReadyOrders;
      (checkboxRef.current as any).indeterminate = isIndeterminate;
    }
  }, [selectedOrders, filteredOrders]);

  return (
    <div className="w-full">
      {bulkProgress.total > 0 && (
        <div className="mb-4 p-2 bg-gray-100 rounded-lg">
          <div className="flex justify-between mb-2">
            <span className="text-sm">
              Mengunduh dokumen {bulkProgress.processed}/{bulkProgress.total}
            </span>
            <span className="text-sm text-gray-600">
              Kurir: {bulkProgress.currentCarrier}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(bulkProgress.processed / bulkProgress.total) * 100}%` 
              }}
            />
          </div>
        </div>
      )}

      <Card className="px-2 py-2 my-2 shadow-none rounded-lg">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <div className="w-full sm:flex items-center gap-2">
            {/* Dropdown untuk mobile */}
            <div className="w-full sm:hidden">
              <Select value={activeCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {updatedCategories.map(category => (
                    <SelectItem key={category.name} value={category.name}>
                      {category.name} ({category.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tab kategori dan tombol cetak untuk desktop */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex space-x-2 overflow-x-auto">
                {updatedCategories.map(category => (
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

              {/* Tombol cetak dokumen masal */}
              <Button
                onClick={handleBulkPrint}
                className="px-3 py-2 text-xs font-medium bg-primary text-white whitespace-nowrap h-[32px] min-h-0"
              >
                {selectedOrders.length > 0 
                  ? `Cetak ${selectedOrders.length} Dokumen`
                  : 'Cetak Semua'
                }
              </Button>
            </div>
          </div>

          <div className="relative w-full sm:w-auto flex items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="Cari username, kurir, atau no. pesanan"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-2 py-1 pl-8 border rounded-md w-full sm:w-auto text-xs"
              />
              <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            <Popover open={isShopFilterOpen} onOpenChange={setIsShopFilterOpen}>
              <PopoverTrigger asChild>
                <button className="ml-2 p-1 rounded-md hover:bg-gray-100">
                  <Filter size={20} className="text-gray-500" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56" align="end" side="bottom" sideOffset={5}>
                <div className="space-y-2">
                  <h3 className="font-semibold">Filter Toko</h3>
                  {shops.map(shop => (
                    <div key={shop} className="flex items-center space-x-2">
                      <Checkbox
                        id={shop}
                        checked={selectedShops.includes(shop)}
                        onCheckedChange={() => handleShopFilter(shop)}
                      />
                      <label htmlFor={shop} className="text-sm">{shop}</label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Card>
      
      
      <div className="rounded-md border overflow-x-auto mt-2">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              {activeCategory === "Diproses" && (
                <TableHead className="hidden md:table-cell w-10 p-1 h-[32px] align-middle">
                  <div className="flex justify-center">
                    <Checkbox
                      ref={checkboxRef}
                      checked={
                        filteredOrders.length > 0 &&
                        filteredOrders
                          .filter(order => order.document_status === 'READY')
                          .every(order => selectedOrders.includes(order.order_sn))
                      }
                      onCheckedChange={handleSelectAll}
                      className="h-4 w-4"
                    />
                  </div>
                </TableHead>
              )}
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white w-10 text-center whitespace-nowrap">#</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[80px] sm:min-w-[100px]">Toko</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[120px]">Tanggal</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[150px]">No. Pesanan</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[100px]">Username</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[100px]">Harga</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[100px]">SKU (Qty)</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[150px]">Kurir</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap min-w-[100px]">Status</TableHead>
              <TableHead className="font-bold uppercase text-xs text-black dark:text-white whitespace-nowrap w-[100px] text-center">Cetak</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order: OrderItem, index: number) => (
                <TableRow 
                  key={`${order.order_sn}`} 
                  className={
                    order.order_status === "IN_CANCEL" 
                      ? 'bg-red-100 dark:bg-red-900' // Tambahkan dark:bg-red-900
                      : order.order_status === "CANCELLED"
                        ? 'bg-gray-300 dark:bg-gray-700' // Tambahkan dark:bg-gray-700
                        : index % 2 === 0 
                          ? 'bg-muted' 
                          : 'bg-gray-100/20'
                  }
                >
                  {activeCategory === "Diproses" && (
                    <TableCell className="p-1 h-[32px] align-middle">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={selectedOrders.includes(order.order_sn)}
                          disabled={order.document_status !== 'READY'}
                          onCheckedChange={(checked) => 
                            handleSelectOrder(order.order_sn, checked as boolean)
                          }
                          className="h-4 w-4"
                        />
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white text-center whitespace-nowrap">{index + 1}</TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap max-w-[80px] sm:max-w-none overflow-hidden text-ellipsis">{order.shop_name}</TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">{formatDate(order.pay_time)}</TableCell>
                  <TableCell 
                    className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap cursor-pointer hover:text-primary"
                    onClick={() => {
                      setSelectedOrderSn(order.order_sn)
                      setIsDetailOpen(true)
                    }}
                  >
                    {order.order_sn}
                  </TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">{order.buyer_username || '-'}</TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">Rp {order.total_amount.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">{order.sku_qty || '-'}</TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">{order.shipping_carrier || '-'} ({order.tracking_number || '-'})</TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">
                    <StatusBadge status={order.order_status as OrderStatus} />
                  </TableCell>
                  <TableCell className="text-center p-1 h-[32px]">
                    <Button
                      onClick={() => handleDownloadDocument(order)}
                      disabled={isLoadingForOrder(order.order_sn) || order.document_status !== 'READY'}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0"
                    >
                      {isLoadingForOrder(order.order_sn) ? (
                        <RefreshCcw size={12} className="animate-spin" />
                      ) : order.is_printed ? (
                        <PrinterCheck size={12} className="text-green-500 hover:text-green-600" />
                      ) : (
                        <Printer size={12} className="text-primary hover:text-primary/80" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={activeCategory === "Diproses" ? 11 : 10} className="text-center py-4">
                  Tidak ada data untuk ditampilkan
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <OrderDetails 
        orderSn={selectedOrderSn}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  )
}
