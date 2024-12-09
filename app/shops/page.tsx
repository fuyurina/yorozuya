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

  const handleDeauth = async (shopId: number) => {
    try {
      const response = await fetch('/api/generate-deauth-url');
      const data = await response.json();
      if (data.deauthUrl) {
        window.location.href = data.deauthUrl;
      }
    } catch (error) {
      console.error('Gagal mendapatkan URL deautentikasi:', error);
    }
  };

  if (isLoading) {
    return <div className="p-4">Memuat data toko...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto dark:bg-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Toko Shopee</h1>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="px-3 py-1.5 bg-orange-500 text-white rounded-md hover:bg-orange-600 
                    disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors
                    flex items-center gap-1.5 text-sm"
        >
          {isConnecting ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Menghubungkan</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Tambah Toko</span>
            </>
          )}
        </button>
      </div>

      {shops.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">Belum ada toko yang terhubung</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Silakan hubungkan toko Shopee Anda</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <div
              key={shop.shop_id}
              className="bg-white dark:bg-gray-800 rounded-md p-4 border border-gray-100 dark:border-gray-700 
                       hover:border-gray-200 dark:hover:border-gray-600 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-md flex items-center justify-center">
                  <span className="text-orange-500 dark:text-orange-400 text-lg font-semibold">
                    {shop.shop_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h2 className="font-medium text-gray-800 dark:text-gray-100">{shop.shop_name}</h2>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">ID: {shop.shop_id}</p>
                </div>
              </div>

              <div className="space-y-2 mb-3 text-sm">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">
                  <div className="flex items-center gap-2">
                    {tokenStatus[shop.shop_id]?.isChecking ? (
                      <div className="flex items-center gap-1.5">
                        <svg className="animate-spin h-3 w-3 text-blue-500 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-xs text-blue-500 dark:text-blue-400">Mengecek token...</span>
                      </div>
                    ) : (
                      <>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          tokenStatus[shop.shop_id]?.is_active ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {tokenStatus[shop.shop_id]?.message || 'Belum dicek'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {syncStatus[shop.shop_id]?.isSyncing && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md">
                    <div className="w-full bg-blue-100 dark:bg-blue-800/50 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: (() => {
                            const total = syncStatus[shop.shop_id]?.progress?.total || 0;
                            const current = syncStatus[shop.shop_id]?.progress?.current || 0;
                            return total > 0 ? `${Math.round((current / total) * 100)}%` : '0%';
                          })()
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {syncStatus[shop.shop_id]?.progress?.current || 0}/{syncStatus[shop.shop_id]?.progress?.total || 0}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSync(shop.shop_id)}
                  disabled={syncStatus[shop.shop_id]?.isSyncing}
                  className="flex-1 px-3 py-1.5 bg-orange-500 text-white text-sm rounded-md hover:bg-orange-600 
                            disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors
                            flex items-center justify-center gap-1.5"
                >
                  {syncStatus[shop.shop_id]?.isSyncing ? 'Sinkronisasi...' : 'Sinkronisasi'}
                </button>

                <button
                  onClick={() => handleDeauth(shop.shop_id)}
                  className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md 
                            hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                  title="Putuskan koneksi toko"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
