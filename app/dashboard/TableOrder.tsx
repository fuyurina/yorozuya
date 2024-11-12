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
import { Package, Clock, Truck, XCircle, AlertCircle, RefreshCcw, Search, Filter, Printer, PrinterCheck, CheckSquare, CheckCircle, Send } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { OrderDetails } from '@/app/dashboard/OrderDetails'
import { useShippingDocument } from '@/app/hooks/useShippingDocument';
import { Button } from "@/components/ui/button";
import { mergePDFs } from '@/app/utils/pdfUtils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
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

// Update tipe props StatusBadge
type StatusBadgeProps = {
  status: OrderStatus;
  order: OrderItem;
  onProcess: (order: OrderItem) => void;
  onCancellationAction: (orderSn: string, action: 'ACCEPT' | 'REJECT') => void;
};

// Update komponen StatusBadge dengan props baru
const StatusBadge = React.memo(({ status, order, onProcess, onCancellationAction }: StatusBadgeProps) => (
  <div className="flex items-center gap-2">
    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
      {getStatusIcon(status)}
      {status}
    </span>
    {status === 'READY_TO_SHIP' && (
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
        onClick={() => onProcess(order)}
        title="Proses Pesanan"
      >
        <Send size={16} className="text-blue-600 dark:text-blue-400" />
      </Button>
    )}
    {status === 'IN_CANCEL' && (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900/30"
          onClick={() => onCancellationAction(order.order_sn, 'ACCEPT')}
          title="Terima Pembatalan"
        >
          <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
          onClick={() => onCancellationAction(order.order_sn, 'REJECT')}
          title="Tolak Pembatalan"
        >
          <XCircle size={16} className="text-red-600 dark:text-red-400" />
        </Button>
      </div>
    )}
  </div>
));

// Tambahkan baris ini setelah definisi komponen StatusBadge
StatusBadge.displayName = 'StatusBadge';

// Tambahkan interface
interface ShippingDocumentParams {
  order_sn: string;
  package_number?: string;
  shipping_document_type: "THERMAL_AIR_WAYBILL";
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

  // Update fungsi handleDownloadDocument
  const handleDownloadDocument = async (order: OrderItem) => {
    try {
      const orderParams: ShippingDocumentParams[] = [{
        order_sn: order.order_sn,
        package_number: order.package_number,
        shipping_document_type: "THERMAL_AIR_WAYBILL" as const,
        shipping_carrier: order.shipping_carrier
      }];

      const blob = await downloadDocument(order.shop_id, orderParams);
      const pdfUrl = URL.createObjectURL(blob);
      
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${order.shop_name}</title>
            </head>
            <body style="margin:0;padding:0;height:100vh;">
              <embed src="${pdfUrl}" type="application/pdf" width="100%" height="100%">
            </body>
          </html>
        `);
        newWindow.document.close();
        window.focus();
      }

      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 1000);
    } catch (err) {
      console.error('Gagal mengunduh dokumen:', err);
      toast.error('Gagal mengunduh dokumen');
    }
  };

  // Update fungsi isOrderCheckable untuk lebih spesifik
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
    currentShop: string;
  }>({
    processed: 0,
    total: 0,
    currentCarrier: '',
    currentShop: ''
  });

  // Update fungsi handleBulkPrint
  const handleBulkPrint = async () => {
    // Jika ada selectedOrders, gunakan itu
    // Jika tidak, filter semua order yang bisa dicetak
    const ordersToPrint = selectedOrders.length > 0 
      ? orders
          .filter(order => selectedOrders.includes(order.order_sn))
          .map(order => order.order_sn)
      : orders
          .filter(order => isOrderCheckable(order))
          .map(order => order.order_sn);

    console.log('Orders yang akan dicetak:', ordersToPrint.length, 'dokumen');

    if (ordersToPrint.length === 0) {
      toast.info('Tidak ada dokumen yang dapat dicetak');
      return;
    }

    try {
      // Set selectedOrders dan inisialisasi progress
      setBulkProgress({
        processed: 0,
        total: ordersToPrint.length,
        currentCarrier: '',
        currentShop: ''
      });

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

      // Log pengelompokan
      console.log('Pengelompokan pesanan:', {
        total_orders: ordersToPrint.length,
        shops: Object.entries(ordersByShop).map(([shopId, orders]) => ({
          shop_id: shopId,
          shop_name: orders[0].shop_name,
          order_count: orders.length
        }))
      });

      // Proses setiap toko
      for (const [shopId, shopOrders] of Object.entries(ordersByShop)) {
        const shopName = shopOrders[0].shop_name;
        const blobs: Blob[] = [];

        setBulkProgress(prev => ({
          ...prev,
          currentShop: shopName
        }));

        // Kelompokkan orders berdasarkan kurir
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

        // Log untuk debugging
        console.log(`Processing shop ${shopName}:`, {
          carriers: Object.entries(ordersByCarrier).map(([carrier, orders]) => ({
            carrier,
            order_count: orders.length
          }))
        });

        // Proses setiap kurir
        for (const [carrier, carrierOrders] of Object.entries(ordersByCarrier)) {
          console.log(`Processing carrier ${carrier} for shop ${shopName}:`, {
            order_count: carrierOrders.length,
            orders: carrierOrders.map(o => o.order_sn)
          });

          setBulkProgress(prev => ({
            ...prev,
            currentCarrier: carrier || 'Unknown',
            currentShop: shopName
          }));

          const orderParams: ShippingDocumentParams[] = carrierOrders.map(order => ({
            order_sn: order.order_sn,
            package_number: order.package_number,
            shipping_document_type: "THERMAL_AIR_WAYBILL",
            shipping_carrier: order.shipping_carrier
          }));

          try {
            const blob = await downloadDocument(parseInt(shopId), orderParams);
            blobs.push(blob);

            setBulkProgress(prev => ({
              ...prev,
              processed: prev.processed + carrierOrders.length,
              currentCarrier: carrier || 'Unknown',
              currentShop: shopName
            }));

            console.log(`Successfully downloaded documents for carrier ${carrier}:`, {
              processed: carrierOrders.length,
              total_processed: carrierOrders.length
            });

          } catch (error) {
            console.error(`Error downloading documents for carrier ${carrier}:`, error);
            toast.error(`Gagal mengunduh dokumen untuk ${carrier}`);
          }

          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Proses PDF untuk toko ini
        if (blobs.length > 0) {
          try {
            const mergedPDF = await mergePDFs(blobs);
            const pdfUrl = URL.createObjectURL(mergedPDF);
            
            const newWindow = window.open('', '_blank');
            if (newWindow) {
              newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>${shopName}</title>
                  </head>
                  <body style="margin:0;padding:0;height:100vh;">
                    <embed src="${pdfUrl}" type="application/pdf" width="100%" height="100%">
                  </body>
                </html>
              `);
              newWindow.document.close();
            }

            setTimeout(() => {
              URL.revokeObjectURL(pdfUrl);
            }, 1000);

          } catch (error) {
            console.error(`Error merging PDFs for shop ${shopName}:`, error);
            toast.error(`Gagal menggabungkan PDF untuk ${shopName}`);
          }
        }
      }

      // Update status cetak
      if (onOrderUpdate) {
        orders
          .filter(order => ordersToPrint.includes(order.order_sn))
          .forEach(order => {
            onOrderUpdate(order.order_sn, { is_printed: true });
          });
      }

      // Reset selectedOrders setelah selesai
      setSelectedOrders([]);
      toast.success('Proses pencetakan selesai');

    } catch (error) {
      console.error('Gagal mencetak dokumen:', error);
      toast.error('Gagal mencetak dokumen');
    } finally {
      // Reset progress bar setelah selesai
      setTimeout(() => {
        setBulkProgress({
          processed: 0,
          total: 0,
          currentCarrier: '',
          currentShop: ''
        });
      }, 2000);
    }
  };

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

  // Update fungsi getUnprintedDocuments untuk menggunakan filter yang sama
  const getUnprintedDocuments = () => {
    return orders.filter(order => 
      // Cek dokumen yang:
      !order.is_printed && // belum dicetak
      order.document_status === 'READY' && // dokumen siap cetak
      (order.order_status === 'PROCESSED' || order.order_status === 'IN_CANCEL') // status sesuai
    ).length;
  };

  // Update fungsi handlePrintUnprinted
  const handlePrintUnprinted = () => {
    const unprintedCount = orders.filter(order => 
      !order.is_printed && 
      order.document_status === 'READY' &&
      (order.order_status === 'PROCESSED' || order.order_status === 'IN_CANCEL')
    ).length;
    
    if (unprintedCount === 0) {
      toast.info('Tidak ada dokumen yang belum dicetak');
      return;
    }
    
    // Hanya buka dialog konfirmasi, tanpa mengubah selectedOrders
    setIsUnprintedConfirmOpen(true);
  };

  // Update fungsi handleConfirmUnprinted
  const handleConfirmUnprinted = async () => {
    setIsUnprintedConfirmOpen(false);
    
    // Mengambil pesanan yang belum dicetak saat konfirmasi
    const unprintedOrders = orders.filter(order => 
      !order.is_printed && 
      order.document_status === 'READY' &&
      (order.order_status === 'PROCESSED' || order.order_status === 'IN_CANCEL')
    );
    
    if (unprintedOrders.length === 0) {
      toast.info('Tidak ada dokumen yang belum dicetak');
      return;
    }
    
    try {
      // Inisialisasi progress bar dengan total dokumen
      setBulkProgress({
        processed: 0,
        total: unprintedOrders.length,
        currentCarrier: '',
        currentShop: ''
      });

      // Kelompokkan berdasarkan shop_id
      const ordersByShop = unprintedOrders.reduce((groups: { [key: number]: OrderItem[] }, order) => {
        const shopId = order.shop_id;
        if (!groups[shopId]) {
          groups[shopId] = [];
        }
        groups[shopId].push(order);
        return groups;
      }, {});

      // Log untuk debugging
      console.log('Pengelompokan pesanan:', {
        total_unprinted: unprintedOrders.length,
        shops: Object.entries(ordersByShop).map(([shopId, orders]) => ({
          shop_id: shopId,
          shop_name: orders[0].shop_name,
          order_count: orders.length
        }))
      });

      // Proses setiap toko
      for (const [shopId, shopOrders] of Object.entries(ordersByShop)) {
        const shopName = shopOrders[0].shop_name;
        const blobs: Blob[] = [];

        // Update progress dengan nama toko
        setBulkProgress(prev => ({
          ...prev,
          currentShop: shopName
        }));

        // Kelompokkan orders berdasarkan kurir
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

        // Log untuk debugging
        console.log(`Processing shop ${shopName}:`, {
          carriers: Object.entries(ordersByCarrier).map(([carrier, orders]) => ({
            carrier,
            order_count: orders.length
          }))
        });

        // Proses setiap kurir
        for (const [carrier, carrierOrders] of Object.entries(ordersByCarrier)) {
          console.log(`Processing carrier ${carrier} for shop ${shopName}:`, {
            order_count: carrierOrders.length,
            orders: carrierOrders.map(o => o.order_sn)
          });

          setBulkProgress(prev => ({
            ...prev,
            currentCarrier: carrier || 'Unknown',
            currentShop: shopName
          }));

          const orderParams: ShippingDocumentParams[] = carrierOrders.map(order => ({
            order_sn: order.order_sn,
            package_number: order.package_number,
            shipping_document_type: "THERMAL_AIR_WAYBILL",
            shipping_carrier: order.shipping_carrier
          }));

          try {
            const blob = await downloadDocument(parseInt(shopId), orderParams);
            blobs.push(blob);

            // Update progress setelah berhasil mengunduh
            setBulkProgress(prev => ({
              ...prev,
              processed: prev.processed + carrierOrders.length,
              currentCarrier: carrier || 'Unknown',
              currentShop: shopName
            }));

            // Log untuk debugging
            console.log(`Successfully downloaded documents for carrier ${carrier}:`, {
              processed: carrierOrders.length,
              total_processed: carrierOrders.length
            });

          } catch (error) {
            console.error(`Error downloading documents for carrier ${carrier}:`, error);
            toast.error(`Gagal mengunduh dokumen untuk ${carrier}`);
          }

          // Delay kecil antara setiap kurir
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Proses PDF untuk toko ini
        if (blobs.length > 0) {
          try {
            const mergedPDF = await mergePDFs(blobs);
            const pdfUrl = URL.createObjectURL(mergedPDF);
            
            const newWindow = window.open('', '_blank');
            if (newWindow) {
              newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>${shopName}</title>
                  </head>
                  <body style="margin:0;padding:0;height:100vh;">
                    <embed src="${pdfUrl}" type="application/pdf" width="100%" height="100%">
                  </body>
                </html>
              `);
              newWindow.document.close();
            }

            setTimeout(() => {
              URL.revokeObjectURL(pdfUrl);
            }, 1000);

          } catch (error) {
            console.error(`Error merging PDFs for shop ${shopName}:`, error);
            toast.error(`Gagal menggabungkan PDF untuk ${shopName}`);
          }
        }
      }
      
      // Update status cetak
      if (onOrderUpdate) {
        unprintedOrders.forEach(order => {
          onOrderUpdate(order.order_sn, { is_printed: true });
        });
      }
      
      toast.success('Proses pencetakan selesai');

    } catch (error) {
      console.error('Gagal mencetak dokumen:', error);
      toast.error('Gagal mencetak dokumen');
    } finally {
      // Reset progress bar setelah selesai
      setTimeout(() => {
        setBulkProgress({
          processed: 0,
          total: 0,
          currentCarrier: '',
          currentShop: ''
        });
      }, 2000);
    }
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

  // Tambahkan useEffect untuk mengupdate title
  useEffect(() => {
    const readyToShipCount = orders.filter(order => order.order_status === 'READY_TO_SHIP').length;
    if (readyToShipCount > 0) {
      document.title = `(${readyToShipCount}) New Orders`;
    } else {
      document.title = 'Dashboard Pesanan';
    }

    // Cleanup function
    return () => {
      document.title = 'Dashboard Pesanan';
    };
  }, [orders]);

  // Tambahkan state ini
  const [isUnprintedConfirmOpen, setIsUnprintedConfirmOpen] = useState(false);

  // Tambahkan state untuk dialog konfirmasi print semua
  const [isPrintAllConfirmOpen, setIsPrintAllConfirmOpen] = useState(false);

  // Update fungsi handleBulkPrint untuk menampilkan konfirmasi terlebih dahulu
  const handleBulkPrintClick = () => {
    setIsPrintAllConfirmOpen(true);
  };

  // Fungsi untuk menangani konfirmasi print semua
  const handleConfirmPrintAll = async () => {
    setIsPrintAllConfirmOpen(false);
    await handleBulkPrint();
  };

  // Update URL endpoint untuk memproses pesanan
  const handleProcessOrder = async (order: OrderItem) => {
    try {
      toast.promise(
        async () => {
          const response = await fetch('/api/process-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              shopId: order.shop_id,
              orderSn: order.order_sn
            })
          });

          const data = await response.json();
          
          if (!data.success) {
            throw new Error(data.message || 'Gagal memproses pesanan');
          }

          // Update local state jika berhasil
          if (onOrderUpdate) {
            onOrderUpdate(order.order_sn, {
              order_status: 'PROCESSED'
            });
          }

          return data;
        },
        {
          loading: 'Memproses pesanan...',
          success: 'Pesanan berhasil diproses',
          error: (err) => `${err.message}`
        }
      );
    } catch (error) {
      console.error('Gagal memproses pesanan:', error);
    }
  };

  // Tambahkan state untuk tracking progress bulk process
  const [bulkProcessProgress, setBulkProcessProgress] = useState<{
    processed: number;
    total: number;
    currentOrder: string;
  }>({
    processed: 0,
    total: 0,
    currentOrder: ''
  });

  // Tambahkan state untuk dialog konfirmasi
  const [isProcessAllConfirmOpen, setIsProcessAllConfirmOpen] = useState(false);

  // Fungsi untuk mendapatkan jumlah pesanan yang siap kirim
  const getReadyToShipCount = () => {
    return orders.filter(order => order.order_status === 'READY_TO_SHIP').length;
  };

  // Fungsi untuk memproses semua pesanan
  const handleProcessAllOrders = async () => {
    const readyToShipOrders = orders.filter(order => order.order_status === 'READY_TO_SHIP');
    
    if (readyToShipOrders.length === 0) {
      toast.info('Tidak ada pesanan yang perlu diproses');
      return;
    }

    try {
      // Inisialisasi progress
      setBulkProcessProgress({
        processed: 0,
        total: readyToShipOrders.length,
        currentOrder: ''
      });

      for (const order of readyToShipOrders) {
        setBulkProcessProgress(prev => ({
          ...prev,
          currentOrder: order.order_sn
        }));

        try {
          const response = await fetch('/api/process-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              shopId: order.shop_id,
              orderSn: order.order_sn
            })
          });

          const data = await response.json();
          
          if (!data.success) {
            console.error(`Gagal memproses pesanan ${order.order_sn}:`, data.message);
            toast.error(`Gagal memproses pesanan ${order.order_sn}`);
            continue;
          }

          // Update local state
          if (onOrderUpdate) {
            onOrderUpdate(order.order_sn, {
              order_status: 'PROCESSED'
            });
          }

          setBulkProcessProgress(prev => ({
            ...prev,
            processed: prev.processed + 1
          }));

          // Delay kecil antara setiap request
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`Gagal memproses pesanan ${order.order_sn}:`, error);
          toast.error(`Gagal memproses pesanan ${order.order_sn}`);
        }
      }

      toast.success('Proses selesai');

    } catch (error) {
      console.error('Gagal memproses pesanan:', error);
      toast.error('Terjadi kesalahan saat memproses pesanan');
    } finally {
      // Reset progress setelah selesai
      setTimeout(() => {
        setBulkProcessProgress({
          processed: 0,
          total: 0,
          currentOrder: ''
        });
      }, 2000);
    }
  };

  // Tambahkan fungsi untuk mendapatkan jumlah pesanan yang meminta pembatalan
  const getCancelRequestCount = () => {
    return orders.filter(order => order.order_status === 'IN_CANCEL').length;
  };

  // Tambahkan state untuk dialog konfirmasi reject all
  const [isRejectAllConfirmOpen, setIsRejectAllConfirmOpen] = useState(false);

  // Tambahkan state untuk tracking progress bulk reject
  const [bulkRejectProgress, setBulkRejectProgress] = useState<{
    processed: number;
    total: number;
    currentOrder: string;
  }>({
    processed: 0,
    total: 0,
    currentOrder: ''
  });

  // Tambahkan fungsi untuk menolak semua pembatalan
  const handleRejectAllCancellations = async () => {
    const cancelRequests = orders.filter(order => order.order_status === 'IN_CANCEL');
    
    if (cancelRequests.length === 0) {
      toast.info('Tidak ada permintaan pembatalan');
      return;
    }

    try {
      // Inisialisasi progress
      setBulkRejectProgress({
        processed: 0,
        total: cancelRequests.length,
        currentOrder: ''
      });

      for (const order of cancelRequests) {
        setBulkRejectProgress(prev => ({
          ...prev,
          currentOrder: order.order_sn
        }));

        try {
          const response = await fetch('/api/orders/handle-cancellation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              shopId: order.shop_id,
              orderSn: order.order_sn,
              operation: 'REJECT'
            })
          });

          const result = await response.json();
          
          if (result.success) {
            if (onOrderUpdate) {
              onOrderUpdate(order.order_sn, {
                order_status: 'READY_TO_SHIP'
              });
            }
          } else {
            console.error(`Gagal menolak pembatalan ${order.order_sn}:`, result.message);
            toast.error(`Gagal menolak pembatalan ${order.order_sn}`);
          }

          setBulkRejectProgress(prev => ({
            ...prev,
            processed: prev.processed + 1
          }));

          // Delay kecil antara setiap request
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`Gagal menolak pembatalan ${order.order_sn}:`, error);
          toast.error(`Gagal menolak pembatalan ${order.order_sn}`);
        }
      }

      toast.success('Proses penolakan pembatalan selesai');

    } catch (error) {
      console.error('Gagal menolak pembatalan:', error);
      toast.error('Terjadi kesalahan saat menolak pembatalan');
    } finally {
      // Reset progress setelah selesai
      setTimeout(() => {
        setBulkRejectProgress({
          processed: 0,
          total: 0,
          currentOrder: ''
        });
      }, 2000);
    }
  };

  return (
    <div className="w-full">
      {bulkProgress.total > 0 && (
        <div className="mb-4 p-3 sm:p-4 bg-white dark:bg-gray-800 border rounded-lg shadow-sm">
          {/* Main Container */}
          <div className="flex items-center justify-between gap-2 mb-2">
            {/* Left Section: Progress & Shop */}
            <div className="flex items-center gap-2 min-w-0">
              {/* Progress Counter */}
              <div className="flex items-center gap-2">
                <Printer size={16} className="text-primary dark:text-white animate-pulse shrink-0" />
                <span className="text-xs sm:text-sm font-medium dark:text-white whitespace-nowrap">
                  {bulkProgress.processed}/{bulkProgress.total}
                </span>
              </div>

              {/* Shop Info */}
              {bulkProgress.currentShop && (
                <span className="flex items-center gap-1 shrink-0">
                  <Package size={14} className="dark:text-white shrink-0" />
                  <span className="truncate max-w-[100px] sm:max-w-[200px] text-xs text-gray-600 dark:text-gray-300">
                    {bulkProgress.currentShop}
                  </span>
                </span>
              )}
            </div>

            {/* Right Section: Carrier */}
            {bulkProgress.currentCarrier && (
              <span className="flex items-center gap-1 shrink-0">
                <Truck size={14} className="dark:text-white shrink-0" />
                <span className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {bulkProgress.currentCarrier}
                </span>
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-primary dark:bg-primary-foreground h-1.5 rounded-full transition-all duration-500 ease-in-out"
              style={{ 
                width: `${(bulkProgress.processed / bulkProgress.total) * 100}%` 
              }}
            />
          </div>

          {/* Progress Message */}
          <p className="mt-1.5 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
            Mohon tunggu hingga proses selesai...
          </p>
        </div>
      )}

      {/* Progress Bar untuk Bulk Process */}
      {bulkProcessProgress.total > 0 && (
        <div className="mb-4 p-3 sm:p-4 bg-white dark:bg-gray-800 border rounded-lg shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-2">
                <Send size={16} className="text-primary dark:text-white animate-pulse" />
                <span className="text-xs sm:text-sm font-medium dark:text-white">
                  {bulkProcessProgress.processed}/{bulkProcessProgress.total}
                </span>
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-primary dark:bg-primary-foreground h-1.5 rounded-full transition-all duration-500 ease-in-out"
              style={{ 
                width: `${(bulkProcessProgress.processed / bulkProcessProgress.total) * 100}%` 
              }}
            />
          </div>
          <p className="mt-1.5 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
            Memproses pesanan... {bulkProcessProgress.currentOrder}
          </p>
        </div>
      )}

      {/* Progress Bar untuk Bulk Reject */}
      {bulkRejectProgress.total > 0 && (
        <div className="mb-4 p-3 sm:p-4 bg-white dark:bg-gray-800 border rounded-lg shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-red-500 dark:text-red-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-medium dark:text-white">
                  {bulkRejectProgress.processed}/{bulkRejectProgress.total}
                </span>
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-red-500 dark:bg-red-400 h-1.5 rounded-full transition-all duration-500 ease-in-out"
              style={{ 
                width: `${(bulkRejectProgress.processed / bulkRejectProgress.total) * 100}%` 
              }}
            />
          </div>
          <p className="mt-1.5 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
            Menolak pembatalan... {bulkRejectProgress.currentOrder}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 w-full mt-2">
        {/* Card Kategori, Pencarian, dan Filter */}
        <Card className="px-2 py-2 shadow-none rounded-lg">
          {/* Mobile Layout */}
          <div className="flex flex-col gap-2 sm:hidden">
            {/* Baris 1: Kategori */}
            <div className="w-full">
              <Select value={activeCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger>
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

            {/* Baris 2: Checkbox, Pencarian dan Filter */}
            <div className="flex items-center gap-2">
              {/* Tombol checkbox */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleCheckbox}
                className="h-8 w-8 p-0 shrink-0"
              >
                <CheckSquare 
                  size={18}
                  className={showCheckbox ? "text-primary" : "text-gray-500"}
                />
              </Button>

              {/* Input Pencarian */}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Cari username, kurir, atau no. pesanan"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-2 py-1 pl-8 border rounded-md w-full text-xs h-8 dark:bg-gray-800 dark:text-white dark:border-gray-700"
                />
                <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>

              {/* Filter Popover */}
              <Popover>
                <PopoverTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0"
                  >
                    <Filter size={18} className="text-gray-500 dark:text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 dark:bg-gray-800 dark:border-gray-700" align="end" side="bottom" sideOffset={5}>
                  <div className="space-y-2">
                    <h3 className="font-semibold dark:text-white">Filter Toko</h3>
                    {shops.map(shop => (
                      <div key={shop} className="flex items-center space-x-2">
                        <Checkbox
                          id={shop}
                          checked={selectedShops.includes(shop)}
                          onCheckedChange={() => handleShopFilter(shop)}
                        />
                        <label htmlFor={shop} className="text-sm dark:text-gray-300">{shop}</label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between gap-2">
            {/* Bagian Kiri: Checkbox dan Kategori */}
            <div className="flex items-center gap-2 overflow-x-auto">
              {/* Tombol checkbox */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleCheckbox}
                className="h-6 w-6 p-0 shrink-0"
              >
                <CheckSquare 
                  size={16} 
                  className={showCheckbox ? "text-primary" : "text-gray-500"}
                />
              </Button>

              {/* Desktop buttons */}
              <div className="flex space-x-2">
                {updatedCategories.map(category => (
                  <button
                    key={category.name}
                    onClick={() => handleCategoryChange(category.name)}
                    className={`px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap
                      ${activeCategory === category.name
                        ? 'bg-primary text-white dark:bg-primary-foreground dark:text-primary'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                  >
                    {category.name} <span className="ml-1 text-xs font-normal">({category.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bagian Kanan: Pencarian dan Filter */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Input Pencarian */}
              <div className="relative w-[300px]">
                <input
                  type="text"
                  placeholder="Cari username, kurir, atau no. pesanan"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-2 py-1 pl-8 border rounded-md w-full text-xs h-[32px] dark:bg-gray-800 dark:text-white dark:border-gray-700"
                />
                <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>

              {/* Filter Popover */}
              <Popover>
                <PopoverTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 p-0"
                  >
                    <Filter size={18} className="text-gray-500 dark:text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 dark:bg-gray-800 dark:border-gray-700" align="end" side="bottom" sideOffset={5}>
                  <div className="space-y-2">
                    <h3 className="font-semibold dark:text-white">Filter Toko</h3>
                    {shops.map(shop => (
                      <div key={shop} className="flex items-center space-x-2">
                        <Checkbox
                          id={shop}
                          checked={selectedShops.includes(shop)}
                          onCheckedChange={() => handleShopFilter(shop)}
                        />
                        <label htmlFor={shop} className="text-sm dark:text-gray-300">{shop}</label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </Card>

        {/* Card Tombol */}
        <Card className="px-2 py-2 shadow-none rounded-lg">
          <div className="flex justify-between">
            {/* Grup Tombol Pesanan - Sebelah Kiri */}
            <div className="flex gap-2">
              <Button
                onClick={() => setIsProcessAllConfirmOpen(true)}
                className="px-2 sm:px-3 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap h-[32px] min-h-0 dark:bg-blue-700 dark:hover:bg-blue-800"
                disabled={getReadyToShipCount() === 0}
                title="Proses Semua Pesanan"
              >
                <Send size={14} className="sm:mr-1" />
                <span className="hidden sm:inline">
                  Proses Semua ({getReadyToShipCount()})
                </span>
                <span className="sm:hidden ml-1">
                  ({getReadyToShipCount()})
                </span>
              </Button>

              <Button
                onClick={() => setIsRejectAllConfirmOpen(true)}
                className="px-2 sm:px-3 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 text-white whitespace-nowrap h-[32px] min-h-0 dark:bg-red-700 dark:hover:bg-red-800"
                disabled={getCancelRequestCount() === 0}
                title="Tolak Semua Pembatalan"
              >
                <XCircle size={14} className="sm:mr-1" />
                <span className="hidden sm:inline">
                  Tolak Pembatalan ({getCancelRequestCount()})
                </span>
                <span className="sm:hidden ml-1">
                  ({getCancelRequestCount()})
                </span>
              </Button>
            </div>

            {/* Grup Tombol Cetak - Sebelah Kanan */}
            <div className="flex gap-2">
              <Button
                onClick={handlePrintUnprinted}
                className="px-2 sm:px-3 py-2 text-xs font-medium bg-green-600 hover:bg-green-700 text-white whitespace-nowrap h-[32px] min-h-0 dark:bg-green-700 dark:hover:bg-green-800"
                disabled={getUnprintedDocuments() === 0}
                title="Cetak Dokumen Belum Print"
              >
                <Printer size={14} className="sm:mr-1" />
                <span className="hidden sm:inline">
                  Belum Print ({getUnprintedDocuments()})
                </span>
                <span className="sm:hidden ml-1">
                  ({getUnprintedDocuments()})
                </span>
              </Button>

              <Button
                onClick={handleBulkPrintClick}
                className={`px-2 sm:px-3 py-2 text-xs font-medium text-white whitespace-nowrap h-[32px] min-h-0
                  ${selectedOrders.length > 0 
                    ? 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700' 
                    : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
                  }`}
                title={selectedOrders.length > 0 
                  ? `Cetak ${selectedOrders.length} Dokumen`
                  : `Cetak Semua (${getTotalPrintableDocuments()})`
                }
              >
                <PrinterCheck size={14} className="sm:mr-1" />
                <span className="hidden sm:inline">
                  {selectedOrders.length > 0 
                    ? `Cetak ${selectedOrders.length} Dokumen`
                    : `Cetak Semua (${getTotalPrintableDocuments()})`
                  }
                </span>
                <span className="sm:hidden ml-1">
                  ({selectedOrders.length || getTotalPrintableDocuments()})
                </span>
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="rounded-md border overflow-x-auto mt-2">
        <Table className="w-full dark:bg-gray-900">
          <TableHeader>
            <TableRow className="dark:border-gray-700">
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
                      ? 'bg-red-100 dark:bg-red-900/50' 
                      : order.order_status === "CANCELLED"
                        ? 'bg-gray-300 dark:bg-gray-800' 
                        : index % 2 === 0 
                          ? 'bg-muted dark:bg-gray-800/50' 
                          : 'bg-gray-100/20 dark:bg-gray-900'
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
                    <StatusBadge 
                      status={order.order_status as OrderStatus} 
                      order={order}
                      onProcess={handleProcessOrder}
                      onCancellationAction={handleCancellationAction}
                    />
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
                <TableCell colSpan={11} className="text-center py-4 dark:text-gray-400">
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
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">
              Konfirmasi Pembatalan
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-300">
              Apakah Anda yakin ingin {selectedAction.action === 'ACCEPT' ? 'menerima' : 'menolak'} pembatalan untuk pesanan ini?
              {selectedAction.action === 'ACCEPT' 
                ? ' Pesanan akan dibatalkan.'
                : ' Pembeli tidak akan dapat mengajukan pembatalan lagi.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:border-gray-600">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              className={`${
                selectedAction.action === 'ACCEPT'
                  ? 'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
              } text-white`}
            >
              {selectedAction.action === 'ACCEPT' ? 'Terima Pembatalan' : 'Tolak Pembatalan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isUnprintedConfirmOpen} onOpenChange={setIsUnprintedConfirmOpen}>
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">
              Konfirmasi Cetak Dokumen Belum Print
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-300">
              Anda akan mencetak {getUnprintedDocuments()} dokumen yang belum pernah dicetak sebelumnya. 
              Setelah dicetak, dokumen akan ditandai sebagai sudah dicetak. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:border-gray-600">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmUnprinted}
              className="bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
            >
              Cetak Dokumen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isPrintAllConfirmOpen} onOpenChange={setIsPrintAllConfirmOpen}>
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">
              Konfirmasi Cetak Dokumen
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-300">
              Anda akan mencetak {selectedOrders.length > 0 
                ? selectedOrders.length 
                : getTotalPrintableDocuments()} dokumen yang siap cetak. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:border-gray-600">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmPrintAll}
              className="bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
            >
              Cetak Dokumen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <OrderHistory 
        userId={selectedUserId}
        isOpen={isOrderHistoryOpen}
        onClose={() => setIsOrderHistoryOpen(false)}
      />

      {/* Tambahkan Dialog Konfirmasi */}
      <AlertDialog open={isProcessAllConfirmOpen} onOpenChange={setIsProcessAllConfirmOpen}>
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">
              Konfirmasi Proses Pesanan
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-300">
              Anda akan memproses {getReadyToShipCount()} pesanan yang siap kirim. 
              Proses ini tidak dapat dibatalkan. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:border-gray-600">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setIsProcessAllConfirmOpen(false);
                handleProcessAllOrders();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              Proses Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tambahkan Dialog Konfirmasi Reject All */}
      <AlertDialog open={isRejectAllConfirmOpen} onOpenChange={setIsRejectAllConfirmOpen}>
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">
              Konfirmasi Tolak Semua Pembatalan
            </AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-300">
              Anda akan menolak {getCancelRequestCount()} permintaan pembatalan pesanan. 
              Pembeli tidak akan dapat mengajukan pembatalan lagi untuk pesanan-pesanan ini. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 dark:border-gray-600">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setIsRejectAllConfirmOpen(false);
                handleRejectAllCancellations();
              }}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800"
            >
              Tolak Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}