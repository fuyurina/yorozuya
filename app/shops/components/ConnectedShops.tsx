"use client";

import React from 'react';
import { useShops } from '@/app/hooks/useShops';
import { ShopsTable } from '@/app/shops/components/ShopsTable';
import { AddShopButton } from '@/app/shops/components/AddShopButton';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConnectedShops() {
  const { shops, isLoading, error } = useShops();

  return (
    <Card className="w-full max-w-4xl mx-auto m-4 sm:m-2">
      <CardHeader className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0 pb-2">
        <CardTitle className="text-xl sm:text-2xl font-bold">Toko Terhubung</CardTitle>
        <AddShopButton />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm sm:text-base">Error: {error}</div>
        ) : shops.length === 0 ? (
          <p className="text-center text-gray-500 text-sm sm:text-base">Tidak ada toko yang terhubung.</p>
        ) : (
          <div className="overflow-x-auto">
            <ShopsTable shops={shops} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
