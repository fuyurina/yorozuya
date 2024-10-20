'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function AddShopButton() {
  const { toast } = useToast();

  const handleAddShop = async () => {
    try {
      const response = await fetch('/api/generate-auth-url');
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Gagal menghasilkan URL otorisasi:', error);
      toast({
        variant: "destructive",
        title: "Terjadi kesalahan",
        description: error instanceof Error ? error.message : "Terjadi kesalahan yang tidak diketahui saat mencoba menambahkan toko",
      });
    }
  };

  return (
    <Button onClick={handleAddShop} variant="outline" size="sm">
      <PlusCircle className="mr-2 h-4 w-4" />
      Tambah Toko Baru
    </Button>
  );
}
