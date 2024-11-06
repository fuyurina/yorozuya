'use client';

import { useShops } from '@/app/hooks/useShops';
import { useOrderSync } from '@/app/hooks/useOrderSync';
import { useState } from 'react';

interface SyncStatus {
  [shopId: number]: {
    progress: { current: number; total: number } | null;
    error: string | null;
  };
}

export default function ShopsPage() {
  const { shops, isLoading, error } = useShops();
  const { syncOrders, isLoading: isSyncing } = useOrderSync();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({});

  const handleSync = async (shopId: number) => {
    try {
      setSyncStatus(prev => ({
        ...prev,
        [shopId]: { progress: null, error: null }
      }));

      await syncOrders(shopId, {
        onProgress: (progress: { current: number; total: number }) => {
          setSyncStatus(prev => ({
            ...prev,
            [shopId]: { ...prev[shopId], progress }
          }));
        },
        onError: (error) => {
          setSyncStatus(prev => ({
            ...prev,
            [shopId]: { ...prev[shopId], error }
          }));
        }
      });
    } catch (err) {
      console.error('Gagal melakukan sinkronisasi:', err);
      setSyncStatus(prev => ({
        ...prev,
        [shopId]: { ...prev[shopId], error: 'Gagal melakukan sinkronisasi' }
      }));
    }
  };

  if (isLoading) {
    return <div className="p-4">Memuat data toko...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Daftar Toko</h1>
      </div>

      {shops.length === 0 ? (
        <p className="text-gray-500">Belum ada toko yang terhubung</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <div
              key={shop.shop_id}
              className="border rounded-lg p-4 shadow-sm"
            >
              <h2 className="font-semibold text-lg">{shop.shop_name}</h2>
              <p className="text-gray-600">ID Toko: {shop.shop_id}</p>
              <p className="text-gray-600">Access Token: {shop.access_token}</p>
              
              <button
                onClick={() => handleSync(shop.shop_id)}
                disabled={isSyncing}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
              >
                {isSyncing ? 'Sedang Sinkronisasi...' : 'Sinkronisasi Order'}
              </button>
              
              {syncStatus[shop.shop_id]?.progress && (
                <div className="mt-2 text-sm text-gray-600">
                  Progress: {syncStatus[shop.shop_id].progress?.current}/
                  {syncStatus[shop.shop_id].progress?.total} order
                </div>
              )}
              
              {syncStatus[shop.shop_id]?.error && (
                <p className="mt-2 text-sm text-red-500">
                  {syncStatus[shop.shop_id].error}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
