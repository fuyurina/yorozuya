import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export type OrderItem = {
  [key: string]: any;
}

export type DashboardSummary = {
  pesananPerToko: Record<string, number>;
  omsetPerToko: Record<string, number>;
  totalOrders: number;
  totalOmset: number;
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
        console.log(`Tidak ada data yang dikembalikan untuk order_sn: ${order_sn}`);
        return null;
      }
      
      return data[0];
    } catch (error) {
      console.error(`Percobaan ${attempt + 1}/${retries} gagal:`, error);
      
      if (attempt === retries - 1) {
        console.error('Semua percobaan gagal untuk memanggil get_sku_qty_and_total_price');
        return null;
      }
      
      // Tunggu sebentar sebelum mencoba lagi
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  return null;
}

export const useDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    summary: {
      pesananPerToko: {},
      omsetPerToko: {},
      totalOrders: 0,
      totalOmset: 0
    },
    orders: []
  }); 

  const setupLogisticSubscription = () => {
    const channel = supabase
      .channel('logistic-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'logistic',
          filter: `logistics_status=eq.LOGISTICS_REQUEST_CREATED`
        },
        (payload) => {
          const logisticData = payload.new;
          
          setDashboardData(prevData => {
            const updatedOrders = prevData.orders.map(order => {
              if (order.order_sn === logisticData.order_sn) {
                // Jika order_sn cocok, perbarui tracking_number
                return {
                  ...order,
                  tracking_number: logisticData.tracking_number
                };
              }
              return order;
            });

            // Jika ada perubahan pada orders, kembalikan data yang diperbarui
            if (JSON.stringify(updatedOrders) !== JSON.stringify(prevData.orders)) {
              return {
                ...prevData,
                orders: updatedOrders
              };
            }

            // Jika tidak ada perubahan, kembalikan data yang sama
            return prevData;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      console.log('Mengambil data dashboard...');
      const { data: orders, error } = await supabase
        .from('dashboard_view')
        .select('*');

      if (error) {
        console.error('Error mengambil data:', error);
        throw new Error('Gagal mengambil data dari dashboard_view');
      }

      console.log('Jumlah pesanan yang diambil:', orders.length);

      const summary: DashboardSummary = {
        pesananPerToko: {},
        omsetPerToko: {},
        totalOrders: 0,
        totalOmset: 0
      };

      orders.forEach(order => processOrder(order, summary));

      setDashboardData({ summary, orders });
    };

    fetchInitialData();

    // Set up realtime subscription
    const subscription = supabase
      .channel('orders')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `order_status=in.(${trackedStatuses.join(',')})`
      }, async (payload) => {
        console.log('Perubahan realtime terdeteksi:', payload);
        const newOrder = payload.new as OrderItem;
        
        if (newOrder.order_status === 'READY_TO_SHIP') {
          console.log('Pesanan baru READY_TO_SHIP terdeteksi:', newOrder.order_sn);
          
          // Langsung tambahkan pesanan ke daftar
          setDashboardData(prevData => {
            const newSummary = { ...prevData.summary };
            processOrder(newOrder, newSummary);
            console.log('Summary diperbarui:', newSummary);

            console.log('Menambahkan pesanan baru ke daftar');
            return {
              summary: newSummary,
              orders: [newOrder, ...prevData.orders]
            };
          });

          // Ambil detail pesanan secara asynchronous
          try {
            const orderDetails = await getOrderDetails(newOrder.order_sn, newOrder.shop_id);
            console.log('Detail pesanan diterima:', orderDetails);
            
            if (orderDetails) {
              // Update pesanan dengan detail yang baru diterima
              setDashboardData(prevData => {
                const updatedOrders = prevData.orders.map(order => 
                  order.order_sn === newOrder.order_sn 
                    ? { ...order, ...orderDetails, total_amount: orderDetails.total_price ?? order.total_amount }
                    : order
                );

                const newSummary = { ...prevData.summary };
                // Proses ulang summary dengan data yang diperbarui
                newSummary.pesananPerToko = {};
                newSummary.omsetPerToko = {};
                newSummary.totalOrders = 0;
                newSummary.totalOmset = 0;
                updatedOrders.forEach(order => processOrder(order, newSummary));

                console.log('Summary diperbarui dengan detail pesanan:', newSummary);

                return {
                  summary: newSummary,
                  orders: updatedOrders
                };
              });
            }
          } catch (error) {
            console.error('Gagal mengambil detail pesanan:', error);
          }
        } else {
          console.log('Pembaruan status pesanan terdeteksi:', newOrder.order_sn, newOrder.order_status);
          setDashboardData(prevData => {
            const existingOrderIndex = prevData.orders.findIndex(order => order.order_sn === newOrder.order_sn);
            
            if (existingOrderIndex !== -1) {
              console.log('Pesanan ditemukan di indeks:', existingOrderIndex);
              const updatedOrders = [...prevData.orders];
              updatedOrders[existingOrderIndex] = {
                ...updatedOrders[existingOrderIndex],
                order_status: newOrder.order_status
              };
              
              console.log('Status pesanan diperbarui');
              return {
                summary: prevData.summary,
                orders: updatedOrders
              };
            } else {
              console.log('Pesanan tidak ditemukan dalam daftar, tidak ada perubahan');
              return prevData;
            }
          });
        }
      })
      .subscribe();

    const unsubscribeLogistic = setupLogisticSubscription();

    // Cleanup subscription on component unmount
    return () => {
      subscription.unsubscribe();
      unsubscribeLogistic();
    };
  }, []);

  return dashboardData;
};
