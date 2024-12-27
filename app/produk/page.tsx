'use client'

import { useProducts } from '@/app/hooks/useProducts'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatRupiah } from "@/lib/utils"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"

interface StockPrice {
  model_id: number;
  model_name: string;
  current_price: number;
  original_price: number;
  stock_info: {
    seller_stock: number;
    shopee_stock: Array<{
      stock: number;
      location_id: string;
    }>;
    total_reserved_stock: number;
    total_available_stock: number;
  };
  model_status: string;
  image_url?: string;
}

export default function ProdukPage() {
  const [selectedShopId, setSelectedShopId] = useState<string>('all')
  const { 
    products, 
    syncProducts, 
    shops, 
    loadShops, 
    isLoadingShops, 
    loadProducts,
    getStockPrices,
    syncSingleProduct,
    updateStock
  } = useProducts()
  const [syncProgress, setSyncProgress] = useState(0)
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false)
  const [selectedShops, setSelectedShops] = useState<number[]>([])
  const [isCurrentlySyncing, setIsCurrentlySyncing] = useState(false)
  const [selectedItemStocks, setSelectedItemStocks] = useState<StockPrice[]>([])
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [isLoadingStocks, setIsLoadingStocks] = useState(false)
  const [editedStocks, setEditedStocks] = useState<{ [key: number]: number }>({})
  const [isSavingStocks, setIsSavingStocks] = useState(false)
  const [invalidStocks] = useState<{ [key: number]: boolean }>({});
  const [massUpdateStock, setMassUpdateStock] = useState<number | ''>('');
  const [loadingProductId, setLoadingProductId] = useState<number | null>(null)
  const [isSyncingItem, setIsSyncingItem] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [stockPrices, setStockPrices] = useState<StockPrice[]>([])
  const [syncResult, setSyncResult] = useState<{ success: number; total: number } | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [isBulkStockDialogOpen, setIsBulkStockDialogOpen] = useState(false)
  const [bulkStockValue, setBulkStockValue] = useState<number>(0)
  const [isSavingBulkStock, setIsSavingBulkStock] = useState(false)

  const filteredProducts = products.filter((product) => {
    if (selectedShopId === 'all') return true
    return product.shopee_tokens?.some(shop => shop.shop_id.toString() === selectedShopId)
  })

  useEffect(() => {
    loadShops()
  }, [])

  const handleViewStockDetail = async (itemId: number) => {
    setLoadingProductId(itemId)
    setSelectedItemId(itemId)
    setIsLoadingStocks(true)
    try {
      const response = await getStockPrices(itemId)
      const stocks = response as StockPrice[]
      setSelectedItemStocks(stocks)
      setStockPrices(stocks)
      setIsStockDialogOpen(true)
    } finally {
      setLoadingProductId(null)
      setIsLoadingStocks(false)
    }
  }

  

  const handleStockChange = (modelId: number, newValue: number) => {
    setEditedStocks(prev => ({
      ...prev,
      [modelId]: newValue
    }));
  };

  const handleBlur = (modelId: number, value: number) => {
    const minStock = selectedItemStocks.find(s => s.model_id === modelId)?.stock_info.total_reserved_stock || 0;
    if (value < minStock) {
      handleStockChange(modelId, minStock);
      toast.warning("Stok disesuaikan dengan stok minimum yang dikunci");
    }
  };

  const handleMassUpdate = () => {
    if (massUpdateStock === '') return;
    
    const newStocks = { ...editedStocks };
    selectedItemStocks.forEach(stock => {
      const minStock = stock.stock_info.total_reserved_stock;
      newStocks[stock.model_id] = massUpdateStock < minStock ? minStock : massUpdateStock;
    });
    
    setEditedStocks(newStocks);
    setMassUpdateStock('');
    toast.success("Stok berhasil diperbarui untuk semua varian");
  };


  const handleSaveStocks = async () => {
    setIsSavingStocks(true);
    try {
      const product = products.find(p => p.item_id === selectedItemId);
      if (!product || !selectedItemId) return;

      // Menyiapkan data untuk semua model yang diubah
      const modelUpdates = Object.entries(editedStocks).map(([modelId, newStock]) => {
        const modelData = stockPrices.find(m => m.model_id === parseInt(modelId));
        const reservedStock = modelData?.stock_info.total_reserved_stock || 0;

        return {
          modelId: parseInt(modelId),
          newStock,
          reservedStock
        };
      });

      const result = await updateStock(
        product.shop_id,
        selectedItemId,
        modelUpdates
      );

      if (result.success) {
        toast.success("Stok berhasil diperbarui");
        setIsStockDialogOpen(false);
        setEditedStocks({});
      } else {
        // Jika ada model yang gagal diupdate
        if (result.failedModels?.length > 0) {
          toast.error("Beberapa varian gagal diupdate", {
            description: result.failedModels.map((fail: { modelId: number; reason: string }) => 
              `Model ID ${fail.modelId}: ${fail.reason}`
            ).join('\n')
          });
        } else {
          toast.error(result.message || "Gagal memperbarui stok");
        }
      }
      
    } catch (error) {
      console.error('Error saving stocks:', error);
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan perubahan stok');
    } finally {
      setIsSavingStocks(false);
    }
  };

  const handleSyncProducts = async () => {
    if (selectedShops.length === 0) {
      toast.error("Pilih minimal satu toko untuk disinkronkan")
      return
    }

    setIsCurrentlySyncing(true)
    setSyncProgress(0)
    setSyncResult(null)
    
    try {
      const result = await syncProducts(selectedShops, (progress) => {
        setSyncProgress(progress)
      })
      
      setSyncResult(result)
      toast.success("Sinkronisasi selesai")
    } catch (error) {
      toast.error("Gagal menyinkronkan produk")
    } finally {
      setIsCurrentlySyncing(false)
      setSyncProgress(0)
    }
  }

  const handleSelectProduct = (itemId: number) => {
    setSelectedProducts(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId)
      }
      return [...prev, itemId]
    })
  }

  const handleSelectAllProducts = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map(p => p.item_id))
    } else {
      setSelectedProducts([])
    }
  }

  const handleBulkStockUpdate = async () => {
    if (selectedProducts.length === 0) return
    
    setIsSavingBulkStock(true)
    let successCount = 0
    let failedCount = 0

    try {
      // Buat array of promises untuk semua produk yang dipilih
      const updatePromises = selectedProducts.map(async (productId) => {
        const product = products.find(p => p.item_id === productId)
        if (!product) {
          return { success: false, productId, error: 'Product not found' }
        }

        try {
          const stocks = await getStockPrices(productId)
          const modelUpdates = stocks.map(stock => ({
            modelId: stock.model_id,
            newStock: Math.max(bulkStockValue, stock.stock_info.total_reserved_stock),
            reservedStock: stock.stock_info.total_reserved_stock
          }))

          const result = await updateStock(
            product.shop_id,
            productId,
            modelUpdates
          )
          
          return { 
            success: result.success, 
            productId,
            error: result.message,
            failedModels: result.failedModels 
          }
        } catch (error) {
          return { 
            success: false, 
            productId,
            error: error instanceof Error ? error.message : 'Unknown error' 
          }
        }
      })

      // Jalankan semua promises secara parallel
      const results = await Promise.all(updatePromises)

      // Hitung hasil
      results.forEach(result => {
        if (result.success) {
          successCount++
        } else {
          failedCount++
          console.error(`Failed to update stock for product ${result.productId}:`, result.error)
        }
      })

      // Tampilkan hasil
      if (successCount > 0 || failedCount > 0) {
        const messages = []
        if (successCount > 0) messages.push(`${successCount} produk berhasil diupdate`)
        if (failedCount > 0) messages.push(`${failedCount} produk gagal diupdate`)
        
        toast[failedCount > 0 ? 'error' : 'success']('Update Stok Massal', {
          description: messages.join(', ')
        })
      }

      // Reset state
      setSelectedProducts([])
      setIsBulkStockDialogOpen(false)
      setBulkStockValue(0)
      
      // Refresh data produk
      loadProducts()

    } catch (error) {
      toast.error("Terjadi kesalahan saat mengupdate stok")
      console.error('Bulk update error:', error)
    } finally {
      setIsSavingBulkStock(false)
    }
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Daftar Produk</h1>
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center w-full sm:w-auto">
          <Select
            value={selectedShopId}
            onValueChange={setSelectedShopId}
            disabled={isLoadingShops}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Pilih Toko" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Toko</SelectItem>
              {shops.map((shop) => (
                <SelectItem key={shop.shop_id} value={shop.shop_id.toString()}>
                  {shop.shop_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedProducts.length > 0 && (
            <Button 
              onClick={() => setIsBulkStockDialogOpen(true)}
              variant="default"
            >
              Update Stok ({selectedProducts.length})
            </Button>
          )}

          <Button 
            className="w-full sm:w-auto" 
            disabled={isLoadingShops}
            onClick={() => setIsSyncDialogOpen(true)}
          >
            Sinkronisasi Produk
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={
                    filteredProducts.length > 0 &&
                    selectedProducts.length === filteredProducts.length
                  }
                  onCheckedChange={handleSelectAllProducts}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-[80px] sm:w-[100px]">Gambar</TableHead>
              <TableHead>Nama Produk</TableHead>
              <TableHead className="w-[80px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  {selectedShopId === 'all' 
                    ? "Belum ada produk yang tersedia"
                    : "Tidak ada produk untuk toko yang dipilih"}
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.item_id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedProducts.includes(product.item_id)}
                      onCheckedChange={() => handleSelectProduct(product.item_id)}
                      aria-label={`Select ${product.item_name}`}
                    />
                  </TableCell>
                  <TableCell className="w-[100px]">
                    {product.image_url_list?.[0] ? (
                      <div className="relative aspect-square">
                        <img 
                          src={product.image_url_list[0]} 
                          alt={product.item_name}
                          className="absolute inset-0 w-full h-full object-cover rounded-md"
                        />
                      </div>
                    ) : (
                      <div className="relative aspect-square bg-muted rounded-md flex items-center justify-center">
                        <span className="text-muted-foreground text-xs">No Image</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <p className="font-medium line-clamp-2">{product.item_name}</p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-primary whitespace-nowrap">
                            SKU: {product.item_sku || '-'}
                          </span>
                          <span className="hidden sm:inline text-muted-foreground">•</span>
                        </div>
                        <span className="text-muted-foreground whitespace-nowrap">ID: {product.item_id}</span>
                        <span className="hidden sm:inline text-muted-foreground">•</span>
                        <div className="flex flex-wrap gap-1.5 mt-1 sm:mt-0">
                          {product.shopee_tokens?.map((shop) => (
                            <span 
                              key={shop.shop_id}
                              className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                            >
                              {shop.shop_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewStockDetail(product.item_id)}
                      disabled={loadingProductId === product.item_id}
                    >
                      {loadingProductId === product.item_id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       
                        </>
                      ) : (
                        'Stok'
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent className="sm:max-w-[1000px] h-[90vh] sm:h-[80vh] w-[95vw] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Detail Stok dan Harga</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {isLoadingStocks ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Memuat data stok...</span>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="p-4 border-b space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                      <span className="text-sm font-medium whitespace-nowrap">Update Semua Stok:</span>
                      <div className="w-full sm:max-w-[140px]">
                        <input
                          type="number"
                          className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                          value={massUpdateStock}
                          onChange={(e) => setMassUpdateStock(e.target.value ? parseInt(e.target.value) : '')}
                          placeholder="Jumlah stok"
                        />
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                          size="sm"
                          className="flex-1 sm:flex-none"
                          onClick={handleMassUpdate}
                          disabled={massUpdateStock === ''}
                        >
                          Terapkan ke Semua
                        </Button>
                        {selectedItemId && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              setIsSyncingItem(true)
                              try {
                                const product = products.find(p => p.item_id === selectedItemId)
                                if (product) {
                                  const success = await syncSingleProduct(product.shop_id, selectedItemId)
                                  if (success) {
                                    toast.success("Produk berhasil disinkronkan")
                                    await handleViewStockDetail(selectedItemId)
                                  }
                                }
                              } catch (error) {
                                toast.error("Gagal menyinkronkan produk")
                              } finally {
                                setIsSyncingItem(false)
                              }
                            }}
                            disabled={isSyncingItem}
                          >
                            {isSyncingItem ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sinkronisasi...
                              </>
                            ) : (
                              <>
                                <svg 
                                  className="mr-2 h-4 w-4" 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  viewBox="0 0 24 24" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  strokeWidth="2" 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round"
                                >
                                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
                                </svg>
                                Sinkronisasi
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    *Stok akan otomatis disesuaikan dengan stok minimum yang dikunci untuk setiap varian
                  </p>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {/* Tampilan desktop */}
                    <div className="hidden sm:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[350px]">Varian</TableHead>
                            <TableHead className="w-[150px] text-center">Harga</TableHead>
                            <TableHead className="w-[150px] text-center">Harga Asli</TableHead>
                            <TableHead className="w-[120px] text-center">Stok Lock</TableHead>
                            <TableHead className="w-[130px] text-center">Stok</TableHead>
                            <TableHead className="w-[100px] text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItemStocks.map((stock) => (
                            <TableRow key={stock.model_id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {stock.image_url ? (
                                    <div className="w-10 h-10 rounded overflow-hidden">
                                      <img 
                                        src={stock.image_url} 
                                        alt={stock.model_name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                      <span className="text-xs text-muted-foreground">No img</span>
                                    </div>
                                  )}
                                  <span>{stock.model_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{formatRupiah(stock.current_price)}</TableCell>
                              <TableCell className="text-center">{formatRupiah(stock.original_price)}</TableCell>
                              <TableCell className="text-center">
                                {stock.stock_info.total_reserved_stock}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center">
                                  <div className="max-w-[120px]">
                                    <input
                                      type="number"
                                      className={cn(
                                        "w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm",
                                        invalidStocks[stock.model_id] && "border-red-500"
                                      )}
                                      value={editedStocks[stock.model_id] ?? stock.stock_info.seller_stock}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value) || 0;
                                        handleStockChange(stock.model_id, value);
                                      }}
                                      onBlur={(e) => {
                                        const value = parseInt(e.target.value) || 0;
                                        handleBlur(stock.model_id, value);
                                      }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center">
                                  <Badge variant={stock.model_status === 'MODEL_NORMAL' ? 'default' : 'secondary'}>
                                    {stock.model_status === 'MODEL_NORMAL' ? 'Aktif' : 'Nonaktif'}
                                  </Badge>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Tampilan mobile */}
                    <div className="block sm:hidden">
                      {selectedItemStocks.map((stock) => (
                        <Card key={stock.model_id} className="mb-4">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                              {stock.image_url ? (
                                <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                                  <img 
                                    src={stock.image_url} 
                                    alt={stock.model_name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs text-muted-foreground">No img</span>
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="font-medium mb-1">{stock.model_name}</p>
                                <Badge variant={stock.model_status === 'MODEL_NORMAL' ? 'default' : 'secondary'}>
                                  {stock.model_status === 'MODEL_NORMAL' ? 'Aktif' : 'Nonaktif'}
                                </Badge>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Harga</p>
                                  <p className="font-medium">{formatRupiah(stock.current_price)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Harga Asli</p>
                                  <p className="font-medium">{formatRupiah(stock.original_price)}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Stok Lock</p>
                                  <p className="font-medium">{stock.stock_info.total_reserved_stock}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Stok</p>
                                  <input
                                    type="number"
                                    className={cn(
                                      "w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm",
                                      invalidStocks[stock.model_id] && "border-red-500"
                                    )}
                                    value={editedStocks[stock.model_id] ?? stock.stock_info.seller_stock}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value) || 0;
                                      handleStockChange(stock.model_id, value);
                                    }}
                                    onBlur={(e) => {
                                      const value = parseInt(e.target.value) || 0;
                                      handleBlur(stock.model_id, value);
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
                
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t bg-background sticky bottom-0">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditedStocks({})
                      setIsStockDialogOpen(false)
                    }}
                    disabled={isSavingStocks}
                  >
                    Batal
                  </Button>
                  <Button
                    disabled={Object.keys(editedStocks).length === 0 || isSavingStocks}
                    onClick={handleSaveStocks}
                  >
                    {isSavingStocks ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan Perubahan'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-xl font-semibold">Sinkronisasi Produk</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Pilih toko yang akan disinkronkan produknya
            </p>
          </DialogHeader>
          
          <div className="py-6">
            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectedShops.length === shops.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedShops(shops.map(shop => shop.shop_id))
                    } else {
                      setSelectedShops([])
                    }
                  }}
                  disabled={isCurrentlySyncing}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Pilih Semua Toko
                </label>
              </div>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {shops.map((shop) => (
                <div 
                  key={shop.shop_id} 
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    selectedShops.includes(shop.shop_id) && "border-primary bg-primary/5"
                  )}
                >
                  <Checkbox
                    id={`shop-${shop.shop_id}`}
                    checked={selectedShops.includes(shop.shop_id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedShops([...selectedShops, shop.shop_id])
                      } else {
                        setSelectedShops(selectedShops.filter(id => id !== shop.shop_id))
                      }
                    }}
                    disabled={isCurrentlySyncing}
                  />
                  <label 
                    htmlFor={`shop-${shop.shop_id}`}
                    className="flex-1 text-sm font-medium cursor-pointer"
                  >
                    {shop.shop_name}
                  </label>
                </div>
              ))}
            </div>

            {isCurrentlySyncing && (
              <div className="mt-6 space-y-3">
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Progress Sinkronisasi</span>
                    <span className="text-primary">{Math.round(syncProgress)}%</span>
                  </div>
                  <Progress value={syncProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Mohon tunggu, sedang melakukan sinkronisasi...
                  </p>
                </div>
              </div>
            )}

            {syncResult && !isCurrentlySyncing && (
              <div className="mt-6">
                <div className="p-4 rounded-lg bg-muted space-y-3">
                  <h4 className="font-medium">Hasil Sinkronisasi</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-md bg-background">
                      <p className="text-sm text-muted-foreground">Total Produk</p>
                      <p className="text-2xl font-semibold">{syncResult.total}</p>
                    </div>
                    <div className="p-3 rounded-md bg-background">
                      <p className="text-sm text-muted-foreground">Berhasil Disinkronkan</p>
                      <p className="text-2xl font-semibold text-primary">{syncResult.success}</p>
                    </div>
                  </div>
                  {syncResult.total !== syncResult.success && (
                    <div className="p-3 rounded-md bg-yellow-50 border-yellow-200 border text-yellow-800">
                      <p className="text-sm">
                        {syncResult.total - syncResult.success} produk gagal disinkronkan
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            {!isCurrentlySyncing && syncResult ? (
              <Button
                onClick={() => {
                  setIsSyncDialogOpen(false)
                  setSelectedShops([])
                  setSyncResult(null)
                }}
                className="w-24"
              >
                Tutup
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSyncDialogOpen(false)
                    setSelectedShops([])
                    setSyncResult(null)
                  }}
                  disabled={isCurrentlySyncing}
                  className="w-24"
                >
                  Batal
                </Button>
                <Button
                  onClick={handleSyncProducts}
                  disabled={isCurrentlySyncing || selectedShops.length === 0}
                  className="w-40"
                >
                  {isCurrentlySyncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sinkronisasi...
                    </>
                  ) : (
                    'Mulai Sinkronisasi'
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkStockDialogOpen} onOpenChange={setIsBulkStockDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Stok Massal</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Jumlah Stok Baru
                </label>
                <input
                  type="number"
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  value={bulkStockValue}
                  onChange={(e) => setBulkStockValue(parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>• {selectedProducts.length} produk akan diupdate</p>
                <p>• Stok akan disesuaikan dengan stok minimum yang dikunci untuk setiap varian</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkStockDialogOpen(false)}
              disabled={isSavingBulkStock}
            >
              Batal
            </Button>
            <Button
              onClick={handleBulkStockUpdate}
              disabled={isSavingBulkStock}
            >
              {isSavingBulkStock ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Update Stok'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoadingShops && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Memuat data...</span>
          </div>
        </div>
      )}
    </div>
  )
}
