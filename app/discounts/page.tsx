'use client';

import { useDiscounts } from '@/hooks/useDiscounts';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

export default function DiscountsPage() {
  const router = useRouter();
  const { 
    discounts, 
    isLoading, 
    error, 
    selectedStatus, 
    setSelectedStatus 
  } = useDiscounts();
  const [selectedDiscount, setSelectedDiscount] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Memuat data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ongoing':
        return 'bg-green-500/15 text-green-700 hover:bg-green-500/20';
      case 'upcoming':
        return 'bg-blue-500/15 text-blue-700 hover:bg-blue-500/20';
      case 'expired':
        return 'bg-gray-500/15 text-gray-700 hover:bg-gray-500/20';
      default:
        return 'bg-gray-500/15 text-gray-700 hover:bg-gray-500/20';
    }
  };

  const handleRowClick = (shopId: number, discountId: number) => {
    router.push(`/discounts/${discountId}?shopId=${shopId}`);
  };

  const handleAddDiscount = () => {
    router.push('/discounts/create');
  };

  const handleDeleteClick = (e: React.MouseEvent, shop: any, discount: any) => {
    e.stopPropagation();
    setSelectedDiscount({ shopId: shop.shop_id, discountId: discount.discount_id });
    setShowDeleteDialog(true);
  };

  const handleEndClick = (e: React.MouseEvent, shop: any, discount: any) => {
    e.stopPropagation();
    setSelectedDiscount({ shopId: shop.shop_id, discountId: discount.discount_id });
    setShowEndDialog(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(
        `/api/discount/${selectedDiscount.discountId}?shopId=${selectedDiscount.shopId}`,
        {
          method: 'DELETE',
        }
      );
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Gagal menghapus promo');
      }
      
      // Refresh halaman untuk memperbarui data
      router.refresh();
    } catch (error: any) {
      console.error('Error deleting discount:', error);
      alert(error.message);
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const confirmEnd = async () => {
    try {
      const response = await fetch(
        `/api/discount/${selectedDiscount.discountId}?action=end`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shopId: selectedDiscount.shopId,
          }),
        }
      );
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Gagal mengakhiri promo');
      }
      
      // Refresh halaman untuk memperbarui data
      router.refresh();
    } catch (error: any) {
      console.error('Error ending discount:', error);
      alert(error.message);
    } finally {
      setShowEndDialog(false);
    }
  };

  return (
    <div className="container mx-auto py-2 px-4">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-lg font-semibold">Daftar Promo Toko</h1>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleAddDiscount}>
            Tambah Promo
          </Button>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px] h-8 text-sm">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="ongoing">Sedang Berjalan</SelectItem>
              <SelectItem value="upcoming">Akan Datang</SelectItem>
              <SelectItem value="expired">Sudah Berakhir</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Nama Toko</TableHead>
              <TableHead className="w-[250px]">Nama Promo</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[150px]">Mulai</TableHead>
              <TableHead className="w-[150px]">Selesai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.map((shop) =>
              shop.discounts.map((discount) => (
                <TableRow 
                  key={`${shop.shop_id}-${discount.discount_id}`}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleRowClick(shop.shop_id, discount.discount_id)}
                >
                  <TableCell className="font-medium text-sm">
                    {shop.shop_name}
                  </TableCell>
                  <TableCell className="text-sm">
                    {discount.discount_name}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={`${getStatusColor(discount.status)} text-xs`}
                    >
                      {discount.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {discount.start_time_formatted}
                  </TableCell>
                  <TableCell className="text-sm">
                    {discount.end_time_formatted}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {discount.status.toLowerCase() === 'ongoing' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => handleEndClick(e, shop, discount)}
                        >
                          Akhiri
                        </Button>
                      )}
                      {discount.status.toLowerCase() !== 'expired' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => handleDeleteClick(e, shop, discount)}
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

      {/* Dialog Konfirmasi Hapus */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Promo</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus promo ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Konfirmasi Akhiri */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Akhiri Promo</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengakhiri promo ini sekarang?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEnd}>Akhiri</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 