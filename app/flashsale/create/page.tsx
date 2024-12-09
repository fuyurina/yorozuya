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
  isSelected?: boolean;
  image: {
    image_url_list: string[];
  };
  models: {
    model_id: number;
    model_name: string;
    price_info: {
      current_price: number;
    };
    stock_info: {
      total_available_stock: number;
    };
  }[];
}

// Tambahkan interface baru untuk pengelompokan item
interface GroupedItem {
  item_id: number;
  name: string;
  models: Item[];
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
    if (!selectedShop || !timeSlotId || selectedItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: 'Mohon lengkapi semua data',
      });
      return;
    }

    setLoading(true);
    try {
      const itemList = selectedItems.map(item => ({
        item_id: item.item_id,
        model_list: [{
          model_id: item.model_id,
          promotion_price: item.promotion_price,
          stock: item.stock
        }]
      }));

      const response = await fetch('/api/flashsale/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: selectedShop,
          time_slot_id: timeSlotId,
          item_list: itemList
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          variant: "default",
          title: "Success",
          description: 'Flash sale berhasil dibuat',
        });
        router.push('/flashsale');
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || 'Gagal membuat flash sale',
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: 'Terjadi kesalahan saat membuat flash sale',
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
    setProducts(products.map(product => 
      product.item_id === productId 
        ? { ...product, isSelected: !product.isSelected }
        : product
    ));
  };

  const handleConfirmProducts = () => {
    const selectedProducts = products.filter(p => p.isSelected);
    
    const newItems: Item[] = selectedProducts.flatMap(product => 
      product.models.map(model => ({
        item_id: product.item_id,
        model_id: model.model_id,
        name: product.item_name,
        model_name: model.model_name,
        original_price: model.price_info.current_price,
        promotion_price: model.price_info.current_price,
        stock: model.stock_info.total_available_stock
      }))
    );

    setSelectedItems([...selectedItems, ...newItems]);
    setIsProductDialogOpen(false);
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

  // Fungsi untuk mass update model yang dicentang
  const handleMassUpdate = (field: 'promotion_price' | 'stock' | 'discount', value: number) => {
    const newItems = selectedItems.map((item) => {
      const modelKey = `${item.item_id}-${item.model_id}`;
      if (selectedModels.has(modelKey)) {
        if (field === 'promotion_price') {
          if (value > item.original_price) {
            return { ...item, promotion_price: item.original_price };
          }
          return { ...item, promotion_price: value };
        } else if (field === 'stock') {
          return { ...item, stock: value };
        } else if (field === 'discount') {
          // Hitung harga promo berdasarkan persentase diskon
          const discountAmount = Math.floor(item.original_price * (value / 100));
          const newPrice = item.original_price - discountAmount;
          return { ...item, promotion_price: newPrice };
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

  return (
    <div className="p-6">
      <Card className="bg-white shadow-sm border-0">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-lg font-medium">Buat Flash Sale Baru</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                        const slot = timeSlots.find(s => s.timeslot_id === parseInt(value));
                        if (slot) {
                          setSelectedTimeSlot(slot);
                          setTimeSlotId(slot.timeslot_id);
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
                    onClick={() => {
                      if (selectedTimeSlot) {
                        setIsDialogOpen(false);
                      }
                    }}
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
                <span className="text-sm text-gray-500">
                  {selectedModels.size > 0 ? `${selectedModels.size} model terpilih` : 'Pilih model untuk update'}
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Harga promo"
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value)) {
                        setDiscountPercentage(0); // Reset diskon persentase
                      }
                    }}
                    className="w-28 h-8 text-sm"
                  />
                  <span className="text-sm text-gray-500">atau</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Diskon %"
                      value={discountPercentage || ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 0 && value <= 100) {
                          setDiscountPercentage(value);
                        }
                      }}
                      className="w-20 h-8 text-sm"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                <Input
                  type="number"
                  placeholder="Stok"
                  className="w-24 h-8 text-sm"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (discountPercentage > 0) {
                      handleMassUpdate('discount', discountPercentage);
                    }
                    // Tambahkan logika untuk update harga dan stok di sini
                  }}
                  disabled={selectedModels.size === 0}
                  className="h-8 px-4 bg-black text-white hover:bg-black/90 text-sm"
                >
                  Update
                </Button>
              </div>

              <Table className="border rounded-lg overflow-hidden">
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[5%]">
                      <div style={{ width: '70px' }} className="flex items-center">
                        <div style={{ width: '28px' }}></div>
                        <Checkbox
                          checked={selectedItems.length > 0 && selectedItems.every(item => 
                            selectedModels.has(`${item.item_id}-${item.model_id}`)
                          )}
                          onCheckedChange={toggleAllItems}
                        />
                      </div>
                    </TableHead>
                    <TableHead className="w-[35%] font-medium">Nama Produk</TableHead>
                    <TableHead className="w-[20%] font-medium">Harga Asli</TableHead>
                    <TableHead className="w-[20%] font-medium">Harga Promo</TableHead>
                    <TableHead className="w-[20%] font-medium">Stok Flash Sale</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupItems(selectedItems).map((group) => (
                    <React.Fragment key={group.item_id}>
                      {/* Group header */}
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={5} className="font-medium py-2">
                          <div className="flex items-center gap-3">
                            <div style={{ width: '70px' }} className="flex items-center gap-2">
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
                              <Checkbox
                                checked={group.models.every(model => 
                                  selectedModels.has(`${group.item_id}-${model.model_id}`)
                                )}
                                onCheckedChange={() => toggleAllModels(group.item_id, group.models)}
                              />
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
                              ({group.models.length} varian)
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Model rows */}
                      {!collapsedItems.has(group.item_id) && group.models.map((item) => (
                        <TableRow key={`${item.item_id}-${item.model_id}`}>
                          <TableCell>
                            <div style={{ width: '70px' }} className="flex items-center">
                              <div style={{ width: '27px' }}></div>
                              <Checkbox
                                checked={selectedModels.has(`${item.item_id}-${item.model_id}`)}
                                onCheckedChange={() => toggleModelSelection(item.item_id, item.model_id)}
                              />
                            </div>
                          </TableCell>
                          <TableCell>{item.model_name}</TableCell>
                          <TableCell>{formatRupiah(item.original_price)}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              max={item.original_price}
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
                              className="w-28 h-9 border-gray-200"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              value={item.stock}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                const newItems = selectedItems.map((i) =>
                                  i.item_id === item.item_id && i.model_id === item.model_id
                                    ? { ...i, stock: value || 0 }
                                    : i
                                );
                                setSelectedItems(newItems);
                              }}
                              className="w-24 h-9 border-gray-200"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.back()}
                className="h-9 px-4 border-gray-200 hover:bg-gray-50"
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="h-9 px-4 bg-black text-white hover:bg-black/90"
              >
                {loading ? "Memproses..." : "Buat Flash Sale"}
              </Button>
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
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[100px]">Gambar</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>Jumlah Varian</TableHead>
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
                          checked={product.isSelected}
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
                      <TableCell>{product.models.length} varian</TableCell>
                      <TableCell>{formatRupiah(lowestPrice)}</TableCell>
                      <TableCell>{totalStock}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsProductDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmProducts}
              className="bg-black text-white hover:bg-black/90"
            >
              Tambahkan Produk
            </Button>
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