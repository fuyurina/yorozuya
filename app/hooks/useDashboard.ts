import { useEffect, useState } from 'react';
import { supabase } from "@/lib/supabase"
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { toast } from "sonner"
import { useSSE } from '@/app/hooks/useSSE';


export type OrderItem = {
  [key: string]: any;
}

export type DashboardSummary = {
  pesananPerToko: Record<string, number>;
  omsetPerToko: Record<string, number>;
  totalOrders: number;
  totalOmset: number;
  totalIklan: number;
  iklanPerToko: { [key: string]: number }
}

export type DashboardData = {
  summary: DashboardSummary;
  orders: OrderItem[];
}
const trackedStatuses = ['READY_TO_SHIP', 'PROCESSED', 'TO_RETURN', 'IN_CANCEL', 'CANCELLED', 'SHIPPED'];
const timeZone = 'Asia/Jakarta';

const status_yang_dihitung = ['IN_CANCEL', 'PROCESSED', 'READY_TO_SHIP', 'SHIPPED'];

const processOrder = (order: OrderItem, summary: DashboardSummary) => {
  const payDate = toZonedTime(new Date(order.pay_time * 1000), timeZone);
  const orderDate = format(payDate, 'yyyy-MM-dd');
  const today = format(toZonedTime(new Date(), timeZone), 'yyyy-MM-dd');

  if (orderDate === today && status_yang_dihitung.includes(order.order_status)) {
    summary.totalOrders++;
    summary.totalOmset += order.total_amount;

    const toko = order.shop_name || 'Tidak diketahui';
    summary.pesananPerToko[toko] = (summary.pesananPerToko[toko] || 0) + 1;
    summary.omsetPerToko[toko] = (summary.omsetPerToko[toko] || 0) + order.total_amount;
  }
};

async function getOrderDetails(order_sn: string, shop_id: string, retries = 3): Promise<any | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { data, error } = await supabase.rpc('get_sku_qty_and_total_price', { 
        order_sn_input: order_sn,
        shop_id_input: shop_id
      });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return null;
      }
      
      return data[0];
    } catch (error) {
      if (attempt === retries - 1) {
        return null;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  return null;
}

const fetchAdsData = async () => {
  try {
    const response = await fetch(`/api/ads?_timestamp=${Date.now()}`);
    if (!response.ok) {
      throw new Error('Gagal mengambil data iklan');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error saat mengambil data iklan:', error);
    return null;
  }
};




export const useDashboard = () => {
  const { data: sseData, error: sseError } = useSSE('http://localhost:10000/api/webhook');
  
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    summary: {
      pesananPerToko: {},
      omsetPerToko: {},
      totalOrders: 0,
      totalOmset: 0,
      totalIklan: 0,
      iklanPerToko: {}
    },
    orders: []
  }); 

  // Hanya handle new_message untuk chat
  useEffect(() => {
    if (sseData && sseData.type === 'new_message') {
      // Play notification sound
      const audio = new Audio('/notif1.mp3');
      audio.play().catch(console.error);
      
      // Show toast notification
      toast.message('Pesan Baru!', {
        description: `${sseData.sender_name}: ${sseData.content}`,
        action: {
          label: "Lihat",
          onClick: () => window.open('/chat', '_blank')
        }
      });
    }
  }, [sseData]);

  // ... kode fetch initial data dan subscription lainnya tetap sama ...

  return dashboardData;
};

interface AdData {
  shop_name: string;
  cost: string;
}
