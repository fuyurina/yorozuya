'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { getAllShops } from '@/app/services/shopeeService';
import Image from 'next/image';

// Shadcn UI imports
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar"

import { format } from "date-fns"

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast"; // Ganti message dari antd
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Shop {
  shop_id: number;
  shop_name: string;
}

interface Item {
  item_id: number;
  model_id: number;
  name: string;
  model_name: string;
  original_price: number;
  current_price: number;
  promotion_price: number;
  stock: number;
}

interface TimeSlot {
  end_time: number;
  start_time: number;
  timeslot_id: number;
}

interface TimeSlotsByDate {
  [key: string]: TimeSlot[];
}

interface Product {
  item_id: number;
  item_name: string;
  item_sku: string;
  isSelected?: boolean;
  image: {
    image_url_list: string[];
  };
  models: {
    model_id: number;
    model_name: string;
    price_info: {
      current_price: number;
      original_price: number;
    };
    stock_info: {
      total_available_stock: number;
      seller_stock: number;
      total_reserved_stock: number;
    };
  }[];
}

// Tambahkan interface baru untuk pengelompokan item
interface GroupedItem {
  item_id: number;
  name: string;
  models: Item[];
}

// Tambahkan interface untuk error item
interface FailedItem {
  err_code: number;
  err_msg: string;
  item_id: number;
  model_id: number;
  unqualified_conditions: {
    unqualified_code: number;
    unqualified_msg: string;
  }[];
}

// Fungsi untuk mengelompokkan items
const groupItems = (items: Item[]): GroupedItem[] => {
  const grouped = items.reduce((acc: { [key: number]: GroupedItem }, item) => {
    if (!acc[item.item_id]) {
      acc[item.item_id] = {
        item_id: item.item_id,
        name: item.name,
        models: []
      };
    }
    acc[item.item_id].models.push(item);
    return acc;
  }, {});
  
  return Object.values(grouped);
};

export default function CreateFlashSalePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<number>();
  const [selectedItems, setSelectedItems] = useState<Item[]>([]);
  const [timeSlotId, setTimeSlotId] = useState<number>();
  const [date, setDate] = useState<Date>()
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>();
  const [timeSlotsByDate, setTimeSlotsByDate] = useState<TimeSlotsByDate>({});
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]); 
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [collapsedItems, setCollapsedItems] = useState<Set<number>>(new Set());
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [promoPrice, setPromoPrice] = useState<number | null>(null);
  const [stockValue, setStockValue] = useState<number | null>(null);
  const [updateType, setUpdateType] = useState<'fixed' | 'percentage'>('fixed');
  const [flashSaleId, setFlashSaleId] = useState<number | null>(null);
  const [failedItems, setFailedItems] = useState<FailedItem[]>([]);
  const [activatedModels, setActivatedModels] = useState<Set<string>>(new Set());
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [registeredItems, setRegisteredItems] = useState<Set<number>>(new Set());

  // Mengambil daftar toko
  useEffect(() => {
    const fetchShops = async () => {
      try {
        const shops = await getAllShops();
        if (shops && shops.length > 0) {
          setShops(shops);
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: 'Gagal mengambil daftar toko',
        });
        console.error('Error fetching shops:', error);
      }
    };
    fetchShops();
  }, []);
  const handleShopChange = (value: string) => {
    const shopId = parseInt(value);
    setSelectedShop(shopId);
    setSelectedItems([]);
  };

  const handleCalendarOpen = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!selectedShop) {
      toast({
        variant: "destructive",
        title: "Error",
        description: 'Silakan pilih toko terlebih dahulu',
      });
      return;
    }

    setIsDialogOpen(true);
    
    try {
      
      const response = await fetch(`/api/flashsale/timeslot?shop_id=${selectedShop}`);
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
        setTimeSlotsByDate(slotsByDate);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: 'Gagal mendapatkan slot waktu',
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: 'Gagal mengambil slot waktu yang tersedia',
      });
      console.error('Error fetching time slots:', error);
    }
  };

  const handleDateChange = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    setDate(selectedDate);
    
    // Ambil time slots untuk tanggal yang dipilih
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const slotsForDate = timeSlotsByDate[dateKey] || [];
    setTimeSlots(slotsForDate);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmit = async (values: any) => {
    if (!selectedShop || !timeSlotId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: 'Mohon pilih toko dan slot waktu flash sale',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/flashsale/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: selectedShop,
          timeslot_id: timeSlotId
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          variant: "default",
          title: "Success",
          description: `Slot flash sale berhasil dipesan dengan ID: ${data.flashSaleId}`,
        });
        router.push('/flashsale');
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || 'Gagal memesan slot flash sale',
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: 'Terjadi kesalahan saat memesan slot flash sale',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk menghitung jumlah slot per tanggal
  const getSlotCount = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const slots = timeSlotsByDate[dateKey] || [];
    return slots.length > 0 ? `${slots.length} slot` : "";
  };

  // Fungsi untuk mengecek apakah tanggal memiliki slot
  const hasSlots = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return timeSlotsByDate[dateKey]?.length > 0;
  };

  const handleAddProduct = async () => {
    if (!selectedShop) return;
    
    setIsProductDialogOpen(true);
    setLoadingProducts(true);
    
    try {
      const response = await fetch(`/api/produk?shop_id=${selectedShop}`);
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data.items);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: 'Gagal mengambil daftar produk',
        });
      }
    } catch (error) {
      toast({
        variant: "destructive", 
        title: "Error",
        description: 'Terjadi kesalahan saat mengambil data produk',
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleProductSelect = (productId: number) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProductIds(newSelected);
  };

  const handleSelectAllProducts = () => {
    if (selectedProductIds.size === products.length) {
      // Jika semua sudah terpilih, hapus semua pilihan
      setSelectedProductIds(new Set());
    } else {
      // Pilih semua produk
      setSelectedProductIds(new Set(products.map(p => p.item_id)));
    }
  };

  const handleConfirmProducts = () => {
    const selectedProducts = products.filter(p => selectedProductIds.has(p.item_id));
    
    const newItems: Item[] = selectedProducts.flatMap(product => 
      product.models.map(model => ({
        item_id: product.item_id,
        model_id: model.model_id,
        name: product.item_name,
        model_name: model.model_name,
        original_price: model.price_info.original_price,
        current_price: model.price_info.current_price,
        promotion_price: model.price_info.current_price,
        stock: Math.min(20, (model.stock_info?.seller_stock ?? 0) - (model.stock_info?.total_reserved_stock ?? 0))
      }))
    );

    setSelectedItems([...selectedItems, ...newItems]);
    setIsProductDialogOpen(false);
    setSelectedProductIds(new Set()); // Reset pilihan setelah konfirmasi
  };

  const toggleCollapse = (itemId: number) => {
    const newCollapsed = new Set(collapsedItems);
    if (newCollapsed.has(itemId)) {
      newCollapsed.delete(itemId);
    } else {
      newCollapsed.add(itemId);
    }
    setCollapsedItems(newCollapsed);
  };

  // Fungsi untuk handle checkbox model
  const toggleModelSelection = (itemId: number, modelId: number) => {
    const modelKey = `${itemId}-${modelId}`;
    const newSelected = new Set(selectedModels);
    if (newSelected.has(modelKey)) {
      newSelected.delete(modelKey);
    } else {
      newSelected.add(modelKey);
    }
    setSelectedModels(newSelected);
  };

  // Fungsi untuk mass update
  const handleMassUpdate = (field: 'promotion_price' | 'stock' | 'discount', value: number) => {
    const newItems = selectedItems.map((item) => {
      const modelKey = `${item.item_id}-${item.model_id}`;
      if (selectedModels.has(modelKey)) {
        if (field === 'promotion_price') {
          // Pastikan harga promo tidak melebihi harga original
          if (value > item.original_price) {
            return { ...item, promotion_price: item.original_price };
          }
          return { ...item, promotion_price: value };
        } else if (field === 'stock') {
          return { ...item, stock: value };
        } else if (field === 'discount') {
          const discountAmount = Math.floor(item.original_price * (value / 100));
          const newPrice = item.original_price - discountAmount;
          // Pastikan harga setelah diskon tidak negatif
          return { ...item, promotion_price: Math.max(0, newPrice) };
        }
      }
      return item;
    });
    setSelectedItems(newItems);
  };

  // Tambahkan fungsi untuk handle select all models dalam satu item
  const toggleAllModels = (itemId: number, models: Item[]) => {
    const newSelected = new Set(selectedModels);
    const allModelKeys = models.map(model => `${itemId}-${model.model_id}`);
    
    // Check if all models are already selected
    const allSelected = models.every(model => 
      newSelected.has(`${itemId}-${model.model_id}`)
    );
    
    if (allSelected) {
      // Unselect all models of this item
      allModelKeys.forEach(key => newSelected.delete(key));
    } else {
      // Select all models of this item
      allModelKeys.forEach(key => newSelected.add(key));
    }
    
    setSelectedModels(newSelected);
  };

  // Tambahkan fungsi untuk handle select/unselect all items
  const toggleAllItems = () => {
    const newSelected = new Set(selectedModels);
    const allModelKeys = selectedItems.map(item => `${item.item_id}-${item.model_id}`);
    
    // Check if all models are already selected
    const allSelected = allModelKeys.every(key => selectedModels.has(key));
    
    if (allSelected) {
      // Unselect all models
      newSelected.clear();
    } else {
      // Select all models
      allModelKeys.forEach(key => newSelected.add(key));
    }
    
    setSelectedModels(newSelected);
  };

  // Modifikasi fungsi untuk menangani konfirmasi slot waktu
  const handleConfirmTimeSlot = async () => {
    if (!selectedTimeSlot) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Silakan pilih slot waktu terlebih dahulu",
      });
      return;
    }

    // Set timeSlotId dan tutup dialog
    setTimeSlotId(selectedTimeSlot.timeslot_id);
    setIsDialogOpen(false);

    try {
      const response = await fetch('/api/flashsale/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: selectedShop,
          timeslot_id: selectedTimeSlot.timeslot_id
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          variant: "default",
          title: "Success",
          description: "Slot flash sale berhasil dipesan.",
        });

        // Simpan flash_sale_id dari respons API
        setFlashSaleId(data.data.flash_sale_id);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || 'Gagal memesan slot flash sale',
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: 'Terjadi kesalahan saat memesan slot flash sale',
      });
    }
  };

  // Fungsi untuk mengaktifkan item yang dipilih
  const handleActivateItems = async () => {
    if (!selectedShop || !flashSaleId || selectedModels.size === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Pilih toko, dapatkan flash sale ID, dan pilih model terlebih dahulu"
      });
      return;
    }

    // Kelompokkan model berdasarkan item_id
    const modelsByItem = Array.from(selectedModels).reduce((acc: { [key: number]: any[] }, modelKey) => {
      const [itemId, modelId] = modelKey.split('-').map(Number);
      if (!acc[itemId]) {
        acc[itemId] = [];
      }
      
      const modelData = selectedItems.find(
        item => item.item_id === itemId && item.model_id === Number(modelId)
      );

      if (modelData) {
        acc[itemId].push({
          model_id: modelData.model_id,
          input_promo_price: modelData.promotion_price,
          stock: modelData.stock,
          status: 1 // Menggunakan 1 untuk enable
        });
      }
      return acc;
    }, {});

    // Pisahkan item yang sudah terdaftar dan yang belum
    const newItems: any[] = [];
    const updateItems: any[] = [];

    Object.entries(modelsByItem).forEach(([itemId, models]) => {
      const numItemId = Number(itemId);
      const hasActiveModel = registeredItems.has(numItemId);

      if (registeredItems.has(numItemId)) {
        updateItems.push({
          item_id: numItemId,
          models: models
        });
      } else {
        newItems.push({
          item_id: numItemId,
          purchase_limit: 0,
          models: models
        });
      }
    });

    try {
      let successCount = 0;
      let failureCount = 0;
      const newFailedItems: FailedItem[] = [];

      // Proses item baru menggunakan API add
      if (newItems.length > 0) {
        const addResponse = await fetch('/api/flashsale/items/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop_id: selectedShop,
            flash_sale_id: flashSaleId,
            items: newItems
          })
        });

        const addData = await addResponse.json();
        
        if (addData.success) {
          // Update registeredItems untuk semua item yang berhasil didaftarkan
          newItems.forEach(item => {
            if (!addData.data?.failed_items?.some((failed: any) => failed.item_id === item.item_id)) {
              setRegisteredItems(prev => new Set(Array.from(prev).concat(item.item_id)));
            }
          });
          
          if (addData.data?.failed_items) {
            newFailedItems.push(...addData.data.failed_items);
            failureCount += addData.data.failed_items.length;
          }
          successCount += newItems.length - (addData.data?.failed_items?.length || 0);
        }
      }

      // Proses item update menggunakan API update
      if (updateItems.length > 0) {
        const updateResponse = await fetch('/api/flashsale/items/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop_id: selectedShop,
            flash_sale_id: flashSaleId,
            items: updateItems
          })
        });

        const updateData = await updateResponse.json();
        
        if (updateData.success) {
          successCount += updateItems.length - (updateData.data?.failed_items?.length || 0);
          if (updateData.data?.failed_items) {
            newFailedItems.push(...updateData.data.failed_items);
            failureCount += updateData.data.failed_items.length;
          }
        }
      }

      // Update UI berdasarkan hasil
      setFailedItems(newFailedItems);
      
      // Update activatedModels untuk model yang berhasil
      const newActivatedModels = new Set(activatedModels);
      selectedModels.forEach(modelKey => {
        const [itemId, modelId] = modelKey.split('-').map(Number);
        if (!newFailedItems.some(item => 
          item.item_id === itemId && item.model_id === modelId
        )) {
          newActivatedModels.add(modelKey);
        }
      });
      setActivatedModels(newActivatedModels);

      // Tampilkan toast sesuai hasil
      if (successCount > 0) {
        toast({
          variant: "default",
          title: "Success",
          description: `${successCount} model berhasil diaktifkan${failureCount > 0 ? `, ${failureCount} model gagal` : ''}`
        });
      } else if (failureCount > 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `${failureCount} model gagal diaktifkan`
        });
      }

      setSelectedModels(new Set());
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Terjadi kesalahan saat mengaktifkan model"
      });
    }
  };

  // Fungsi helper untuk mengecek apakah item memiliki error
  const hasError = (itemId: number, modelId: number) => {
    return failedItems.some(
      item => item.item_id === itemId && 
      item.model_id === modelId && 
      item.unqualified_conditions.some(c => c.unqualified_code === 10014)
    );
  };

  // Tambahkan fungsi untuk aktivasi single model
  const handleActivateSingleModel = async (itemId: number, modelId: number, isActive: boolean) => {
    if (!selectedShop || !flashSaleId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Pilih toko dan dapatkan flash sale ID terlebih dahulu"
      });
      return;
    }

    const modelData = selectedItems.find(
      item => item.item_id === itemId && item.model_id === modelId
    );

    if (!modelData) {
      throw new Error("Model tidak ditemukan");
    }

    try {
      let response;
      if (registeredItems.has(itemId)) {
        // Gunakan API update untuk item yang sudah terdaftar
        response = await fetch('/api/flashsale/items/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop_id: selectedShop,
            flash_sale_id: flashSaleId,
            items: [{
              item_id: itemId,
              models: [{
                model_id: modelId,
                status: isActive ? 1 : 0,
                input_promo_price: modelData.promotion_price,
                stock: modelData.stock
              }]
            }]
          })
        });
      } else {
        // Gunakan API add untuk item baru
        response = await fetch('/api/flashsale/items/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop_id: selectedShop,
            flash_sale_id: flashSaleId,
            items: [{
              item_id: itemId,
              purchase_limit: 0,
              models: [{
                model_id: modelId,
                input_promo_price: modelData.promotion_price,
                stock: modelData.stock
              }]
            }]
          })
        });
      }

      const data = await response.json();
      
      if (data.success) {
        // Update registeredItems jika berhasil menambahkan item baru
        if (!registeredItems.has(itemId)) {
          setRegisteredItems(prev => new Set(Array.from(prev).concat(itemId)));
        }

        // Update activatedModels
        setActivatedModels(prev => {
          const next = new Set(prev);
          if (isActive) {
            next.add(`${itemId}-${modelId}`);
          } else {
            next.delete(`${itemId}-${modelId}`);
          }
          return next;
        });

        toast({
          variant: "default",
          title: "Success",
          description: `Model berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || `Gagal ${isActive ? 'mengaktifkan' : 'menonaktifkan'} model`
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Terjadi kesalahan saat ${isActive ? 'mengaktifkan' : 'menonaktifkan'} model`
      });
    }
  };

  return (
    <div className="p-6">
      <Card className="bg-white shadow-sm border-0">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-lg font-medium">Buat Flash Sale Baru</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tambahkan tampilan Flash Sale ID jika sudah ada */}
            {flashSaleId && (
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">ID Flash Sale:</span>
                  <span className="text-sm text-gray-900">{flashSaleId}</span>
                </div>
              </div>
            )}

            <div className="flex gap-6">
              <div className="w-1/2 space-y-2">
                <label htmlFor="shop" className="text-sm font-medium text-gray-700">Pilih Toko</label>
                <div>
                  <Select onValueChange={handleShopChange}>
                    <SelectTrigger className="h-9 border-gray-200">
                      <SelectValue placeholder="Pilih Toko" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops.map((shop) => (
                        <SelectItem key={shop.shop_id} value={shop.shop_id.toString()}>
                          {shop.shop_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="w-1/2 space-y-2">
                <label className="text-sm font-medium text-gray-700">Slot Waktu Flash Sale</label>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-left justify-start h-9 font-normal border-gray-200 hover:bg-gray-50"
                    onClick={handleCalendarOpen}
                    disabled={!selectedShop}
                  >
                    {selectedTimeSlot 
                      ? `${format(date!, "PPP")} ${formatTime(selectedTimeSlot.start_time)} - ${formatTime(selectedTimeSlot.end_time)}`
                      : "Pilih Slot Waktu Flash Sale"}
                  </Button>
                </div>
              </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="sm:max-w-[900px] p-0">
                <div className="p-6 pb-4">
                  <DialogTitle className="text-xl font-semibold">
                    Pilih Slot Waktu Flash Sale Toko
                  </DialogTitle>
                </div>

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
                        day_range_end: "day-range-end",
                        day_selected: "bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white",
                        day_today: "bg-accent text-accent-foreground",
                        day_outside: "day-outside opacity-50",
                        day_disabled: "text-slate-500 opacity-50",
                        day_hidden: "invisible",
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
                        console.log('RadioGroup value changed:', value);
                        const slot = timeSlots.find(s => s.timeslot_id === parseInt(value));
                        console.log('Found slot:', slot);
                        if (slot) {
                          setSelectedTimeSlot(slot);
                        }
                      }}
                      className="space-y-2.5 overflow-y-auto pr-2 custom-scrollbar"
                    >
                      {timeSlots.map((slot) => (
                        <div 
                          key={slot.timeslot_id} 
                          className="flex items-center justify-between p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem 
                              value={slot.timeslot_id.toString()} 
                              id={`slot-${slot.timeslot_id}`}
                              className="w-4 h-4"
                            />
                            <div>
                              <label 
                                htmlFor={`slot-${slot.timeslot_id}`}
                                className="text-sm font-medium text-gray-900"
                              >
                                {`${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`}
                              </label>
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
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="px-6"
                  >
                    Batal
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirmTimeSlot}
                    className="px-6 bg-black text-white hover:bg-black/90"
                  >
                    Konfirmasi
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="mt-6">
              <div className="mb-4">
                <Button
                  type="button"
                  onClick={handleAddProduct}
                  disabled={!selectedShop}
                  className="bg-black text-white hover:bg-black/90"
                >
                  + Tambah Produk
                </Button>
              </div>

              {/* Mass update controls */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">
                    Pilih model untuk update massal
                  </span>
                </div>

                <div className="h-4 w-px bg-gray-300 mx-2" />

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(value: 'fixed' | 'percentage') => {
                      setUpdateType(value);
                      setPromoPrice(null);
                    }}>
                      <SelectTrigger className="w-[140px] h-8 text-sm">
                        <SelectValue placeholder="Harga promo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Harga Tetap</SelectItem>
                        <SelectItem value="percentage">Persentase Diskon</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      placeholder={updateType === 'fixed' ? "Masukkan harga" : "Masukkan %"}
                      className="w-28 h-8 text-sm"
                      value={promoPrice || ''}
                      min={0}
                      max={updateType === 'percentage' ? 100 : undefined}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                          setPromoPrice(value);
                        }
                      }}
                    />
                  </div>

                  <Input
                    type="number"
                    placeholder="Stok"
                    className="w-28 h-8 text-sm"
                    value={stockValue || ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value)) {
                        setStockValue(value);
                      }
                    }}
                  />

                  <Button
                    type="button"
                    onClick={() => {
                      if (promoPrice !== null) {
                        if (updateType === 'fixed') {
                          handleMassUpdate('promotion_price', promoPrice);
                        } else {
                          handleMassUpdate('discount', promoPrice);
                        }
                      }
                      if (stockValue !== null) {
                        handleMassUpdate('stock', stockValue);
                      }
                    }}
                    disabled={selectedModels.size === 0}
                    className="h-8 px-4 bg-black text-white hover:bg-black/90 text-sm"
                  >
                    Update
                  </Button>

                  {selectedModels.size > 0 && (
                    <>
                      <Button
                        type="button"
                        onClick={handleActivateItems}
                        className="h-8 px-4 bg-green-500 text-white hover:bg-green-600 text-sm"
                      >
                        Aktifkan
                      </Button>

                      <Button
                        type="button"
                        onClick={() => {
                          // Nonaktifkan semua model yang dipilih
                          Array.from(selectedModels).forEach(modelKey => {
                            const [itemId, modelId] = modelKey.split('-').map(Number);
                            handleActivateSingleModel(itemId, modelId, false);
                          });
                        }}
                        className="h-8 px-4 bg-red-500 text-white hover:bg-red-600 text-sm"
                      >
                        Nonaktifkan
                      </Button>
                    </>
                  )}

                  {selectedModels.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedModels.size} model terpilih
                    </span>
                  )}
                </div>
              </div>

              <Table className="border rounded-lg overflow-hidden">
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[5%]">
                      <Checkbox
                        checked={selectedItems.length > 0 && selectedItems.every(item => 
                          selectedModels.has(`${item.item_id}-${item.model_id}`)
                        )}
                        onCheckedChange={toggleAllItems}
                      />
                    </TableHead>
                    <TableHead className="w-[25%] font-medium">Nama Produk</TableHead>
                    <TableHead className="w-[15%] font-medium">Harga Normal</TableHead>
                    <TableHead className="w-[15%] font-medium">Harga Saat Ini</TableHead>
                    <TableHead className="w-[15%] font-medium">Harga Promo</TableHead>
                    <TableHead className="w-[10%] font-medium">Stok Tersedia</TableHead>
                    <TableHead className="w-[10%] font-medium">Stok Flash Sale</TableHead>
                    <TableHead className="w-[10%] font-medium">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupItems(selectedItems).map((group) => (
                    <React.Fragment key={group.item_id}>
                      {/* Group header */}
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={8} className="font-medium py-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={group.models.every(model => 
                                  selectedModels.has(`${group.item_id}-${model.model_id}`)
                                )}
                                onCheckedChange={() => toggleAllModels(group.item_id, group.models)}
                              />
                              <button 
                                onClick={() => toggleCollapse(group.item_id)}
                                type="button"
                                className="p-0.5 hover:bg-gray-200 rounded-sm transition-colors"
                              >
                                {collapsedItems.has(group.item_id) ? (
                                  <ChevronRight className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                            <div className="relative w-8 h-8">
                              <img 
                                src={products.find(p => p.item_id === group.item_id)?.image?.image_url_list?.[0] || '/placeholder-image.jpg'}
                                alt={group.name}
                                className="object-cover rounded-md w-full h-full"
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-image.jpg';
                                }}
                              />
                            </div>
                            {group.name}
                            <span className="text-sm text-gray-500 font-normal">
                              (SKU: {products.find(p => p.item_id === group.item_id)?.item_sku || 'N/A'})
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Model rows */}
                      {!collapsedItems.has(group.item_id) && group.models.map((item) => {
                        // Temukan data produk yang sesuai
                        const product = products.find(p => p.item_id === item.item_id);
                        // Temukan model yang sesuai
                        const modelData = product?.models.find(m => m.model_id === item.model_id);
                        // Hitung stok tersedia: seller_stock - total_reserved_stock
                        const availableStock = (modelData?.stock_info?.seller_stock ?? 0) - (modelData?.stock_info?.total_reserved_stock ?? 0);

                        return (
                          <TableRow key={`${item.item_id}-${item.model_id}`}>
                            <TableCell>
                              <Checkbox
                                checked={selectedModels.has(`${item.item_id}-${item.model_id}`)}
                                onCheckedChange={() => toggleModelSelection(item.item_id, item.model_id)}
                              />
                            </TableCell>
                            <TableCell>{item.model_name}</TableCell>
                            <TableCell>{formatRupiah(item.original_price)}</TableCell>
                            <TableCell>{formatRupiah(item.current_price)}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                max={item.current_price}
                                value={item.promotion_price}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  const newItems = selectedItems.map((i) =>
                                    i.item_id === item.item_id && i.model_id === item.model_id
                                      ? { ...i, promotion_price: value || 0 }
                                      : i
                                  );
                                  setSelectedItems(newItems);
                                }}
                                className={`w-28 h-9 border-gray-200 ${
                                  hasError(item.item_id, item.model_id) 
                                    ? 'border-red-500 focus:ring-red-500' 
                                    : ''
                                }`}
                                disabled={activatedModels.has(`${item.item_id}-${item.model_id}`)}
                              />
                            </TableCell>
                            <TableCell>{availableStock}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                max={availableStock}
                                value={item.stock}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value);
                                  const newItems = selectedItems.map((i) =>
                                    i.item_id === item.item_id && i.model_id === item.model_id
                                      ? { ...i, stock: Math.min(value || 0, availableStock) }
                                      : i
                                  );
                                  setSelectedItems(newItems);
                                }}
                                className="w-24 h-9 border-gray-200"
                                disabled={activatedModels.has(`${item.item_id}-${item.model_id}`)}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch 
                                checked={activatedModels.has(`${item.item_id}-${item.model_id}`)}
                                onCheckedChange={(checked) => {
                                  handleActivateSingleModel(item.item_id, item.model_id, checked);
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Pilih Produk</DialogTitle>
          </DialogHeader>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedProductIds.size === products.length}
                      onCheckedChange={handleSelectAllProducts}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableHead>
                  <TableHead className="w-[100px]">Gambar</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Harga Terendah</TableHead>
                  <TableHead>Total Stok</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const lowestPrice = Math.min(...product.models.map(m => m.price_info.current_price));
                  const totalStock = product.models.reduce((sum, m) => sum + m.stock_info.total_available_stock, 0);
                  
                  return (
                    <TableRow 
                      key={product.item_id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleProductSelect(product.item_id)}
                    >
                      <TableCell className="w-[50px]">
                        <Checkbox
                          checked={selectedProductIds.has(product.item_id)}
                          onCheckedChange={() => handleProductSelect(product.item_id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="w-[100px] p-4">
                        {product.image?.image_url_list?.[0] && (
                          <div className="relative w-16 h-16">
                            <img 
                              src={product.image.image_url_list[0]}
                              alt={product.item_name}
                              className="object-cover rounded-md w-full h-full"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-image.jpg';
                              }}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{product.item_name}</TableCell>
                      <TableCell>{product.item_sku}</TableCell>
                      <TableCell>{formatRupiah(lowestPrice)}</TableCell>
                      <TableCell>{totalStock}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center gap-3 mt-4 pt-4 border-t">
            <span className="text-sm text-gray-600">
              {selectedProductIds.size} produk terpilih
            </span>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsProductDialogOpen(false);
                  setSelectedProductIds(new Set()); // Reset pilihan saat membatalkan
                }}
              >
                Batal
              </Button>
              <Button
                onClick={handleConfirmProducts}
                disabled={selectedProductIds.size === 0}
                className="bg-black text-white hover:bg-black/90"
              >
                Tambahkan Produk
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d1d1;
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #b1b1b1;
        }
      `}</style>
    </div>
  );
} 