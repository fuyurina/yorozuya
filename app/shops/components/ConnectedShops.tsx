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
    <Card className="w-full max-w-4xl mx-auto my-2 sm:my-4 px-2 sm:px-4">
      <CardHeader className="flex flex-col items-center justify-between space-y-2 sm:space-y-0 sm:flex-row pb-2">
        <CardTitle className="text-lg sm:text-2xl font-bold">Toko Terhubung</CardTitle>
        <AddShopButton />
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm p-4">Error: {error}</div>
        ) : shops.length === 0 ? (
          <p className="text-center text-gray-500 text-sm p-4">Tidak ada toko yang terhubung.</p>
        ) : (
          <div className="overflow-x-auto w-full">
            <ShopsTable shops={shops} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
