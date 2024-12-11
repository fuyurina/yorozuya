'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dayjs from 'dayjs';
import Image from 'next/image';
import { format } from 'date-fns';

// Shadcn UI imports
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search } from "lucide-react";

// Interfaces
interface Item {
  item_id: number;
  model_id: number;
  name: string;
  model_name: string;
  original_price: number;
  current_price: number;
  promotion_price: number;
  stock: number;
  status?: number;
}

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

interface FlashSaleData {
  flash_sale_id: number;
  shop_id: number;
  shop_name: string;
  start_time: number;
  end_time: number;
  status: string;
  items: Item[];
  models: Item[];
}

interface Product {
  item_id: number;
  item_name: string;
  item_sku: string;
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

// Helper functions di luar komponen
const formatTime = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

export default function FlashSaleDetailPage() {
  const params = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const shopId = searchParams.get('shop_id');
  const flashSaleId = searchParams.get('flash_sale_id');
  
  const [flashSaleData, setFlashSaleData] = useState<FlashSaleData | null>(null);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [collapsedItems, setCollapsedItems] = useState<Set<number>>(new Set());
  const [updateType, setUpdateType] = useState<'fixed' | 'percentage'>('fixed');
  const [promoPrice, setPromoPrice] = useState<number | null>(null);
  const [stockValue, setStockValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [activatedModels, setActivatedModels] = useState<Set<string>>(new Set());
  const [registeredItems, setRegisteredItems] = useState<Set<number>>(new Set());
  const [failedItems, setFailedItems] = useState<FailedItem[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());

  // Tambahkan validasi parameter di awal
  useEffect(() => {
    if (!shopId || !flashSaleId || isNaN(Number(shopId)) || isNaN(Number(flashSaleId))) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Parameter shop_id dan flash_sale_id harus berupa angka yang valid"
      });
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const flashSaleIdInt = Math.abs(parseInt(flashSaleId || '0'));
        const shopIdInt = Math.abs(parseInt(shopId || '0'));

        const [detailRes, itemsRes] = await Promise.all([
          fetch(`/api/flashsale/detail?shop_id=${shopIdInt}&flash_sale_id=${flashSaleIdInt}`),
          fetch(`/api/flashsale/detail_items?shop_id=${shopIdInt}&flash_sale_id=${flashSaleIdInt}`)
        ]);

        const [detailData, itemsData] = await Promise.all([
          detailRes.json(),
          itemsRes.json()
        ]);

        if (detailData.success && itemsData.success) {
          setFlashSaleData({
            ...detailData.data,
            items: itemsData.data.items,
            models: itemsData.data.models
          });

          // Set activated models dan registered items berdasarkan data yang ada
          const activatedSet = new Set<string>();
          const registeredSet = new Set<number>();

          itemsData.data.models.forEach((model: any) => {
            if (model.status === 1) {
              activatedSet.add(`${model.item_id}-${model.model_id}`);
            }
            registeredSet.add(model.item_id);
          });

          setActivatedModels(activatedSet);
          setRegisteredItems(registeredSet);
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Gagal mengambil data flash sale",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shopId, flashSaleId]);

  // Pindahkan toggleAllItems ke dalam komponen
  const toggleAllItems = () => {
    const allModelKeys = flashSaleData?.models.map(
      model => `${model.item_id}-${model.model_id}`
    ) || [];
    
    const allSelected = allModelKeys.every(key => selectedModels.has(key));
    
    if (allSelected) {
      setSelectedModels(new Set());
    } else {
      setSelectedModels(new Set(allModelKeys));
    }
  };

  // Fungsi untuk mengaktifkan/menonaktifkan model tunggal
  const handleActivateSingleModel = async (
    itemId: number, 
    modelId: number, 
    isActive: boolean,
    promoPrice?: number,
    stockValue?: number
  ) => {
    try {
      const modelData: any = {
        model_id: modelId,
        status: isActive ? 1 : 0
      };

      // Hanya tambahkan promoPrice dan stock jika mengaktifkan model (isActive true)
      if (isActive) {
        if (promoPrice !== undefined) {
          modelData.input_promo_price = promoPrice;
        }
        if (stockValue !== undefined) {
          modelData.stock = stockValue;
        }
      }

      const requestBody = {
        shop_id: shopId,
        flash_sale_id: flashSaleId,
        items: [{
          item_id: itemId,
          ...(isActive && { purchase_limit: 0 }),
          models: [modelData]
        }]
      };

      const response = await fetch('/api/flashsale/items/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (data.success) {
        // Cek apakah ada failed items
        const hasFailedItems = data.data?.failed_items?.some(
          (item: any) => item.item_id === itemId && item.model_id === modelId
        );

        if (!hasFailedItems) {
          // Update activatedModels hanya jika tidak ada error
          setActivatedModels(prev => {
            const next = new Set(prev);
            const modelKey = `${itemId}-${modelId}`;
            if (isActive) {
              next.add(modelKey);
            } else {
              next.delete(modelKey);
            }
            return next;
          });

          // Update status di flashSaleData
          setFlashSaleData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              models: prev.models.map(model => {
                if (model.item_id === itemId && model.model_id === modelId) {
                  return {
                    ...model,
                    status: isActive ? 1 : 0
                  };
                }
                return model;
              })
            };
          });

          toast({
            title: "Berhasil",
            description: `Model berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`
          });
        } else {
          // Tampilkan pesan error jika gagal
          const failedItem = data.data.failed_items.find(
            (item: any) => item.item_id === itemId && item.model_id === modelId
          );
          
          toast({
            variant: "destructive",
            title: "Error",
            description: failedItem?.err_msg || `Gagal ${isActive ? 'mengaktifkan' : 'menonaktifkan'} model`
          });
        }
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

  // Fungsi untuk mass update
  const handleMassUpdate = async (field: 'promotion_price' | 'stock' | 'discount', value: number) => {
    if (selectedModels.size === 0) return;

    const updates = Array.from(selectedModels).map(modelKey => {
      const [itemId, modelId] = modelKey.split('-').map(Number);
      const model = flashSaleData?.models.find(
        m => m.item_id === itemId && m.model_id === modelId
      );

      if (!model) return null;

      let updateValue = value;
      if (field === 'discount') {
        updateValue = Math.floor(model.original_price * (1 - value / 100));
      }

      return {
        item_id: itemId,
        models: [{
          model_id: modelId,
          status: 1, // Mengaktifkan model
          input_promo_price: field === 'discount' || field === 'promotion_price' ? updateValue : undefined,
          stock: field === 'stock' ? updateValue : undefined
        }]
      };
    }).filter(Boolean);

    try {
      const response = await fetch('/api/flashsale/items/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopId,
          flash_sale_id: flashSaleId,
          items: updates
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Berhasil",
          description: "Item berhasil diperbarui"
        });
        
        // Refresh data
        window.location.reload();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Gagal memperbarui item"
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal memperbarui item"
      });
    }
  };

  // Tambahkan fungsi untuk toggle model selection
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

  // Tambahkan fungsi untuk toggle semua model dalam satu item
  const toggleAllModels = (itemId: number, models: any[]) => {
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

  // Fungsi baru untuk mass update
  const handleMassActivation = async (activate: boolean) => {
    try {
      const modelKeys = Array.from(selectedModels);
      const updates = modelKeys.reduce((acc: any[], key) => {
        const [itemId, modelId] = key.split('-').map(Number);
        
        // Skip jika status sudah sesuai
        if (activate === activatedModels.has(key)) return acc;
        
        const existingItem = acc.find(item => item.item_id === itemId);
        const modelData = {
          model_id: modelId,
          status: activate ? 1 : 0
        };

        if (existingItem) {
          existingItem.models.push(modelData);
        } else {
          acc.push({
            item_id: itemId,
            ...(activate && { purchase_limit: 0 }),
            models: [modelData]
          });
        }
        
        return acc;
      }, []);

      if (updates.length === 0) return;

      const response = await fetch('/api/flashsale/items/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopId,
          flash_sale_id: flashSaleId,
          items: updates
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Buat Set untuk menyimpan model yang gagal
        const failedModels = new Set(
          data.data.failed_items?.map((item: any) => `${item.item_id}-${item.model_id}`) || []
        );

        // Update activatedModels state, hanya untuk model yang berhasil
        setActivatedModels(prev => {
          const next = new Set(prev);
          modelKeys.forEach(key => {
            if (activate) {
              // Hanya tambahkan jika tidak ada di failedModels
              if (!failedModels.has(key)) {
                next.add(key);
              }
            } else {
              next.delete(key);
            }
          });
          return next;
        });

        // Update flashSaleData state untuk mengubah status model
        setFlashSaleData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            models: prev.models.map(model => {
              const modelKey = `${model.item_id}-${model.model_id}`;
              if (selectedModels.has(modelKey) && !failedModels.has(modelKey)) {
                return {
                  ...model,
                  status: activate ? 1 : 0
                };
              }
              return model;
            })
          };
        });

        // Tampilkan toast success
        const successCount = modelKeys.length - failedModels.size;
        if (successCount > 0) {
          toast({
            title: "Berhasil",
            description: `${successCount} model berhasil ${activate ? 'diaktifkan' : 'dinonaktifkan'}`
          });
        }

        // Tampilkan toast error untuk yang gagal
        if (failedModels.size > 0) {
          toast({
            variant: "destructive",
            title: "Error",
            description: `${failedModels.size} model gagal ${activate ? 'diaktifkan' : 'dinonaktifkan'}`
          });
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Gagal ${activate ? 'mengaktifkan' : 'menonaktifkan'} item`
      });
    }
  };

  // Tambahkan fungsi untuk membuka dialog dan mengambil data produk
  const handleAddProduct = async () => {
    if (!shopId) return;
    
    setIsProductDialogOpen(true);
    setLoadingProducts(true);
    
    try {
      const response = await fetch(`/api/produk?shop_id=${shopId}`);
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

  // Fungsi untuk menangani pemilihan produk
  const handleProductSelect = (productId: number) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProductIds(newSelected);
  };

  // Fungsi untuk menangani pemilihan semua produk
  const handleSelectAllProducts = () => {
    if (selectedProductIds.size === products.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(products.map(p => p.item_id)));
    }
  };

  // Fungsi untuk menangani konfirmasi penambahan produk
  const handleConfirmProducts = async () => {
    const selectedProducts = products.filter(p => selectedProductIds.has(p.item_id));
    
    // Ubah format data produk sesuai dengan struktur yang dibutuhkan
    const newModels = selectedProducts.flatMap(product => 
      product.models.map(model => ({
        item_id: product.item_id,
        model_id: model.model_id,
        name: product.item_name,   // Gunakan name sesuai interface Item
        model_name: model.model_name,
        original_price: model.price_info.original_price,
        current_price: model.price_info.current_price,
        promotion_price: model.price_info.current_price,
        stock: Math.min(20, (model.stock_info?.seller_stock ?? 0) - (model.stock_info?.total_reserved_stock ?? 0)),
        image: product.image.image_url_list[0],
        status: 0
      }))
    );

    // Update flashSaleData dengan item baru
    setFlashSaleData(prev => {
      if (!prev) return prev;

      // Konversi produk baru ke format Item yang sesuai
      const newItems = selectedProducts.map(product => {
        const firstModel = product.models[0];
        return {
          item_id: product.item_id,
          model_id: firstModel.model_id,
          name: product.item_name,   // Gunakan name sesuai interface Item
          model_name: firstModel.model_name,
          original_price: firstModel.price_info.original_price,
          current_price: firstModel.price_info.current_price,
          promotion_price: firstModel.price_info.current_price,
          stock: Math.min(20, (firstModel.stock_info?.seller_stock ?? 0) - (firstModel.stock_info?.total_reserved_stock ?? 0)),
          image: product.image.image_url_list[0],
          status: 0
        } as Item; // Pastikan tipe data sesuai dengan Item
      });

      return {
        ...prev,
        items: [...prev.items, ...newItems],
        models: [...prev.models, ...newModels]
      };
    });

    // Reset state dialog
    setIsProductDialogOpen(false);
    setSelectedProductIds(new Set());

    toast({
      title: "Berhasil",
      description: `${newModels.length} model produk berhasil ditambahkan`,
    });
  };

  // Render komponen
  return (
    <div className="p-6">
      <Card className="bg-white shadow-sm border-0">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-lg font-medium">Detail Flash Sale</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Info Flash Sale */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-700">ID Flash Sale:</span>
                <span className="text-sm text-gray-900 ml-2">{flashSaleId}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Toko:</span>
                <span className="text-sm text-gray-900 ml-2">{flashSaleData?.shop_name}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Waktu Flash Sale:</span>
                <span className="text-sm text-gray-900 ml-2">
                  {flashSaleData && `${format(new Date(flashSaleData.start_time * 1000), "PPP")} ${formatTime(flashSaleData.start_time)} - ${formatTime(flashSaleData.end_time)}`}
                </span>
              </div>
            </div>
          </div>

          {/* Mass Update Controls */}
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
                    onClick={() => handleMassActivation(true)}
                    className="h-8 px-4 bg-green-500 text-white hover:bg-green-600 text-sm"
                  >
                    Aktifkan
                  </Button>

                  <Button
                    onClick={() => handleMassActivation(false)}
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

          {/* Tambahkan tombol Tambah Produk */}
          <div className="mb-4">
            <Button
              type="button"
              onClick={handleAddProduct}
              className="bg-black text-white hover:bg-black/90"
            >
              + Tambah Produk
            </Button>
          </div>

          {/* Table */}
          <Table className="border rounded-lg overflow-hidden">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-[5%]">
                  <Checkbox
                    checked={flashSaleData?.models && flashSaleData.models.length > 0 && 
                      flashSaleData.models.every(model => 
                        selectedModels.has(`${model.item_id}-${model.model_id}`)
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
                <TableHead className="w-[10%] font-medium">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flashSaleData?.items.map((item: any) => {
                const itemModels = flashSaleData.models.filter(
                  (model: any) => model.item_id === item.item_id
                );
                
                return (
                  <React.Fragment key={item.item_id}>
                    {/* Item row */}
                    <TableRow className="bg-gray-50">
                      <TableCell colSpan={8}>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={itemModels.every(model => 
                                selectedModels.has(`${item.item_id}-${model.model_id}`)
                              )}
                              onCheckedChange={() => toggleAllModels(item.item_id, itemModels)}
                            />
                            <button 
                              onClick={() => {
                                setCollapsedItems(prev => {
                                  const next = new Set(prev);
                                  if (next.has(item.item_id)) {
                                    next.delete(item.item_id);
                                  } else {
                                    next.add(item.item_id);
                                  }
                                  return next;
                                });
                              }}
                              type="button"
                              className="p-0.5 hover:bg-gray-200 rounded-sm transition-colors"
                            >
                              {collapsedItems.has(item.item_id) ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <div className="relative w-8 h-8">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-8 h-8 object-cover rounded-sm"
                            />
                          </div>
                          <span className="font-medium text-sm">
                            {item.name}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Model rows */}
                    {!collapsedItems.has(item.item_id) && itemModels.map((model: any) => (
                      <TableRow key={`${item.item_id}-${model.model_id}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedModels.has(`${model.item_id}-${model.model_id}`)}
                            onCheckedChange={() => toggleModelSelection(model.item_id, model.model_id)}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {model.model_name}
                          </span>
                        </TableCell>
                        <TableCell>{formatRupiah(model.original_price)}</TableCell>
                        <TableCell>{formatRupiah(model.current_price)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={model.promotion_price}
                            className="w-28 h-9"
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (!isNaN(value)) {
                                const updatedModels = flashSaleData.models.map((m: any) => {
                                  if (m.item_id === model.item_id && m.model_id === model.model_id) {
                                    return { ...m, promotion_price: value };
                                  }
                                  return m;
                                });
                                setFlashSaleData({ ...flashSaleData, models: updatedModels });
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>{model.stock}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={model.campaign_stock}
                            className="w-24 h-9"
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (!isNaN(value)) {
                                const updatedModels = flashSaleData.models.map((m: any) => {
                                  if (m.item_id === model.item_id && m.model_id === model.model_id) {
                                    return { ...m, campaign_stock: value };
                                  }
                                  return m;
                                });
                                setFlashSaleData({ ...flashSaleData, models: updatedModels });
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={model.status === 1}
                            onCheckedChange={(checked) => 
                              handleActivateSingleModel(
                                model.item_id, 
                                model.model_id, 
                                checked,
                                checked ? model.input_promotion_price : undefined,
                                checked ? model.campaign_stock : undefined
                              )
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>

          {/* Tambahkan Dialog Produk */}
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
                      setSelectedProductIds(new Set());
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
        </CardContent>
      </Card>
    </div>
  );
}