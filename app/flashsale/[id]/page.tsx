'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
interface UnqualifiedCondition {
  unqualified_code: number;
  unqualified_msg: string;
}

interface FailedItem {
  item_id: number;
  model_id: number;
  err_code?: number;
  err_msg: string;
  unqualified_conditions?: UnqualifiedCondition[];
}

interface FlashSaleItem {
  item_id: number;
  item_name: string;
  image: string;
}

interface Item {
  item_id: number;
  model_id: number;
  model_name: string;
  original_price: number;
  promotion_price_with_tax: number;
  input_promotion_price?: number;
  campaign_stock: number;
  purchase_limit: number;
  reject_reason: string;
  status: number;
  stock: number;
}

interface FlashSaleData {
  flash_sale_id: number;
  shop_id: number;
  shop_name: string;
  start_time: number;
  end_time: number;
  status: string;
  items: FlashSaleItem[];
  models: Item[];
}

interface Product {
  item_id: number;
  item_name: string;
  item_sku: string;
  image: {
    image_id_list: any;
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

  // Tambahkan fungsi helper untuk membedakan item terdaftar dan baru
  const isItemRegistered = (itemId: number) => {
    return registeredItems.has(itemId);
  };

  // Modifikasi handleActivateSingleModel
  const handleActivateSingleModel = async (itemId: number, modelId: number, isActive: boolean) => {
    try {
      if (!isActive) {
        // Nonaktifkan model (hanya untuk item yang sudah terdaftar)
        if (!isItemRegistered(itemId)) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Tidak dapat menonaktifkan item yang belum terdaftar"
          });
          return;
        }

        const response = await fetch('/api/flashsale/items/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop_id: shopId,
            flash_sale_id: flashSaleId,
            items: [{
              item_id: itemId,
              models: [{
                model_id: modelId,
                status: 0
              }]
            }]
          })
        });

        const data = await response.json();
        
        if (data.success) {
          // Cek apakah ada failed items
          if (data.data?.failed_items?.length > 0) {
            const failedItem = data.data.failed_items[0];
            const errorMessages = failedItem.unqualified_conditions
              ?.map((condition: UnqualifiedCondition) => condition.unqualified_msg)
              .join(', ');
              
            toast({
              variant: "destructive",
              title: "Gagal menonaktifkan model",
              description: errorMessages || failedItem.err_msg
            });
            return;
          }

          // Update state hanya jika tidak ada error
          setActivatedModels(prev => {
            const next = new Set(prev);
            next.delete(`${itemId}-${modelId}`);
            return next;
          });

          setFlashSaleData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              models: prev.models.map(m => {
                if (m.item_id === itemId && m.model_id === modelId) {
                  return { ...m, status: 0 } as Item;
                }
                return m;
              })
            };
          });

          toast({
            title: "Berhasil",
            description: "Model berhasil dinonaktifkan"
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: data.message || "Gagal menonaktifkan model"
          });
        }
      } else {
        const model = flashSaleData?.models.find(
          m => m.item_id === itemId && m.model_id === modelId
        );
        
        if (!model) return;

        // Cek apakah semua model dalam item ini tidak aktif
        const allModelsInactive = flashSaleData?.models
          .filter(m => m.item_id === itemId)
          .every(m => m.status === 0);

        // Tentukan endpoint dan body berdasarkan status registrasi dan status model
        const endpoint = isItemRegistered(itemId) 
          ? '/api/flashsale/items/update'
          : '/api/flashsale/items/add';

        const requestBody = isItemRegistered(itemId) 
          ? {
              shop_id: Number(shopId),
              flash_sale_id: Number(flashSaleId),
              items: [{
                item_id: itemId,
                // Sertakan purchase_limit jika semua model tidak aktif
                ...(allModelsInactive && { purchase_limit: 0 }),
                models: [{
                  model_id: modelId,
                  status: 1,
                  input_promo_price: model.input_promotion_price,
                  stock: model.campaign_stock
                }]
              }]
            }
          : {
              shop_id: Number(shopId),
              flash_sale_id: Number(flashSaleId),
              items: [{
                item_id: itemId,
                purchase_limit: 0,
                models: [{
                  model_id: modelId,
                  input_promo_price: model.input_promotion_price,
                  stock: model.campaign_stock
                }]
              }]
            };

        const response = await fetch(endpoint, {
          method: isItemRegistered(itemId) ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        if (data.success) {
          // Cek apakah ada failed items
          if (data.data?.failed_items?.length > 0) {
            const failedItem = data.data.failed_items[0];
            const errorMessages = failedItem.unqualified_conditions
              ?.map((condition: UnqualifiedCondition) => condition.unqualified_msg)
              .join(', ');
            
            toast({
              variant: "destructive",
              title: "Gagal mengaktifkan model",
              description: errorMessages || failedItem.err_msg
            });
            return;
          }

          // Update registeredItems jika ini item baru
          if (!isItemRegistered(itemId)) {
            setRegisteredItems(prev => {
              const next = new Set(prev);
              next.add(itemId);
              return next;
            });
          }

          // Update state
          setActivatedModels(prev => {
            const next = new Set(prev);
            next.add(`${itemId}-${modelId}`);
            return next;
          });

          setFlashSaleData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              models: prev.models.map(m => {
                if (m.item_id === itemId && m.model_id === modelId) {
                  return { 
                    ...m, 
                    status: 1,
                    input_promotion_price: model.input_promotion_price,
                    campaign_stock: model.campaign_stock
                  } as Item;
                }
                return m;
              })
            };
          });

          toast({
            title: "Berhasil",
            description: "Model berhasil diaktifkan"
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: data.message || "Gagal mengaktifkan model"
          });
        }
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

  // Modifikasi handleMassActivation
  const handleMassActivation = async (activate: boolean) => {
    try {
      const modelKeys = Array.from(selectedModels);
      const registeredModels: any[] = [];
      const newModels: any[] = [];

      // Buat Map untuk mengelompokkan model berdasarkan item_id
      const itemModelsMap = new Map<number, {
        models: any[],
        allInactive: boolean
      }>();

      // Pertama, kelompokkan model berdasarkan item_id
      modelKeys.forEach(key => {
        const [itemId, modelId] = key.split('-').map(Number);
        const model = flashSaleData?.models.find(
          m => m.item_id === itemId && m.model_id === modelId
        );

        if (!model) return;

        if (!itemModelsMap.has(itemId)) {
          // Cek apakah semua model dalam item ini tidak aktif
          const allItemModels = flashSaleData?.models.filter(m => m.item_id === itemId) || [];
          const allInactive = allItemModels.length > 0 ? allItemModels.every(m => m.status === 0) : true;
          
          itemModelsMap.set(itemId, {
            models: [],
            allInactive
          });
        }

        const itemData = itemModelsMap.get(itemId);
        if (itemData) {
          itemData.models.push(model);
        }
      });

      // Kemudian, proses setiap item
      itemModelsMap.forEach((itemData, itemId) => {
        if (isItemRegistered(itemId)) {
          // Untuk item yang sudah terdaftar
          const modelData = itemData.models.map(model => 
            activate ? {
              model_id: model.model_id,
              status: 1,
              input_promo_price: model.input_promotion_price,
              stock: model.campaign_stock
            } : {
              model_id: model.model_id,
              status: 0
            }
          );

          registeredModels.push({
            item_id: itemId,
            // Sertakan purchase_limit jika semua model tidak aktif
            ...(itemData.allInactive && activate && { purchase_limit: 0 }),
            models: modelData
          });
        } else if (activate) {
          // Untuk item baru
          newModels.push({
            item_id: itemId,
            purchase_limit: 0, // Selalu sertakan untuk item baru
            models: itemData.models.map(model => ({
              model_id: model.model_id,
              input_promo_price: model.input_promotion_price,
              stock: model.campaign_stock
            }))
          });
        }
      });

      // Lanjutkan dengan kode yang ada untuk mengirim request...
      const requests = [];
      
      if (registeredModels.length > 0) {
        requests.push(
          fetch('/api/flashsale/items/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shop_id: shopId,
              flash_sale_id: flashSaleId,
              items: registeredModels
            })
          })
        );
      }

      if (newModels.length > 0) {
        requests.push(
          fetch('/api/flashsale/items/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shop_id: shopId,
              flash_sale_id: flashSaleId,
              items: newModels
            })
          })
        );
      }

      const responses = await Promise.all(requests);
      const results = await Promise.all(responses.map(r => r.json()));

      // Proses hasil
      let successCount = 0;
      let failedCount = 0;
      const newRegisteredItems = new Set(registeredItems);

      results.forEach(result => {
        if (result.success) {
          // Update registeredItems untuk item baru yang berhasil
          if (result.data?.items) {
            result.data.items.forEach((item: any) => {
              newRegisteredItems.add(item.item_id);
            });
          }
          successCount += result.data?.success_count || 0;

          // Buat Set untuk menyimpan model yang gagal
          const failedModels = new Set(
            (result.data?.failed_items || []).map((item: FailedItem) => 
              `${item.item_id}-${item.model_id}`
            )
          );

          // Update hanya untuk model yang berhasil
          modelKeys.forEach(key => {
            // Skip jika model ini ada di failed_items
            if (failedModels.has(key)) return;

            const [itemId, modelId] = key.split('-').map(Number);
            
            if (activate) {
              // Aktifkan model
              setActivatedModels(prev => {
                const next = new Set(prev);
                next.add(`${itemId}-${modelId}`);
                return next;
              });
            } else {
              // Nonaktifkan model
              setActivatedModels(prev => {
                const next = new Set(prev);
                next.delete(`${itemId}-${modelId}`);
                return next;
              });
            }

            // Update flashSaleData
            setFlashSaleData(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                models: prev.models.map(m => {
                  if (m.item_id === itemId && m.model_id === modelId) {
                    const model = flashSaleData?.models.find(
                      fm => fm.item_id === itemId && fm.model_id === modelId
                    );
                    
                    if (activate && model) {
                      return { 
                        ...m,
                        status: 1,
                        input_promotion_price: model.input_promotion_price || model.promotion_price_with_tax,
                        campaign_stock: model.campaign_stock || 0
                      } as Item;
                    } else {
                      return {
                        ...m,
                        status: 0
                      } as Item;
                    }
                  }
                  return m;
                })
              };
            });
          });
        }
        
        // Update failedCount dan tampilkan detail error
        if (result.data?.failed_items) {
          failedCount += result.data.failed_items.length;
          
          // Tampilkan detail error untuk setiap item yang gagal
          result.data.failed_items.forEach((failedItem: FailedItem) => {
            const errorMessages = failedItem.unqualified_conditions
              ?.map((condition: UnqualifiedCondition) => condition.unqualified_msg)
              .join(', ');
              
            toast({
              variant: "destructive",
              title: `Error pada item ${failedItem.item_id}`,
              description: errorMessages || failedItem.err_msg
            });
          });
        }
      });

      // Update state
      setRegisteredItems(newRegisteredItems);

      // Tampilkan notifikasi
      if (successCount > 0) {
        toast({
          title: "Berhasil",
          description: `${successCount} model berhasil ${activate ? 'diaktifkan' : 'dinonaktifkan'}`
        });
      }
      if (failedCount > 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `${failedCount} model gagal ${activate ? 'diaktifkan' : 'dinonaktifkan'}`
        });
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
    
    // Buat array untuk items baru dengan type FlashSaleItem
    const newItems: FlashSaleItem[] = selectedProducts.map(product => ({
      item_id: product.item_id,
      item_name: product.item_name,
      image: product.image.image_url_list[0]
    }));

    // Buat array untuk models baru dengan type Item
    const newModels: Item[] = selectedProducts.flatMap(product => 
      product.models.map(model => ({
        item_id: product.item_id,
        model_id: model.model_id,
        model_name: model.model_name,
        original_price: model.price_info.original_price,
        promotion_price_with_tax: model.price_info.current_price,
        input_promotion_price: model.price_info.current_price,
        campaign_stock: Math.min(20, (model.stock_info?.seller_stock ?? 0) - (model.stock_info?.total_reserved_stock ?? 0)),
        purchase_limit: 0,
        reject_reason: "",
        status: 0,
        stock: model.stock_info?.seller_stock ?? 0
      }))
    );

    setFlashSaleData(prev => {
      if (!prev) return prev;

      const existingItemIds = new Set(prev.items.map(item => item.item_id));
      const filteredNewItems = newItems.filter(item => !existingItemIds.has(item.item_id));

      const existingModelKeys = new Set(
        prev.models.map(model => `${model.item_id}-${model.model_id}`)
      );
      const filteredNewModels = newModels.filter(
        model => !existingModelKeys.has(`${model.item_id}-${model.model_id}`)
      );

      return {
        ...prev,
        items: [...prev.items, ...filteredNewItems],
        models: [...prev.models, ...filteredNewModels]
      };
    });

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
                              src={`https://down-id.img.susercontent.com/${item.image}`}
                              alt={item.item_name}
                              className="object-cover rounded-md w-full h-full"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-image.jpg';
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.item_name}</span>
                            {isItemRegistered(item.item_id) ? (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                Terdaftar
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                                Belum Terdaftar
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Model rows */}
                    {!collapsedItems.has(item.item_id) && itemModels.map((model: any) => (
                      <TableRow key={`${model.item_id}-${model.model_id}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedModels.has(`${model.item_id}-${model.model_id}`)}
                            onCheckedChange={() => toggleModelSelection(model.item_id, model.model_id)}
                          />
                        </TableCell>
                        <TableCell>{model.model_name}</TableCell>
                        <TableCell>{formatRupiah(model.original_price)}</TableCell>
                        <TableCell>{formatRupiah(model.promotion_price_with_tax || model.promotion_price)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={model.input_promotion_price || model.promotion_price_with_tax}
                            className="w-28 h-9"
                            disabled={activatedModels.has(`${model.item_id}-${model.model_id}`)}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (!isNaN(value)) {
                                const updatedModels = flashSaleData.models.map((m: any) => {
                                  if (m.item_id === model.item_id && m.model_id === model.model_id) {
                                    return { ...m, input_promotion_price: value };
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
                            disabled={activatedModels.has(`${model.item_id}-${model.model_id}`)}
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
                                checked
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