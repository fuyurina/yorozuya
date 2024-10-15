'use client';

import React from 'react';

export function AddShopButton() {
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
      if (error instanceof Error) {
        alert(`Terjadi kesalahan saat mencoba menambahkan toko: ${error.message}`);
      } else {
        alert('Terjadi kesalahan yang tidak diketahui saat mencoba menambahkan toko');
      }
    }
  };

  return (
    <button
      onClick={handleAddShop}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      Tambah Toko Baru
    </button>
  );
}