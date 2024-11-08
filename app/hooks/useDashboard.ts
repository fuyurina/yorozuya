import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { RealtimeChannel } from '@supabase/supabase-js';

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

  const createOrderSubscription = () => {
    return supabase
      .channel('orders')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `order_status=in.(${trackedStatuses.join(',')})`
      }, async (payload) => {
        const newOrder = payload.new as OrderItem;
        
        setDashboardData(prevData => {
          const existingOrderIndex = prevData.orders.findIndex(order => order.order_sn === newOrder.order_sn);
          
          if (existingOrderIndex !== -1) {
            const updatedOrders = [...prevData.orders];
            updatedOrders[existingOrderIndex] = {
              ...updatedOrders[existingOrderIndex],
              order_status: newOrder.order_status,
              shipping_carrier: newOrder.shipping_carrier
            };
            
            // Hitung summary baru
            const newSummary = {
              pesananPerToko: {},
              omsetPerToko: {},
              totalOrders: 0,
              totalOmset: 0,
              totalIklan: prevData.summary.totalIklan,
              iklanPerToko: prevData.summary.iklanPerToko
            };
            updatedOrders.forEach(order => processOrder(order, newSummary));

            // Periksa apakah total order atau total omset berubah
            if (newSummary.totalOrders !== prevData.summary.totalOrders ||
                newSummary.totalOmset !== prevData.summary.totalOmset) {
              // Jika berubah, perbarui keduanya
              return {
                summary: newSummary,
                orders: updatedOrders
              };
            } else {
              // Jika tidak berubah, hanya perbarui orders
              return {
                ...prevData,
                orders: updatedOrders
              };
            }
          } else {
            return prevData;
          }
        });
      });
  };

  const createLogisticSubscription = () => {
    return supabase
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
      );
  };

  const setupReconnection = (initialChannels: { 
    orderChannel: RealtimeChannel, 
    logisticChannel: RealtimeChannel 
  }) => {
    let currentChannels = initialChannels;
    let isReconnecting = false;

    const checkConnection = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && !isReconnecting) {
        isReconnecting = true;
        console.log('Koneksi terputus, mencoba menghubungkan kembali...');
        
        try {
          // Unsubscribe dari semua channel
          await currentChannels.orderChannel.unsubscribe();
          await currentChannels.logisticChannel.unsubscribe();
          console.log('Berhasil unsubscribe dari semua channel');
          
          // Buat channel baru
          const newOrderChannel = createOrderSubscription();
          const newLogisticChannel = createLogisticSubscription();
          
          // Subscribe ke channel baru
          await newOrderChannel.subscribe();
          await newLogisticChannel.subscribe();
          
          // Update referensi channel
          currentChannels = {
            orderChannel: newOrderChannel,
            logisticChannel: newLogisticChannel
          };
          
          console.log('Berhasil subscribe dengan channel baru');
        } catch (error) {
          console.error('Gagal melakukan reconnect:', error);
        } finally {
          isReconnecting = false;
        }
      }
    };

    const intervalId = setInterval(checkConnection, 30000);

    return () => {
      clearInterval(intervalId);
      currentChannels.orderChannel.unsubscribe();
      currentChannels.logisticChannel.unsubscribe();
    };
  };

  const setupVisibilityHandler = (channels: { 
    orderChannel: RealtimeChannel, 
    logisticChannel: RealtimeChannel 
  }) => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab aktif kembali, memeriksa koneksi...');
        try {
          // Periksa status koneksi channel terlebih dahulu
          const orderStatus = channels.orderChannel.state;
          const logisticStatus = channels.logisticChannel.state;
          
          // Hanya reconnect jika status bukan 'joined'
          if (orderStatus !== 'joined' || logisticStatus !== 'joined') {
            console.log('Memulai ulang koneksi realtime...');
            
            // Unsubscribe dari channel yang ada
            await channels.orderChannel.unsubscribe();
            await channels.logisticChannel.unsubscribe();
            
            // Buat dan subscribe ke channel baru
            const newOrderChannel = createOrderSubscription();
            const newLogisticChannel = createLogisticSubscription();
            
            await newOrderChannel.subscribe();
            await newLogisticChannel.subscribe();
            
            // Update referensi channel
            channels.orderChannel = newOrderChannel;
            channels.logisticChannel = newLogisticChannel;
            
            console.log('Koneksi realtime berhasil dipulihkan');
          } else {
            console.log('Koneksi masih aktif, tidak perlu reconnect');
          }
        } catch (error) {
          console.error('Gagal memulihkan koneksi:', error);
        }
      } else {
        console.log('Tab tidak aktif, tetap mempertahankan koneksi');
      }
    };

    // Tambahkan event listener untuk visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

      const processOrders = async () => {
        for (const order of orders) {
          if (
            order.order_status === 'PROCESSED' && 
            order.document_status !== 'READY' ||
            order.status === 'PROCESSED' &&
            order.tracking_number === null
          ) {
            console.log('Mencoba membuat shipping document untuk:', {
              order_sn: order.order_sn,
              shop_id: order.shop_id,
              status: order.order_status,
              document: order.document_status
            });
            
            try {
              // Cek tracking number terlebih dahulu
              if (!order.tracking_number) {
                const trackingResponse = await fetch(`/api/shipping-document/create_document?get_tracking=true`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    shopId: order.shop_id,
                    order_sn: order.order_sn
                  })
                });

                if (!trackingResponse.ok) {
                  throw new Error(`HTTP error! status: ${trackingResponse.status}`);
                }

                const trackingData = await trackingResponse.json();
                if (trackingData.success) {
                  order.tracking_number = trackingData.data.tracking_number;
                  
                  // Perbarui state dengan tracking number baru
                  setDashboardData(prevData => ({
                    ...prevData,
                    orders: prevData.orders.map(existingOrder => 
                      existingOrder.order_sn === order.order_sn 
                        ? { ...existingOrder, tracking_number: trackingData.data.tracking_number }
                        : existingOrder
                    )
                  }));
                }
              }

              // Buat shipping document dengan tracking number yang sudah ada
              const response = await fetch('/api/shipping-document/create_document', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  shopId: order.shop_id,
                  order_sn: order.order_sn,
                  tracking_number: order.tracking_number
                })
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                console.error('Gagal membuat shipping document:', errorData);
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
              }

              // Tambahkan pembaruan state setelah dokumen berhasil dibuat
              const documentData = await response.json();
              if (documentData.success) {
                setDashboardData(prevData => ({
                  ...prevData,
                  orders: prevData.orders.map(existingOrder => 
                    existingOrder.order_sn === order.order_sn 
                      ? { ...existingOrder, document_status: 'READY' }
                      : existingOrder
                  )
                }));
              }
            } catch (error) {
              console.error('Error untuk order:', order.order_sn, error);
            }
          }
        }
      };

      await processOrders();

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

    // Buat subscription awal
    const channels = {
      orderChannel: createOrderSubscription(),
      logisticChannel: createLogisticSubscription()
    };

    // Subscribe ke channel
    channels.orderChannel.subscribe((status) => {
      console.log(`Status koneksi orders: ${status}`);
      if (status === 'SUBSCRIBED') {
        console.log('Berhasil berlangganan ke perubahan orders');
      }
    });

    channels.logisticChannel.subscribe((status) => {
      console.log(`Status koneksi logistic: ${status}`);
      if (status === 'SUBSCRIBED') {
        console.log('Berhasil berlangganan ke perubahan logistic');
      }
    });

    // Setup reconnection dan visibility handler
    const cleanupReconnection = setupReconnection(channels);
    const cleanupVisibility = setupVisibilityHandler(channels);

    // Tambahkan ping interval untuk menjaga koneksi tetap aktif
    const pingInterval = setInterval(() => {
      channels.orderChannel.send({
        type: 'broadcast',
        event: 'ping',
        payload: {}
      });
      channels.logisticChannel.send({
        type: 'broadcast',
        event: 'ping',
        payload: {}
      });
    }, 30000);

    return () => {
      cleanupReconnection();
      cleanupVisibility();
      clearInterval(pingInterval);
      channels.orderChannel.unsubscribe();
      channels.logisticChannel.unsubscribe();
    };
  }, []);

  return dashboardData;
};

interface AdData {
  shop_name: string;
  cost: string;
}
