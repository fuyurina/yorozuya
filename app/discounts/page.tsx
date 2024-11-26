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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DiscountModel {
  model_id: number;
  model_promotion_price: number;
  model_promotion_stock: number;
}

interface DiscountItem {
  item_id: number;
  model_list: DiscountModel[];
}

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
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateData, setDuplicateData] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);

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

  const handleDuplicateClick = async (e: React.MouseEvent, shop: any, discount: any) => {
    e.stopPropagation();
    
    try {
      // Mengambil detail promo
      const response = await fetch(
        `/api/discount/${discount.discount_id}?shopId=${shop.shop_id}`
      );
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data diskon');
      }
      
      const discountDetail = await response.json();
      
      // Hitung waktu untuk promo baru
      const oldEndTime = discountDetail.data.end_time * 1000;
      const newStartTime = oldEndTime + (60 * 1000);
      const newEndTime = newStartTime + (179 * 24 * 60 * 60 * 1000) - (60 * 1000);

      // Siapkan data item
      const itemList = discountDetail.data.item_list.map((item: DiscountItem) => ({
        item_id: item.item_id,
        model_list: item.model_list.map((model: DiscountModel) => ({
          model_id: model.model_id,
          model_promotion_price: model.model_promotion_price,
          model_promotion_stock: model.model_promotion_stock || 0
        }))
      }));

      // Request untuk membuat promo baru
      const createDiscountRequest = {
        method: 'POST',
        url: '/api/discount',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          shopId: shop.shop_id,
          discountData: {
            discount_name: discountDetail.data.discount_name,
            start_time: Math.floor(newStartTime / 1000),
            end_time: Math.floor(newEndTime / 1000)
          }
        }
      };

      // Request untuk menambahkan item (akan digunakan setelah promo dibuat)
      const addItemsRequest = {
        method: 'POST',
        url: `/api/discount/[discount_id]?action=add-items`, // discount_id akan diisi setelah promo dibuat
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          shopId: shop.shop_id,
          items: itemList
        }
      };

      // Tampilkan preview request
      setPreviewData({
        createDiscountRequest,
        addItemsRequest,
        times: {
          oldEndTime,
          newStartTime,
          newEndTime
        }
      });
      
      setShowDuplicateDialog(true);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Gagal mengambil data diskon');
    }
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

  const handleDuplicateNow = () => {
    const oldEndTime = duplicateData.data.end_time * 1000;
    const newStartTime = oldEndTime + (60 * 1000);
    const newEndTime = newStartTime + (179 * 24 * 60 * 60 * 1000) - (60 * 1000);

    const itemList = duplicateData.data.item_list.map((item: DiscountItem) => ({
      item_id: item.item_id,
      model_list: item.model_list.map((model: DiscountModel) => ({
        model_id: model.model_id,
        model_promotion_price: model.model_promotion_price,
        model_promotion_stock: model.model_promotion_stock || 0
      }))
    }));

    const newDiscountData = {
      discount_name: duplicateData.data.discount_name,
      start_time: Math.floor(newStartTime / 1000),
      end_time: Math.floor(newEndTime / 1000),
      item_list: itemList
    };

    const requestPreview = {
      method: 'POST',
      url: '/api/discount',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        shopId: duplicateData.data.shop_id,
        discountData: newDiscountData
      }
    };

    setPreviewData({
      request: requestPreview,
      times: {
        oldEndTime,
        newStartTime,
        newEndTime
      }
    });
  };

  const handleSendRequest = async () => {
    try {
      console.log('Memulai proses duplikasi promo...');
      console.log('Data preview:', previewData);

      // 1. Membuat promo baru tanpa item
      console.log('Step 1: Membuat promo baru...');
      const createDiscountResponse = await fetch(previewData.createDiscountRequest.url, {
        method: previewData.createDiscountRequest.method,
        headers: previewData.createDiscountRequest.headers,
        body: JSON.stringify(previewData.createDiscountRequest.body)
      });

      console.log('Response status:', createDiscountResponse.status);
      const createDiscountResult = await createDiscountResponse.json();
      console.log('Create discount result:', createDiscountResult);

      if (!createDiscountResult.success) {
        throw new Error(createDiscountResult.error || 'Gagal membuat promo baru');
      }

      // 2. Menambahkan item ke promo yang baru dibuat
      console.log('Step 2: Menambahkan item ke promo...');
      console.log('Items yang akan ditambahkan:', previewData.addItemsRequest.body.items);
      
      const addItemsResponse = await fetch(
        `/api/discount/${createDiscountResult.data.discount_id}?action=add-items&shopId=${previewData.createDiscountRequest.body.shopId}`, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shopId: previewData.createDiscountRequest.body.shopId,
            items: previewData.addItemsRequest.body.items
          })
        }
      );

      console.log('Add items response status:', addItemsResponse.status);
      const addItemsResult = await addItemsResponse.json();
      console.log('Add items result:', addItemsResult);

      if (!addItemsResult.success) {
        // Jika gagal menambahkan item, hapus promo yang baru dibuat
        console.log('Gagal menambahkan item, menghapus promo...');
        await fetch(
          `/api/discount/${createDiscountResult.data.discount_id}?shopId=${previewData.createDiscountRequest.body.shopId}`,
          { method: 'DELETE' }
        );
        throw new Error(addItemsResult.error || 'Gagal menambahkan item ke promo');
      }

      // Jika semua berhasil
      console.log('Duplikasi promo berhasil!');
      setShowDuplicateDialog(false);
      setPreviewData(null);
      router.refresh();

    } catch (error: any) {
      console.error('Error detail:', error);
      alert(`Gagal menduplikasi promo: ${error.message}`);
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
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleDuplicateClick(e, shop, discount)}
                      >
                        Duplikat
                      </Button>
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

      {/* Dialog Duplikasi */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Request Duplikasi Promo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Request Pembuatan Promo */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">1. Request Pembuatan Promo Baru:</h3>
              <div className="bg-slate-50 p-4 rounded-md">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify({
                    url: previewData?.createDiscountRequest.url,
                    method: previewData?.createDiscountRequest.method,
                    body: previewData?.createDiscountRequest.body
                  }, null, 2)}
                </pre>
              </div>
            </div>

            {/* Request Penambahan Item */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">2. Request Penambahan Item:</h3>
              <div className="bg-slate-50 p-4 rounded-md">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify({
                    url: previewData?.addItemsRequest.url,
                    method: previewData?.addItemsRequest.method,
                    body: previewData?.addItemsRequest.body
                  }, null, 2)}
                </pre>
              </div>
            </div>

            {/* Informasi Waktu */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Informasi Waktu:</h3>
              <div className="bg-slate-50 p-4 rounded-md space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-slate-500">Promo Lama Berakhir:</span>
                  <span>{new Date(previewData?.times.oldEndTime).toLocaleString('id-ID')}</span>
                  
                  <span className="text-slate-500">Promo Baru Mulai:</span>
                  <span>{new Date(previewData?.times.newStartTime).toLocaleString('id-ID')}</span>
                  
                  <span className="text-slate-500">Promo Baru Berakhir:</span>
                  <span>{new Date(previewData?.times.newEndTime).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowDuplicateDialog(false)}
            >
              Batal
            </Button>
            <Button 
              variant="default"
              onClick={handleSendRequest}
            >
              Kirim Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 