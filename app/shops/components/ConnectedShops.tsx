"use client";

import React from 'react';
import { useShops } from '@/app/hooks/useShops';
import { ShopsTable } from '@/app/shops/components/ShopsTable';
import { AddShopButton } from '@/app/shops/components/AddShopButton';
export default function ConnectedShops() {
  const { shops, isLoading, error } = useShops();

  if (isLoading) return <div>Memuat data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Toko Terhubung</h2>
        <AddShopButton />
      </div>
      {shops.length === 0 ? (
        <p>Tidak ada toko yang terhubung.</p>
      ) : (
        <ShopsTable shops={shops} />
      )}
    </div>
  );
}