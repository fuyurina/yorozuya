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
      const { data: orders, error } = await supabase
        .from('dashboard_view')
        .select('*');

      if (error) {
        throw new Error('Gagal mengambil data dari dashboard_view');
      }

      const summary: DashboardSummary = {
        pesananPerToko: {},
        omsetPerToko: {},
        totalOrders: 0,
        totalOmset: 0,
        totalIklan: 0,
        iklanPerToko: {}
      };

      orders.forEach(order => processOrder(order, summary));

      setDashboardData({ summary, orders });

      const adsData = await fetchAdsData();
      if (adsData) {
        setDashboardData(prevData => {
          const newSummary = { ...prevData.summary };
          newSummary.totalIklan = parseFloat(adsData.total_cost.replace('Rp. ', '').replace('.', '').replace(',', '.'));
          newSummary.iklanPerToko = {};
          adsData.ads_data.forEach((ad: AdData) => {
            newSummary.iklanPerToko[ad.shop_name] = parseFloat(ad.cost.replace('Rp. ', '').replace('.', '').replace(',', '.'));
          });
          return {
            ...prevData,
            summary: newSummary
          };
        });
      }
    };

    fetchInitialData();

    const subscription = supabase
      .channel('orders')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `order_status=in.(${trackedStatuses.join(',')})`
      }, async (payload) => {
        const newOrder = payload.new as OrderItem;
        
        if (newOrder.order_status === 'READY_TO_SHIP') {
          setDashboardData(prevData => {
            const newSummary = { ...prevData.summary };
            processOrder(newOrder, newSummary);

            return {
              summary: newSummary,
              orders: [newOrder, ...prevData.orders]
            };
          });

          try {
            const orderDetails = await getOrderDetails(newOrder.order_sn, newOrder.shop_id);
            
            if (orderDetails) {
              setDashboardData(prevData => {
                const updatedOrders = prevData.orders.map(order => 
                  order.order_sn === newOrder.order_sn 
                    ? { ...order, ...orderDetails, total_amount: orderDetails.total_price ?? order.total_amount }
                    : order
                );

                const newSummary = { ...prevData.summary };
                newSummary.pesananPerToko = {};
                newSummary.omsetPerToko = {};
                newSummary.totalOrders = 0;
                newSummary.totalOmset = 0;
                updatedOrders.forEach(order => processOrder(order, newSummary));

                // Tambahkan log di sini
                console.log('Order baru:', newOrder);
                console.log('Orders yang diperbarui:', updatedOrders);

                return {
                  summary: newSummary,
                  orders: updatedOrders
                };
              });
            }
          } catch (error) {
            // Error handling bisa ditambahkan di sini jika diperlukan
          }
        } else {
          setDashboardData(prevData => {
            const existingOrderIndex = prevData.orders.findIndex(order => order.order_sn === newOrder.order_sn);
            
            if (existingOrderIndex !== -1) {
              const updatedOrders = [...prevData.orders];
              updatedOrders[existingOrderIndex] = {
                ...updatedOrders[existingOrderIndex],
                order_status: newOrder.order_status,
                
                shipping_carrier: newOrder.shipping_carrier
              };
              
              return {
                summary: prevData.summary,
                orders: updatedOrders
              };
            } else {
              return prevData;
            }
          });
        }
      })
      .subscribe();

    const unsubscribeLogistic = setupLogisticSubscription();

    return () => {
      subscription.unsubscribe();
      unsubscribeLogistic();
    };
  }, []);

  return dashboardData;
};

interface AdData {
  shop_name: string;
  cost: string;
}
