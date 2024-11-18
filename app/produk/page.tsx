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

interface Shop {
  shop_id: number;
  shop_name: string;
}

interface Product {
  item_id: number;
  item_name: string;
  shopee_tokens: Shop[];
  image_id_list: string[];
  image_url_list: string[];
}

interface StockPrice {
  model_id: number;
  model_name: string;
  current_price: number;
  original_price: number;
  stock: number;
  model_status: string;
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
    getStockPrices
  } = useProducts()
  const [syncProgress, setSyncProgress] = useState(0)
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false)
  const [selectedShops, setSelectedShops] = useState<number[]>([])
  const [isCurrentlySyncing, setIsCurrentlySyncing] = useState(false)
  const [selectedItemStocks, setSelectedItemStocks] = useState<StockPrice[]>([])
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [isLoadingStocks, setIsLoadingStocks] = useState(false)

  const filteredProducts = products.filter((product) => {
    if (selectedShopId === 'all') return true
    return product.shopee_tokens?.some(shop => shop.shop_id.toString() === selectedShopId)
  })

  useEffect(() => {
    loadShops()
  }, [])

  const handleViewStockDetail = async (itemId: number) => {
    setIsLoadingStocks(true)
    try {
      const stocks = await getStockPrices(itemId)
      setSelectedItemStocks(stocks)
      setIsStockDialogOpen(true)
    } finally {
      setIsLoadingStocks(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Daftar Produk</h1>
        <div className="flex gap-4 items-center">
          <Select
            value={selectedShopId}
            onValueChange={setSelectedShopId}
            disabled={isLoadingShops}
          >
            <SelectTrigger className="w-[200px]">
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

          <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={isLoadingShops}>
                Sinkronisasi Produk
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Sinkronisasi Produk</DialogTitle>
              </DialogHeader>
              
              {isLoadingShops ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Memuat daftar toko...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Pilih toko yang akan disinkronkan
                    </span>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedShops(shops.map(s => s.shop_id))}
                      >
                        Pilih Semua
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedShops([])}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="h-[300px] rounded-md border p-4">
                    <div className="grid gap-2">
                      {shops.map((shop) => (
                        <Card key={shop.shop_id} className="cursor-pointer">
                          <CardContent 
                            className="p-3 flex items-center justify-between"
                            onClick={() => {
                              setSelectedShops(prev => 
                                prev.includes(shop.shop_id)
                                  ? prev.filter(id => id !== shop.shop_id)
                                  : [...prev, shop.shop_id]
                              )
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedShops.includes(shop.shop_id)}
                                onChange={() => {}}
                                className="h-4 w-4"
                              />
                              <span>{shop.shop_name}</span>
                            </div>
                            <Badge variant={selectedShops.includes(shop.shop_id) ? "default" : "outline"}>
                              {selectedShops.includes(shop.shop_id) ? "Dipilih" : "Belum dipilih"}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>

                  {isCurrentlySyncing && (
                    <div className="space-y-2">
                      <Progress value={syncProgress} className="w-full" />
                      <p className="text-sm text-center text-muted-foreground">
                        Sedang mensinkronkan {Math.round(syncProgress)}% produk...
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsSyncDialogOpen(false)}
                      disabled={isCurrentlySyncing}
                    >
                      Batal
                    </Button>
                    <Button
                      disabled={selectedShops.length === 0 || isCurrentlySyncing}
                      onClick={async () => {
                        try {
                          setIsCurrentlySyncing(true)
                          
                          for (let i = 0; i < selectedShops.length; i++) {
                            const shopId = selectedShops[i]
                            await syncProducts(shopId)
                            setSyncProgress(((i + 1) / selectedShops.length) * 100)
                          }
                          
                          setIsSyncDialogOpen(false)
                          setSelectedShops([])
                          setSyncProgress(0)
                          await loadShops()
                          await loadProducts()
                          
                        } catch (error) {
                          console.error('Sync error:', error)
                        } finally {
                          setIsCurrentlySyncing(false)
                        }
                      }}
                    >
                      {isCurrentlySyncing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Mensinkronkan...
                        </>
                      ) : (
                        `Sinkronkan ${selectedShops.length} Toko`
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gambar</TableHead>
              <TableHead>ID Produk</TableHead>
              <TableHead>Nama Produk</TableHead>
              <TableHead>Toko</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
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
                  <TableCell>{product.item_id}</TableCell>
                  <TableCell>
                    <p className="font-medium">{product.item_name}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5">
                      {product.shopee_tokens?.map((shop) => (
                        <span 
                          key={shop.shop_id}
                          className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-sm font-medium"
                        >
                          {shop.shop_name}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewStockDetail(product.item_id)}
                      disabled={isLoadingStocks}
                    >
                      {isLoadingStocks ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Memuat...
                        </>
                      ) : (
                        'Lihat Detail'
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detail Stok dan Harga</DialogTitle>
          </DialogHeader>
          
          <div className="relative">
            {isLoadingStocks ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Memuat data stok...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Varian</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead>Harga Asli</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItemStocks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Tidak ada data varian
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedItemStocks.map((stock) => (
                      <TableRow key={stock.model_id}>
                        <TableCell>{stock.model_name}</TableCell>
                        <TableCell>{formatRupiah(stock.current_price)}</TableCell>
                        <TableCell>{formatRupiah(stock.original_price)}</TableCell>
                        <TableCell>{stock.stock}</TableCell>
                        <TableCell>
                          <Badge variant={stock.model_status === 'active' ? 'default' : 'secondary'}>
                            {stock.model_status === 'active' ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
