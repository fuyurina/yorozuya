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
  const [invalidStocks, setInvalidStocks] = useState<{ [key: number]: boolean }>({});
  const [massUpdateStock, setMassUpdateStock] = useState<number | ''>('');
  const [loadingProductId, setLoadingProductId] = useState<number | null>(null)
  const [isSyncingItem, setIsSyncingItem] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [stockPrices, setStockPrices] = useState<StockPrice[]>([])

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
    try {
      const response = await getStockPrices(itemId)
      const stocks = response as StockPrice[]
      setSelectedItemStocks(stocks)
      setIsStockDialogOpen(true)
    } finally {
      setLoadingProductId(null)
    }
  }

  const validateStock = (modelId: number, value: number): { isValid: boolean; minRequired: number } => {
    const stock = selectedItemStocks.find(s => s.model_id === modelId);
    if (!stock) return { isValid: true, minRequired: 0 };

    const totalShopeeStock = stock.stock_info.shopee_stock.reduce((total, loc) => total + loc.stock, 0);
    const minRequiredStock = stock.stock_info.total_reserved_stock - totalShopeeStock;

    return {
      isValid: value >= minRequiredStock,
      minRequired: minRequiredStock
    };
  };

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

      const [modelId, newStock] = Object.entries(editedStocks)[0];
      
      const modelData = stockPrices.find(m => m.model_id === parseInt(modelId));
      const reservedStock = modelData?.stock_info.total_reserved_stock || 0;

      const success = await updateStock(
        product.shop_id,
        selectedItemId,
        parseInt(modelId),
        newStock,
        reservedStock
      );

      if (success) {
        toast.success("Stok berhasil diperbarui");
        setIsStockDialogOpen(false);
        setEditedStocks({});
      }
    } catch (error) {
      console.error('Error saving stocks:', error);
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan perubahan stok');
    } finally {
      setIsSavingStocks(false);
    }
  };

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

          <Button className="w-full sm:w-auto" disabled={isLoadingShops}>
            Sinkronisasi Produk
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
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
