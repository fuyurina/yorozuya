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
import { toast } from '@/components/ui/use-toast';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
        toast({
          title: 'Gagal mengambil daftar toko',
          description: 'Terjadi kesalahan saat mengambil daftar toko',
          variant: 'destructive'
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
        setFlashSales(data.data.flash_sale_list);
        setTotalCount(data.data.total_count);
      } else {
        toast({
          title: 'Gagal mengambil daftar flash sale',
          description: data.message || 'Gagal mengambil daftar flash sale',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Terjadi kesalahan saat mengambil daftar flash sale',
        description: 'Terjadi kesalahan saat mengambil daftar flash sale',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlashSale = () => {
    router.push('/flashsale/create');
  };

  const handleUpdateStatus = async (flashSaleId: number, newStatus: 1 | 2) => {
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
        toast({
          title: 'Status flash sale berhasil diperbarui',
          description: 'Status flash sale berhasil diperbarui',
        });
        fetchFlashSales();
      } else {
        toast({
          title: 'Gagal memperbarui status flash sale',
          description: data.message || 'Gagal memperbarui status flash sale',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Terjadi kesalahan saat memperbarui status',
        description: 'Terjadi kesalahan saat memperbarui status',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (flashSaleId: number) => {
    try {
      const response = await fetch(`/api/flashsale/delete?shop_id=${selectedShop}&flash_sale_id=${flashSaleId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Flash sale berhasil dihapus',
          description: 'Flash sale berhasil dihapus'
        });
        fetchFlashSales();
      } else {
        toast({
          title: 'Gagal menghapus flash sale',
          description: data.message || 'Gagal menghapus flash sale',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Terjadi kesalahan saat menghapus flash sale',
        description: 'Terjadi kesalahan saat menghapus flash sale',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: number) => {
    const statusConfig: Record<number, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
      0: { label: 'Dihapus', variant: 'destructive' },
      1: { label: 'Aktif', variant: 'outline' },
      2: { label: 'Nonaktif', variant: 'secondary' },
      3: { label: 'Ditolak', variant: 'destructive' }
    };
    const config = statusConfig[status] || { label: 'Tidak Diketahui', variant: 'default' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const columns = [
    {
      title: 'ID Flash Sale',
      dataIndex: 'flash_sale_id',
      key: 'flash_sale_id',
      render: (_: any, record: FlashSale) => record.flash_sale_id
    },
    {
      title: 'Periode',
      key: 'period',
      render: (_: any, record: FlashSale) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {dayjs(record.start_time * 1000).format('DD/MM/YYYY HH:mm')}
          </div>
          <div className="text-sm text-muted-foreground">
            {dayjs(record.end_time * 1000).format('DD/MM/YYYY HH:mm')}
          </div>
        </div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: FlashSale) => getStatusBadge(record.status)
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
            {record.click_count} klik • {record.remindme_count} pengingat
          </div>
        </div>
      )
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (_: any, record: FlashSale) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/flashsale/${record.flash_sale_id}`)}
          >
            Detail
          </Button>
          {record.status === 2 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleUpdateStatus(record.flash_sale_id, 1)}
            >
              Aktifkan
            </Button>
          )}
          {record.status === 1 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleUpdateStatus(record.flash_sale_id, 2)}
            >
              Nonaktifkan
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(record.flash_sale_id)}
          >
            Hapus
          </Button>
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight">Manajemen Flash Sale</h1>
        <Button onClick={handleCreateFlashSale}>
          Buat Flash Sale Baru
        </Button>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex gap-4 mb-6">
            <Select
              value={selectedShop?.toString()}
              onValueChange={(value) => setSelectedShop(Number(value))}
            >
              <SelectTrigger className="w-[200px]">
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

            <Select
              value={selectedType.toString()}
              onValueChange={(value) => setSelectedType(Number(value))}
            >
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

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(column => (
                    <TableHead key={column.key}>{column.title}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-8">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Memuat data...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : flashSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                      Tidak ada data flash sale
                    </TableCell>
                  </TableRow>
                ) : (
                  flashSales.map(item => (
                    <TableRow key={item.flash_sale_id}>
                      {columns.map(column => (
                        <TableCell key={`${item.flash_sale_id}-${column.key}`}>
                          {column.render ? column.render(null, item) : item[column.key as keyof FlashSale]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      <div className="mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            
            {/* Halaman pertama */}
            {currentPage > 2 && (
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(1)}>
                  1
                </PaginationLink>
              </PaginationItem>
            )}

            {/* Ellipsis awal */}
            {currentPage > 3 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {/* Halaman sebelumnya */}
            {currentPage > 1 && (
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(currentPage - 1)}>
                  {currentPage - 1}
                </PaginationLink>
              </PaginationItem>
            )}

            {/* Halaman saat ini */}
            <PaginationItem>
              <PaginationLink isActive>
                {currentPage}
              </PaginationLink>
            </PaginationItem>

            {/* Halaman berikutnya */}
            {currentPage < totalPages && (
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(currentPage + 1)}>
                  {currentPage + 1}
                </PaginationLink>
              </PaginationItem>
            )}

            {/* Ellipsis akhir */}
            {currentPage < totalPages - 2 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {/* Halaman terakhir */}
            {currentPage < totalPages - 1 && (
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(totalPages)}>
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            )}

            <PaginationItem>
              <PaginationNext 
                onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>

        <div className="text-sm text-muted-foreground text-center mt-2">
          Menampilkan {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} dari {totalCount} data
        </div>
      </div>
    </div>
  );
} 