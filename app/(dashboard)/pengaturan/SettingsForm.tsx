'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react" // Pastikan lucide-react sudah terinstall
import { toast } from "@/components/ui/use-toast";

// Tambahkan tipe data untuk memperjelas struktur
interface AutoShipData {
  shop_id: string;
  shop_name: string;  // Tambahkan shop_name
  status_chat: boolean;
  status_ship: boolean;
}

interface Settings {
  openai_api: string | null;
  openai_model: string | null;
  openai_temperature: number | null;
  openai_prompt: string | null;
  auto_ship: boolean;
  auto_ship_interval: number;
}

export function SettingsForm({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [alert, setAlert] = useState<{
    type: 'success' | 'error',
    message: string
  } | null>(null)
  
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      // Simpan pengaturan umum
      const settingsResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openai_api: data.openai_api,
          openai_model: data.openai_model,
          openai_temperature: data.openai_temperature,
          openai_prompt: data.openai_prompt,
          auto_ship: data.auto_ship === 'on',
          auto_ship_interval: Number(data.auto_ship_interval)
        }),
      });

      // Parse blocked_shop_id_list dengan aman
      let blockedShops: number[] = [];
      try {
        blockedShops = JSON.parse(data.blocked_shop_id_list as string || '[]');
      } catch (e) {
        console.error('Error parsing blocked_shop_id_list:', e);
      }

      // Simpan konfigurasi push
      const pushConfigResponse = await fetch('/api/push-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callback_url: data.callback_url,
          blocked_shop_id_list: blockedShops // Gunakan array yang sudah di-parse
        }),
      });

      if (!settingsResponse.ok || !pushConfigResponse.ok) {
        throw new Error('Gagal menyimpan pengaturan');
      }

      toast({
        title: "Berhasil",
        description: "Pengaturan berhasil disimpan",
      });

      router.refresh();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Gagal",
        description: "Gagal menyimpan pengaturan",
        variant: "destructive",
      });
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {(alert || isLoading) && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center backdrop-blur-[2px] z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium">Sedang menyimpan...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {alert?.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm font-medium">
                  {alert?.message}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      {children}
    </form>
  )
}
