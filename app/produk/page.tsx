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
import { useEffect } from 'react'

export default function ProdukPage() {
  const { products, isSyncing, syncProducts, shops, loadShops, isLoadingShops } = useProducts()

  useEffect(() => {
    loadShops()
  }, [])

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Daftar Produk</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button disabled={isLoadingShops}>
              Sinkronisasi Produk
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pilih Toko untuk Sinkronisasi</DialogTitle>
            </DialogHeader>
            {isLoadingShops ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Memuat daftar toko...</span>
              </div>
            ) : (
              <div className="grid gap-4 py-4">
                {shops.map((shop) => (
                  <Button
                    key={shop.shop_id}
                    onClick={() => {
                      syncProducts(shop.shop_id)
                    }}
                    disabled={isSyncing}
                    variant="outline"
                    className="w-full justify-between"
                  >
                    <span>{shop.shop_name}</span>
                    {isSyncing && <Loader2 className="h-4 w-4 animate-spin" />}
                  </Button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Tampilkan daftar produk */}
      <div className="grid gap-4">
        {products.map((product) => (
          <div 
            key={product.item_id}
            className="p-4 border rounded-lg"
          >
            <h3 className="font-semibold">{product.item_name}</h3>
            <div className="mt-2">
              {product.models?.map((model) => (
                <div 
                  key={model.model_id}
                  className="text-sm text-gray-600"
                >
                  <p>{model.model_name}</p>
                  <p>Harga: Rp {model.price_info.current_price}</p>
                  <p>Stok: {model.stock_info.stock}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
