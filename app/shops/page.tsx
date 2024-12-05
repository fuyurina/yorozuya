'use client';

import { useShops } from '@/app/hooks/useShops';
import { useState, useEffect } from 'react';

interface SyncStatus {
  [shopId: number]: {
    progress: { current: number; total: number } | null;
    error: string | null;
    isSyncing: boolean;
  };
}

interface TokenStatus {
  [shopId: number]: {
    is_active: boolean;
    message: string;
    isChecking: boolean;
  };
}

export default function ShopsPage() {
  const { shops, isLoading, error } = useShops();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({});
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>({});
  const [isConnecting, setIsConnecting] = useState(false);

  const checkTokens = async (shopsList: any[]) => {
    if (!shopsList || shopsList.length === 0) return;

    // Set status checking untuk semua toko
    const initialStatus = shopsList.reduce((acc, shop) => ({
      ...acc,
      [shop.shop_id]: { isChecking: true, is_active: false, message: '' }
    }), {});
    setTokenStatus(initialStatus);

    try {
      const response = await fetch('/api/cek-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shop_ids: shopsList.map(shop => shop.shop_id)
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message);
      }

      const newStatus = result.data.reduce((acc: TokenStatus, status: any) => ({
        ...acc,
        [status.shop_id]: {
          is_active: status.is_active,
          message: status.message,
          isChecking: false
        }
      }), {});

      setTokenStatus(newStatus);
    } catch (err) {
      console.error('Gagal mengecek token:', err);
      const errorStatus = shopsList.reduce((acc, shop) => ({
        ...acc,
        [shop.shop_id]: { 
          isChecking: false, 
          is_active: false, 
          message: 'Gagal mengecek token' 
        }
      }), {});
      setTokenStatus(errorStatus);
    }
  };

  // Tambahkan useEffect untuk mengecek token otomatis
  useEffect(() => {
    if (shops && !isLoading) {
      checkTokens(shops);
    }
  }, [shops, isLoading]);

  const handleSync = async (shopId: number) => {
    try {
      setSyncStatus(prev => ({
        ...prev,
        [shopId]: { 
          progress: { current: 0, total: 0 },
          error: null,
          isSyncing: true
        }
      }));

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shopId })
      });

      if (!response.ok) {
        throw new Error('Gagal melakukan sinkronisasi');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream tidak tersedia');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        try {
          const progress = JSON.parse(chunk);
          
          if (typeof progress.processed === 'number' && typeof progress.total === 'number') {
            setSyncStatus(prev => ({
              ...prev,
              [shopId]: {
                ...prev[shopId],
                progress: { 
                  current: progress.processed, 
                  total: progress.total 
                },
                isSyncing: true
              }
            }));
          }
        } catch (e) {
          // Biarkan error parsing tanpa logging
        }
      }

      setSyncStatus(prev => ({
        ...prev,
        [shopId]: {
          ...prev[shopId],
          isSyncing: false
        }
      }));

    } catch (err: any) {
      setSyncStatus(prev => ({
        ...prev,
        [shopId]: {
          ...prev[shopId],
          error: err.message || 'Gagal melakukan sinkronisasi',
          isSyncing: false
        }
      }));
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/generate-auth-url');
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Gagal mendapatkan URL autentikasi:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return <div className="p-4">Memuat data toko...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Daftar Toko Shopee</h1>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 
                    disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors
                    flex items-center gap-2"
        >
          {isConnecting ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Menghubungkan...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Tambah Toko</span>
            </>
          )}
        </button>
      </div>

      {shops.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500 text-lg">Belum ada toko yang terhubung</p>
          <p className="text-gray-400 mt-2">Silakan hubungkan toko Shopee Anda terlebih dahulu</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <div
              key={shop.shop_id}
              className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-500 text-xl font-bold">
                    {shop.shop_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="font-bold text-xl text-gray-800">{shop.shop_name}</h2>
                  <p className="text-gray-500 text-sm">ID: {shop.shop_id}</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">Status Token</p>
                  <div className="flex items-center gap-2 mt-1">
                    {tokenStatus[shop.shop_id]?.isChecking ? (
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm text-blue-500">Mengecek...</span>
                      </div>
                    ) : (
                      <>
                        <div className={`w-2 h-2 rounded-full ${
                          tokenStatus[shop.shop_id]?.is_active ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm text-gray-700">
                          {tokenStatus[shop.shop_id]?.message || 'Belum dicek'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {syncStatus[shop.shop_id] && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-700 font-medium">Status Sinkronisasi</p>
                    <div className="mt-2">
                      <div className="w-full bg-blue-100 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ 
                            width: (() => {
                              const total = syncStatus[shop.shop_id]?.progress?.total || 0;
                              const current = syncStatus[shop.shop_id]?.progress?.current || 0;
                              return total > 0 ? `${Math.round((current / total) * 100)}%` : '0%';
                            })()
                          }}
                        ></div>
                      </div>
                      <p className="text-sm text-blue-600 mt-2">
                        {syncStatus[shop.shop_id]?.progress?.current || 0} dari {syncStatus[shop.shop_id]?.progress?.total || 0} order
                      </p>
                    </div>
                  </div>
                )}

                {syncStatus[shop.shop_id]?.error && (
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">Error</p>
                    <p className="text-sm text-red-500 mt-1">
                      {syncStatus[shop.shop_id].error}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleSync(shop.shop_id)}
                disabled={syncStatus[shop.shop_id]?.isSyncing}
                className="w-full px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 
                          disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors
                          flex items-center justify-center gap-2"
              >
                {syncStatus[shop.shop_id]?.isSyncing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Sedang Sinkronisasi...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    <span>Sinkronisasi Order</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
