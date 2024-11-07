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
import { Package, Clock, Truck, XCircle, AlertCircle, RefreshCcw, Search, Filter, Printer, PrinterCheck, CheckSquare, CheckCircle } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { OrderDetails } from '@/app/dashboard/OrderDetails'
import { useShippingDocument } from '@/app/hooks/useShippingDocument';
import { Button } from "@/components/ui/button";
import { mergePDFs } from '@/app/utils/pdfUtils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Check, X } from 'lucide-react'; // Tambahkan import icon
import { OrderHistory } from '@/app/dashboard/OrderHistory';

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

  // Tambahkan state untuk toggle checkbox
  const [showCheckbox, setShowCheckbox] = useState(false);

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

  // Tambahkan helper function untuk mengecek apakah order bisa dicentang
  const isOrderCheckable = (order: OrderItem) => {
    return order.document_status === 'READY' && 
      (order.order_status === 'PROCESSED' || order.order_status === 'IN_CANCEL');
  };

  // Handler untuk checkbox utama
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const printableOrders = filteredOrders
        .filter(order => isOrderCheckable(order))
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
      : orders
          .filter(order => isOrderCheckable(order))
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
    const checkableOrders = filteredOrders.filter(order => isOrderCheckable(order));
    const selectedCheckableOrders = selectedOrders.length;
    const allCheckableOrders = checkableOrders.length;
    
    if (checkboxRef.current) {
      const isIndeterminate = selectedCheckableOrders > 0 && selectedCheckableOrders < allCheckableOrders;
      (checkboxRef.current as any).indeterminate = isIndeterminate;
    }
  }, [selectedOrders, filteredOrders]);

  // Update fungsi untuk menghitung total dokumen yang dapat dicetak (global)
  const getTotalPrintableDocuments = () => {
    return orders.filter(order => isOrderCheckable(order)).length;
  };

  // Update fungsi untuk menghitung dokumen yang belum dicetak (global)
  const getUnprintedDocuments = () => {
    return orders.filter(order => 
      isOrderCheckable(order) && 
      !order.is_printed
    ).length;
  };

  // Update fungsi handlePrintUnprinted untuk menggunakan orders (global)
  const handlePrintUnprinted = async () => {
    const unprintedOrders = orders
      .filter(order => 
        isOrderCheckable(order) && 
        !order.is_printed
      )
      .map(order => order.order_sn);
      
    if (unprintedOrders.length === 0) {
      toast.info('Tidak ada dokumen yang belum dicetak');
      return;
    }
    
    // Set selected orders ke dokumen yang belum dicetak
    setSelectedOrders(unprintedOrders);
    // Gunakan handleBulkPrint yang sudah ada
    await handleBulkPrint();
  };

  // Update fungsi toggle checkbox
  const handleToggleCheckbox = () => {
    const newShowCheckbox = !showCheckbox;
    setShowCheckbox(newShowCheckbox);
    
    // Jika checkbox disembunyikan, hapus semua seleksi
    if (!newShowCheckbox) {
      setSelectedOrders([]);
    }
  };

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{ orderSn: string, action: 'ACCEPT' | 'REJECT' }>({ orderSn: '', action: 'ACCEPT' });

  const handleCancellationAction = async (orderSn: string, action: 'ACCEPT' | 'REJECT') => {
    setSelectedAction({ orderSn, action });
    setIsConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    const { orderSn, action } = selectedAction;
    const order = orders.find(o => o.order_sn === orderSn);
    
    if (!order) return;

    try {
      const response = await fetch('/api/orders/handle-cancellation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopId: order.shop_id,
          orderSn: orderSn,
          operation: action
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Berhasil ${action === 'ACCEPT' ? 'menerima' : 'menolak'} pembatalan`);
        // Update local state jika ada callback
        if (onOrderUpdate) {
          onOrderUpdate(orderSn, {
            order_status: action === 'ACCEPT' ? 'CANCELLED' : 'READY_TO_SHIP'
          });
        }
      } else {
        toast.error(result.message || 'Gagal memproses pembatalan');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat memproses pembatalan');
    } finally {
      setIsConfirmOpen(false);
    }
  };

  // Tambahkan state untuk OrderHistory
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  // Tambahkan fungsi handler yang diperbarui
  const handleUsernameClick = (userId: number) => {
    console.log('Clicked userId:', userId);
    if (!userId) {
      console.warn('User ID tidak valid');
      return;
    }
    setSelectedUserId(userId.toString());
    setIsOrderHistoryOpen(true);
  }

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

      <div className="flex flex-col md:flex-row gap-2 w-full mt-2">
        {/* Card Kategori */}
        <Card className="px-2 py-2 shadow-none rounded-lg md:flex-1">
          <div className="w-full">
            {/* Existing dropdown dan tab kategori */}
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
            <div className="hidden sm:flex space-x-2 overflow-x-auto items-center">
              {/* Tombol checkbox sebelum kategori */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleCheckbox}
                className="h-6 w-6 p-0"
              >
                <CheckSquare 
                  size={16} 
                  className={showCheckbox ? "text-primary" : "text-gray-500"}
                />
              </Button>

              {/* Kategori buttons */}
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
          </div>
        </Card>

        {/* Card Pencarian dan Tombol Cetak */}
        <Card className="px-2 py-2 shadow-none rounded-lg flex-1">
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            {/* Bagian Pencarian dan Filter */}
            <div className="flex items-center gap-2 w-full sm:w-[400px]">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Cari username, kurir, atau no. pesanan"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-2 py-1 pl-8 border rounded-md w-full text-xs h-[32px]"
                />
                <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>

              <Popover open={isShopFilterOpen} onOpenChange={setIsShopFilterOpen}>
                <PopoverTrigger asChild>
                  <button className="p-1 rounded-md hover:bg-gray-100 h-[32px] w-[32px] flex items-center justify-center">
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

            {/* Bagian Tombol Cetak */}
            <div className="flex gap-2 shrink-0">
              <Button
                onClick={handlePrintUnprinted}
                className="px-3 py-2 text-xs font-medium bg-green-600 hover:bg-green-700 text-white whitespace-nowrap h-[32px] min-h-0"
                disabled={getUnprintedDocuments() === 0}
              >
                Belum Print ({getUnprintedDocuments()})
              </Button>

              <Button
                onClick={handleBulkPrint}
                className={`px-3 py-2 text-xs font-medium text-white whitespace-nowrap h-[32px] min-h-0
                  ${selectedOrders.length > 0 
                    ? 'bg-orange-500 hover:bg-orange-600' 
                    : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {selectedOrders.length > 0 
                  ? `Cetak ${selectedOrders.length} Dokumen`
                  : `Cetak Semua (${getTotalPrintableDocuments()})`
                }
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="rounded-md border overflow-x-auto mt-2">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              {/* Update tampilan checkbox header */}
              <TableHead className={`w-10 p-1 h-[32px] align-middle ${!showCheckbox && 'hidden'}`}>
                <div className="flex justify-center">
                  <Checkbox
                    ref={checkboxRef}
                    checked={
                      filteredOrders.filter(order => isOrderCheckable(order)).length > 0 && 
                      filteredOrders
                        .filter(order => isOrderCheckable(order))
                        .every(order => selectedOrders.includes(order.order_sn))
                    }
                    onCheckedChange={handleSelectAll}
                    className="h-4 w-4"
                  />
                </div>
              </TableHead>
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
                  <TableCell className={`p-1 h-[32px] align-middle ${!showCheckbox && 'hidden'}`}>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={selectedOrders.includes(order.order_sn)}
                        disabled={!isOrderCheckable(order)}
                        onCheckedChange={(checked) => 
                          handleSelectOrder(order.order_sn, checked as boolean)
                        }
                        className="h-4 w-4"
                      />
                    </div>
                  </TableCell>
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
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">
                    <button
                      onClick={() => handleUsernameClick(order.buyer_user_id)}
                      className="hover:text-primary"
                    >
                      {order.buyer_username}
                    </button>
                  </TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">Rp {order.total_amount.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">{order.sku_qty || '-'}</TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">{order.shipping_carrier || '-'} ({order.tracking_number || '-'})</TableCell>
                  <TableCell className="p-1 h-[32px] text-xs text-gray-600 dark:text-white whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={order.order_status as OrderStatus} />
                      {order.order_status === "IN_CANCEL" && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 hover:bg-green-100"
                            onClick={() => handleCancellationAction(order.order_sn, 'ACCEPT')}
                            title="Terima Pembatalan"
                          >
                            <CheckCircle size={16} className="text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 hover:bg-red-100"
                            onClick={() => handleCancellationAction(order.order_sn, 'REJECT')}
                            title="Tolak Pembatalan"
                          >
                            <XCircle size={16} className="text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
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
                <TableCell colSpan={11} className="text-center py-4">
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

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pembatalan</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin {selectedAction.action === 'ACCEPT' ? 'menerima' : 'menolak'} pembatalan untuk pesanan ini?
              {selectedAction.action === 'ACCEPT' 
                ? ' Pesanan akan dibatalkan.'
                : ' Pembeli tidak akan dapat mengajukan pembatalan lagi.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {selectedAction.action === 'ACCEPT' ? 'Terima Pembatalan' : 'Tolak Pembatalan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <OrderHistory 
        userId={selectedUserId}
        isOpen={isOrderHistoryOpen}
        onClose={() => setIsOrderHistoryOpen(false)}
      />
    </div>
  )
}
