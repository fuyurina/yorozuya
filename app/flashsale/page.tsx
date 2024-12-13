'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { getAllShops } from '@/app/services/shopeeService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { format } from 'date-fns';
import { X, AlertTriangle, Plus, CalendarDays, Clock, Eye, Bell, MoreVertical, Check, Trash2 } from 'lucide-react';
import { Switch } from "@/components/ui/switch";

import { Checkbox } from "@/components/ui/checkbox"

interface FlashSale {
  flash_sale_id: number;
  timeslot_id: number;
  status: number;
  start_time: number;
  end_time: number;
  enabled_item_count: number;
  item_count: number;
  type: number;
  click_count: number;
  remindme_count: number;
}

interface FlashSaleResponse {
  flash_sale_list: FlashSale[];
  total_count: number;
}

interface TimeSlot {
  timeslot_id: number;
  start_time: number;
  end_time: number;
}

interface TimeSlotsByDate {
  [date: string]: TimeSlot[];
}

// Tambahkan type untuk status
type FlashSaleStatus = 1 | 2;

// Definisikan interface untuk progress detail
interface ProgressDetail {
  step: 'create' | 'register' | 'complete';
  flash_sale_id: number;
  timeslot_id?: number;
  total_items?: number;
  successful_items?: number;
  status: string;
  success?: boolean;
}

export default function FlashSalePage() {
  const [loading, setLoading] = useState(false);
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedShop, setSelectedShop] = useState<number>();
  const [shops, setShops] = useState<Array<{ shop_id: number; shop_name: string }>>([]);
  const [selectedType, setSelectedType] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.ceil(totalCount / pageSize);
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>();
  const [date, setDate] = useState<Date>();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [timeSlotsByDate, setTimeSlotsByDate] = useState<TimeSlotsByDate>({});
  const [showStatusConfirmDialog, setShowStatusConfirmDialog] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
    flashSaleId: number;
    newStatus: FlashSaleStatus;
  } | null>(null);
  const [selectedDialogShop, setSelectedDialogShop] = useState<number>();
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [duplicatingFlashSaleId, setDuplicatingFlashSaleId] = useState<number | null>(null);
  const [duplicateProgress, setDuplicateProgress] = useState<{
    total: number;
    current: number;
    status: string;
  } | null>(null);
  const [progressDetails, setProgressDetails] = useState<Record<number, ProgressDetail>>({});
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [isDeletingItems, setIsDeletingItems] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [deletingFlashSale, setDeletingFlashSale] = useState<number | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);

  // Tambahkan fungsi helper untuk mengambil slot waktu
  const fetchTimeSlots = async (shopId: number) => {
    try {
      const response = await fetch(`/api/flashsale/timeslot?shop_id=${shopId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        // Organisir time slots berdasarkan tanggal
        const slotsByDate: TimeSlotsByDate = {};
        data.data.forEach((slot: TimeSlot) => {
          const date = format(new Date(slot.start_time * 1000), 'yyyy-MM-dd');
          if (!slotsByDate[date]) {
            slotsByDate[date] = [];
          }
          slotsByDate[date].push(slot);
        });
        return slotsByDate;
      }
      throw new Error(data.message || 'Gagal mendapatkan slot waktu');
    } catch (error) {
      throw error;
    }
  };

  // Mengambil daftar toko
  useEffect(() => {
    const fetchShops = async () => {
      try {
        const shops = await getAllShops();
        if (shops && shops.length > 0) {
          setShops(shops);
          setSelectedShop(shops[0].shop_id);
        }
      } catch (error) {
        toast.error('Gagal mengambil daftar toko', {
          description: 'Terjadi kesalahan saat mengambil daftar toko'
        });
        console.error('Error fetching shops:', error);
      }
    };
    fetchShops();
  }, []);

  // Mengambil daftar flash sale ketika toko dipilih
  useEffect(() => {
    if (selectedShop) {
      fetchFlashSales();
    }
  }, [selectedShop, selectedType]);

  const fetchFlashSales = async (page: number = 1, pageSize: number = 10) => {
    if (!selectedShop) return;
    
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const response = await fetch(`/api/flashsale/list?shop_id=${selectedShop}&type=${selectedType}&offset=${offset}&limit=${pageSize}`);
      const data = await response.json();
      if (data.success) {
        setFlashSales(data.data.flash_sale_list || []);
        setTotalCount(data.data.total_count || 0);
      } else {
        toast.error('Gagal mengambil daftar flash sale', {
          description: data.message || 'Gagal mengambil daftar flash sale'
        });
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengambil daftar flash sale', {
        description: 'Terjadi kesalahan saat mengambil daftar flash sale'
      });
    } finally {
      setLoading(false);
    }
  };

  // Update fungsi handleShopChange
  const handleShopChange = (value: string) => {
    const shopId = parseInt(value);
    setSelectedShop(shopId);
  };

  // Tambahkan handler khusus untuk dropdown di dialog
  const handleDialogShopChange = async (value: string) => {
    const shopId = parseInt(value);
    setSelectedDialogShop(shopId);
    setSelectedTimeSlot(undefined);
    setDate(undefined);
    setTimeSlots([]);
    
    try {
      const slots = await fetchTimeSlots(shopId);
      setTimeSlotsByDate(slots);
    } catch (error) {
      toast.error('Error', {
        description: 'Gagal mengambil slot waktu yang tersedia'
      });
    }
  };

  // Update fungsi handleCreateFlashSale
  const handleCreateFlashSale = async () => {
    if (!selectedShop) {
      toast.error('Pilih Toko', {
        description: 'Silakan pilih toko terlebih dahulu'
      });
      return;
    }
    
    setSelectedDialogShop(selectedShop);
    setSelectedTimeSlot(undefined);
    setDate(undefined);
    setTimeSlots([]);
    
    setCalendarLoading(true);
    try {
      const slots = await fetchTimeSlots(selectedShop);
      setTimeSlotsByDate(slots);
      setIsCreateDialogOpen(true);
    } catch (error) {
      toast.error('Error', {
        description: 'Gagal mengambil slot waktu yang tersedia'
      });
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleDateChange = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    setDate(selectedDate);
    
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const slotsForDate = timeSlotsByDate[dateKey] || [];
    setTimeSlots(slotsForDate);
  };

  const handleConfirmTimeSlot = async () => {
    if (!selectedTimeSlot || !selectedDialogShop) {
      toast.error('Error', {
        description: 'Silakan pilih slot waktu terlebih dahulu'
      });
      return;
    }

    // Dapatkan nama toko yang dipilih
    const selectedShopName = shops.find(shop => shop.shop_id === selectedDialogShop)?.shop_name;
    if (!selectedShopName) {
      toast.error('Error', {
        description: 'Data toko tidak ditemukan'
      });
      return;
    }

    try {
      const response = await fetch('/api/flashsale/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: selectedDialogShop,
          timeslot_id: selectedTimeSlot.timeslot_id
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Berhasil', {
          description: 'Flash sale berhasil dibuat'
        });
        // Tambahkan shop_name ke URL
        router.push(`/flashsale/detail?shop_id=${selectedDialogShop}&shop_name=${encodeURIComponent(selectedShopName)}&flash_sale_id=${data.data.flash_sale_id}`);
      } else {
        toast.error('Gagal', {
          description: data.message || 'Gagal membuat flash sale'
        });
      }
    } catch (error) {
      toast.error('Error', {
        description: 'Terjadi kesalahan saat membuat flash sale'
      });
    } finally {
      setIsCreateDialogOpen(false);
    }
  };

  const handleUpdateStatus = async (flashSaleId: number, newStatus: FlashSaleStatus) => {
    // Jika akan menonaktifkan (status 2), tampilkan konfirmasi
    if (newStatus === 2) {
      setPendingStatusUpdate({ flashSaleId, newStatus });
      setShowStatusConfirmDialog(true);
      return;
    }
    
    // Jika mengaktifkan, langsung proses
    await updateFlashSaleStatus(flashSaleId, newStatus);
  };

  // Fungsi untuk memproses update status
  const updateFlashSaleStatus = async (flashSaleId: number, newStatus: FlashSaleStatus) => {
    try {
      const response = await fetch('/api/flashsale/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: selectedShop,
          flash_sale_id: flashSaleId,
          status: newStatus
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(newStatus === 1 ? 'Flash sale berhasil diaktifkan' : 'Flash sale berhasil dinonaktifkan', {
          description: newStatus === 2 ? 'Semua produk dalam sesi ini telah dinonaktifkan' : undefined
        });
        fetchFlashSales();
      } else {
        toast.error('Gagal memperbarui status flash sale', {
          description: data.message || 'Gagal memperbarui status flash sale'
        });
      }
    } catch (error) {
      toast.error('Terjadi kesalahan', {
        description: 'Gagal memperbarui status flash sale'
      });
    }
  };

  const handleDelete = async (flashSaleId: number) => {
    // Tampilkan dialog konfirmasi dulu
    setDeletingFlashSale(flashSaleId);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDelete = async () => {
    if (!deletingFlashSale) return;
    
    setIsDeletingSingle(true);
    try {
      const response = await fetch(`/api/flashsale/delete?shop_id=${selectedShop}&flash_sale_id=${deletingFlashSale}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        // Dapatkan informasi flash sale yang dihapus
        const deletedFlashSale = flashSales.find(sale => sale.flash_sale_id === deletingFlashSale);
        const startTime = dayjs(deletedFlashSale?.start_time ? deletedFlashSale.start_time * 1000 : undefined);
        
        toast.success(`Flash sale ${deletingFlashSale} berhasil dihapus`, {
          description: (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Periode: {startTime.format('DD/MM/YYYY HH:mm')}
              </p>
            </div>
          )
        });
        fetchFlashSales();
      } else {
        toast.error('Gagal menghapus flash sale', {
          description: data.message || 'Gagal menghapus flash sale'
        });
      }
    } catch (error) {
      toast.error('Terjadi kesalahan', {
        description: 'Gagal menghapus flash sale'
      });
    } finally {
      setIsDeletingSingle(false);
      setDeletingFlashSale(null);
      setShowDeleteConfirmDialog(false);
    }
  };

  const handleDuplicate = async (flashSaleId: number) => {
    setDuplicatingFlashSaleId(flashSaleId);
    setSelectedSlots([]); // Reset selected slots
    
    try {
      const response = await fetch(`/api/flashsale/timeslot?shop_id=${selectedShop}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setTimeSlots(data.data);
        setIsDuplicateDialogOpen(true);
      } else {
        toast.error('Error', {
          description: 'Gagal mengambil slot waktu yang tersedia'
        });
      }
    } catch (error) {
      toast.error('Error', {
        description: 'Terjadi kesalahan saat mengambil slot waktu'
      });
    }
  };

  const handleConfirmDuplicate = async () => {
    if (!selectedSlots.length || !duplicatingFlashSaleId) {
      toast.warning('Pilih Slot', {
        description: 'Silakan pilih minimal satu slot waktu'
      });
      return;
    }

    setDuplicateProgress({
      total: selectedSlots.length,
      current: 0,
      status: 'Memulai proses duplikasi...'
    });
    setProgressDetails({});

    try {
      const response = await fetch('/api/flashsale/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: selectedShop,
          flash_sale_id: duplicatingFlashSaleId,
          timeslot_ids: selectedSlots
        })
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Tidak dapat membaca response');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.progress) {
              setDuplicateProgress({
                total: data.progress.total,
                current: data.progress.current,
                status: data.progress.status
              });

              if (data.progress.detail) {
                const { flash_sale_id, step, ...rest } = data.progress.detail;
                if (flash_sale_id) {
                  setProgressDetails(prev => ({
                    ...prev,
                    [flash_sale_id]: {
                      ...prev[flash_sale_id],
                      step,
                      flash_sale_id,
                      status: data.progress.status,
                      ...rest
                    }
                  }));
                }
              }
            } else if (data.success) {
              const { summary } = data.data;
              setDuplicateProgress({
                total: selectedSlots.length,
                current: selectedSlots.length,
                status: `Selesai: ${summary.successful_slots} dari ${summary.total_slots} slot berhasil diduplikasi (${summary.successful_items} items)`
              });
            }
          }
        }
      }
    } catch (error) {
      setDuplicateProgress(null);
      toast.error('Error', {
        description: 'Terjadi kesalahan saat menduplikasi flash sale'
      });
    }
  };

  const getStatusBadge = (status: number, type: number) => {
    switch (type) {
      case 1:
        return <Badge variant="secondary">Akan Datang</Badge>
      case 2:
        return <Badge className="bg-green-500">Sedang Berlangsung</Badge>
      case 3:
        return <Badge variant="destructive">Berakhir</Badge>
      default:
        return null;
    }
  };

  const columns = [
    {
      title: 'Periode',
      key: 'period',
      render: (_: any, record: FlashSale) => (
        <div className="space-y-1">
          <div className="flex items-center text-sm">
            <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
            {dayjs(record.start_time * 1000).format('DD/MM/YYYY')}
          </div>
          <div className="flex items-center text-sm">
            <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
            <span className="font-semibold text-blue-600">
              {dayjs(record.start_time * 1000).format('HH:mm')} - {dayjs(record.end_time * 1000).format('HH:mm')}
            </span>
          </div>
        </div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: FlashSale) => getStatusBadge(record.status, record.type)
    },
    {
      title: 'Statistik',
      key: 'stats',
      render: (_: any, record: FlashSale) => (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="font-medium">{record.enabled_item_count}</span>
            <span className="text-muted-foreground"> / {record.item_count} item aktif</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {record.click_count} klik  {record.remindme_count} pengingat
          </div>
        </div>
      )
    },
    {
      title: 'Status Aktif',
      key: 'activeStatus',
      render: (_: any, record: FlashSale) => (
        <div className="flex items-center space-x-2">
          <Switch
            checked={record.status === 1}
            disabled={record.status === 3}
            onCheckedChange={(checked) => {
              handleUpdateStatus(record.flash_sale_id, checked ? 1 : 2);
            }}
          />
          <span className="text-sm text-muted-foreground">
            {record.status === 1 ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>
      )
    },
    {
      title: 'ID Flash Sale',
      dataIndex: 'flash_sale_id',
      key: 'flash_sale_id',
      render: (_: any, record: FlashSale) => record.flash_sale_id
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (_: any, record: FlashSale) => (
        <div className="text-right">
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const shopName = shops.find(shop => shop.shop_id === selectedShop)?.shop_name;
                router.push(`/flashsale/detail?shop_id=${selectedShop}&shop_name=${encodeURIComponent(shopName || '')}&flash_sale_id=${record.flash_sale_id}`);
              }}
            >
              Detail
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDuplicate(record.flash_sale_id)}
            >
              Duplikat
            </Button>
            {record.status !== 3 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(record.flash_sale_id)}
              >
                Hapus
              </Button>
            )}
          </div>
        </div>
      )
    }
  ];

  const typeOptions = [
    { value: 0, label: 'Semua Status' },
    { value: 1, label: 'Akan Datang' },
    { value: 2, label: 'Sedang Berlangsung' },
    { value: 3, label: 'Berakhir' }
  ];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchFlashSales(page, pageSize);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hasSlots = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return timeSlotsByDate[dateKey]?.length > 0;
  };

  const getSlotCount = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const slots = timeSlotsByDate[dateKey] || [];
    return slots.length > 0 ? `${slots.length} slot` : "";
  };

  const handleBulkDelete = async () => {
    setShowDeleteConfirmDialog(true);
  };

  const confirmBulkDelete = async () => {
    if (!selectedItems.length) return;
    
    setIsDeletingItems(true);
    try {
      const promises = selectedItems.map(flashSaleId =>
        fetch(`/api/flashsale/delete?shop_id=${selectedShop}&flash_sale_id=${flashSaleId}`, {
          method: 'DELETE'
        }).then(res => res.json())
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(result => result.success).length;
      const failCount = selectedItems.length - successCount;

      // Dapatkan total produk yang terdampak
      const affectedItems = selectedItems
        .map(id => flashSales.find(sale => sale.flash_sale_id === id))
        .reduce((total, sale) => total + (sale?.item_count || 0), 0);

      if (successCount > 0) {
        toast.success('Flash sale berhasil dihapus', {
          description: (
            <div className="space-y-1 mt-1">
              <p>{successCount} flash sale telah dihapus</p>
              {failCount > 0 && (
                <p className="text-sm text-yellow-600">
                  {failCount} flash sale gagal dihapus
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Total {affectedItems} produk telah dikeluarkan dari flash sale
              </p>
            </div>
          )
        });
        fetchFlashSales();
      } else {
        toast.error('Gagal menghapus flash sale', {
          description: 'Semua operasi penghapusan gagal'
        });
      }
      
      setSelectedItems([]);
    } catch (error) {
      toast.error('Terjadi kesalahan', {
        description: 'Gagal menghapus flash sale'
      });
    } finally {
      setIsDeletingItems(false);
      setShowDeleteConfirmDialog(false);
    }
  };

  // Update dialog konfirmasi untuk mendukung single dan bulk delete
  const DeleteConfirmDialog = () => (
    <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
      <DialogContent>
        <DialogTitle>Konfirmasi Penghapusan</DialogTitle>
        <DialogDescription className="space-y-3">
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
            {deletingFlashSale ? (
              <p>Peringatan: Anda akan menghapus Flash Sale #{deletingFlashSale}.</p>
            ) : (
              <p>Peringatan: Anda akan menghapus {selectedItems.length} flash sale.</p>
            )}
          </div>
          <p>Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin melanjutkan?</p>
        </DialogDescription>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowDeleteConfirmDialog(false);
              setDeletingFlashSale(null);
            }}
            disabled={isDeletingSingle || isDeletingItems}
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={deletingFlashSale ? confirmDelete : confirmBulkDelete}
            disabled={isDeletingSingle || isDeletingItems}
          >
            {isDeletingSingle || isDeletingItems ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Ya, Hapus
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Manajemen Flash Sale</h1>
        <div className="flex gap-2">
          {selectedItems.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Hapus {selectedItems.length} Flash Sale
            </Button>
          )}
          <Button className="bg-primary" onClick={handleCreateFlashSale}>
            {calendarLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Buat Flash Sale
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={selectedShop?.toString()} onValueChange={handleShopChange}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Pilih Toko" />
          </SelectTrigger>
          <SelectContent>
            {shops.map(shop => (
              <SelectItem key={shop.shop_id} value={shop.shop_id.toString()}>
                {shop.shop_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedType.toString()} onValueChange={(value) => setSelectedType(Number(value))}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status Flash Sale" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map(option => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    flashSales.length > 0 && selectedItems.length === flashSales.length
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedItems(flashSales.map((sale) => sale.flash_sale_id));
                    } else {
                      setSelectedItems([]);
                    }
                  }}
                />
              </TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Statistik</TableHead>
              <TableHead>Status Aktif</TableHead>
              <TableHead>ID Flash Sale</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memuat data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : flashSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-[400px]">
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="relative mb-4">
                      <CalendarDays className="h-12 w-12 text-gray-400" strokeWidth={1.5} />
                      <X className="h-6 w-6 text-gray-400 absolute -top-2 -right-2" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      Belum Ada Flash Sale
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 text-center max-w-[300px]">
                      Buat flash sale pertama Anda untuk meningkatkan penjualan dengan penawaran terbatas waktu
                    </p>
                    <Button onClick={handleCreateFlashSale}>
                      <Plus className="w-4 h-4 mr-2" />
                      Buat Flash Sale
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              flashSales.map((sale) => (
                <TableRow key={sale.flash_sale_id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.includes(sale.flash_sale_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems([...selectedItems, sale.flash_sale_id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== sale.flash_sale_id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-sm">
                        <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
                        {dayjs(sale.start_time * 1000).format('DD/MM/YYYY')}
                      </div>
                      <div className="flex items-center text-sm">
                        <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="font-semibold text-blue-600">
                          {dayjs(sale.start_time * 1000).format('HH:mm')} - {dayjs(sale.end_time * 1000).format('HH:mm')}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(sale.status, sale.type)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <div className="text-sm">
                        {sale.enabled_item_count} / {sale.item_count} item aktif
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Eye className="w-4 h-4 mr-1" />
                          {sale.click_count} klik
                        </span>
                        <span className="flex items-center">
                          <Bell className="w-4 h-4 mr-1" />
                          {sale.remindme_count} pengingat
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={sale.status === 1}
                        disabled={sale.status === 3}
                        onCheckedChange={(checked) => {
                          handleUpdateStatus(sale.flash_sale_id, checked ? 1 : 2);
                        }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {sale.status === 1 ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{sale.flash_sale_id}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const shopName = shops.find(shop => shop.shop_id === selectedShop)?.shop_name;
                          router.push(`/flashsale/detail?shop_id=${selectedShop}&shop_name=${encodeURIComponent(shopName || '')}&flash_sale_id=${sale.flash_sale_id}`);
                        }}
                      >
                        Detail
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(sale.flash_sale_id)}
                      >
                        Duplikat
                      </Button>
                      {sale.status !== 3 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(sale.flash_sale_id)}
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
        <div>
          Menampilkan {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} dari {totalCount} data
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          
          {/* First page */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handlePageChange(1)}
            className={currentPage === 1 ? "bg-primary text-white hover:bg-primary" : ""}
          >
            1
          </Button>

          {/* Show dots if there are many pages before current page */}
          {currentPage > 3 && <span>...</span>}

          {/* Current page and surrounding pages */}
          {currentPage > 2 && currentPage < totalPages - 1 && (
            <Button 
              variant="outline" 
              size="sm"
              className="bg-primary text-white hover:bg-primary"
            >
              {currentPage}
            </Button>
          )}

          {/* Show dots if there are many pages after current page */}
          {currentPage < totalPages - 2 && <span>...</span>}

          {/* Last page */}
          {totalPages > 1 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              className={currentPage === totalPages ? "bg-primary text-white hover:bg-primary" : ""}
            >
              {totalPages}
            </Button>
          )}

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[900px] p-0">
          <div className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between gap-4 pr-8">
              <h2 className="text-xl font-semibold">
                Buat Flash Sale Baru
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Toko:</span>
                <Select
                  value={selectedDialogShop?.toString()}
                  onValueChange={handleDialogShopChange}
                >
                  <SelectTrigger className="w-[300px] border-gray-300 bg-white focus:ring-black">
                    <SelectValue placeholder="Pilih Toko" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops.map(shop => (
                      <SelectItem key={shop.shop_id} value={shop.shop_id.toString()}>
                        {shop.shop_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {!selectedShop && (
            <div className="px-6 py-3 bg-yellow-50 border-b">
              <div className="flex items-center gap-2 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span>Silakan pilih toko terlebih dahulu untuk melihat slot waktu yang tersedia</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-0">
            {/* Kolom Kalender */}
            <div className="p-8 border-r border-t">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                className="w-full"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4 w-full",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-base font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex w-full",
                  head_cell: "text-slate-500 rounded-md w-12 font-normal text-[0.875rem]",
                  row: "flex w-full mt-2",
                  cell: "relative p-0 text-center text-sm w-12 h-12",
                  day: "h-12 w-12 p-0 font-normal text-sm",
                  day_selected: "bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white",
                }}
                components={{
                  DayContent: ({ date }) => (
                    <div className="flex flex-col items-center justify-center h-12 w-12">
                      <span className="text-sm">{date.getDate()}</span>
                      {hasSlots(date) && (
                        <span className="text-[11px] text-red-500 -mt-0.5">{getSlotCount(date)}</span>
                      )}
                    </div>
                  )
                }}
              />
            </div>

            {/* Kolom Slot Waktu */}
            <div className="p-6 border-t h-[600px] flex flex-col">
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="text-sm font-medium text-gray-700">Sesi Flash Sale</h3>
                <h3 className="text-sm font-medium text-gray-700">Kuota Produk</h3>
              </div>
              <RadioGroup
                value={selectedTimeSlot?.timeslot_id.toString()}
                onValueChange={(value) => {
                  const slot = timeSlots.find(s => s.timeslot_id === parseInt(value));
                  if (slot) {
                    setSelectedTimeSlot(slot);
                  }
                }}
                className="space-y-2.5 overflow-y-auto pr-2 custom-scrollbar"
              >
                {timeSlots.map((slot) => (
                  <div 
                    key={slot.timeslot_id} 
                    className="flex items-center justify-between p-3 rounded-md border border-gray-200 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      const value = slot.timeslot_id.toString();
                      setSelectedTimeSlot(slot);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem 
                        value={slot.timeslot_id.toString()} 
                        className="w-4 h-4"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {`${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          Durasi: {((slot.end_time - slot.start_time) / 3600).toFixed(1)} jam
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-900">50</span>
                      <p className="text-xs text-gray-500">produk tersisa</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="px-6"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmTimeSlot}
              className="px-6 bg-black text-white hover:bg-black/90"
            >
              Buat Flash Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showStatusConfirmDialog} onOpenChange={setShowStatusConfirmDialog}>
        <DialogContent>
          <DialogTitle>Konfirmasi Nonaktifkan Flash Sale</DialogTitle>
          <DialogDescription className="space-y-3">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-5 w-5" />
              <p>Peringatan: Menonaktifkan Flash Sale ini akan menonaktifkan semua produk dalam sesi ini.</p>
            </div>
            <p>Apakah Anda yakin ingin melanjutkan?</p>
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusConfirmDialog(false);
                setPendingStatusUpdate(null);
              }}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (pendingStatusUpdate) {
                  await updateFlashSaleStatus(
                    pendingStatusUpdate.flashSaleId,
                    pendingStatusUpdate.newStatus
                  );
                }
                setShowStatusConfirmDialog(false);
                setPendingStatusUpdate(null);
              }}
            >
              Ya, Nonaktifkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogTitle>Duplikasi Flash Sale</DialogTitle>
          
          {duplicateProgress ? (
            <div className="py-6">
              <div className="space-y-5">
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500 ease-in-out"
                      style={{ 
                        width: `${(duplicateProgress.current / duplicateProgress.total) * 100}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progress</span>
                    <span>{duplicateProgress.current} dari {duplicateProgress.total} slot</span>
                  </div>
                </div>

                {/* Status text */}
                <div className="text-sm text-center text-muted-foreground">
                  {duplicateProgress.status}
                </div>

                {/* Detail progress */}
                <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                  {Object.values(progressDetails).map((detail) => (
                    <div 
                      key={detail.flash_sale_id}
                      className={`p-3 rounded-md border ${
                        detail.successful_items !== undefined ? 'border-green-200 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {detail.successful_items !== undefined ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          )}
                          <span className="text-sm font-medium">
                            Flash Sale #{detail.flash_sale_id}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {detail.successful_items !== undefined 
                            ? `${detail.successful_items} items`
                            : detail.total_items 
                              ? `${detail.total_items} items`
                              : ''
                          }
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                        {detail.status}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {duplicateProgress.current === duplicateProgress.total && (
                <div className="mt-6 flex justify-end">
                  <Button
                    onClick={() => {
                      setIsDuplicateDialogOpen(false);
                      setDuplicateProgress(null);
                      fetchFlashSales();
                    }}
                  >
                    Selesai
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    Pilih slot waktu untuk menduplikasi flash sale ini (maksimal 20 slot)
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedSlots.length > 0 && selectedSlots.length === Math.min(timeSlots.length, 20)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const slotsToSelect = timeSlots.slice(0, 20).map(slot => slot.timeslot_id);
                          setSelectedSlots(slotsToSelect);
                        } else {
                          setSelectedSlots([]);
                        }
                      }}
                    />
                    <span className="text-sm">Pilih Semua</span>
                  </div>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {timeSlots.map((slot) => {
                    const isSelected = selectedSlots.includes(slot.timeslot_id);
                    return (
                      <div
                        key={slot.timeslot_id}
                        className={`flex items-center justify-between p-3 rounded-md border ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-gray-200'
                        } hover:bg-gray-50 cursor-pointer`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSlots(selectedSlots.filter(id => id !== slot.timeslot_id));
                          } else if (selectedSlots.length < 20) {
                            setSelectedSlots([...selectedSlots, slot.timeslot_id]);
                          } else {
                            toast.warning('Maksimal 20 Slot', {
                              description: 'Anda hanya dapat memilih maksimal 20 slot waktu'
                            });
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => {}}
                            className="pointer-events-none"
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {dayjs(slot.start_time * 1000).format('DD/MM/YYYY')}
                            </p>
                            <p className="text-sm font-semibold text-blue-600">
                              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <DialogFooter>
                <div className="flex items-center justify-between w-full">
                  <div className="text-sm text-muted-foreground">
                    {selectedSlots.length} slot dipilih
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDuplicateDialogOpen(false)}
                    >
                      Batal
                    </Button>
                    <Button
                      onClick={handleConfirmDuplicate}
                      disabled={selectedSlots.length === 0}
                    >
                      Duplikasi
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog />
    </div>
  );
} 