import { supabase } from '@/lib/supabase';
import { SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY, shopeeApi } from '@/lib/shopeeConfig';
import { getValidAccessToken } from './tokenManager';




export async function getShopInfo(shopId: number): Promise<any> {
    try {
        if (!shopId) {
            throw new Error('ID Toko diperlukan');
        }

        const { data, error } = await supabase
            .from('shopee_tokens')
            .select('*')
            .eq('shop_id', shopId)
            .single();

        if (error) {
            console.error('Gagal mengambil informasi toko:', error);
            throw error;
        }

        if (!data) {
            throw new Error('Toko tidak ditemukan');
        }

        return data;
    } catch (error) {
        console.error('Gagal mendapatkan informasi toko:', error);
        throw new Error('Gagal mengambil informasi toko dari database');
    }
}

export async function getAllShops(): Promise<any[]> {
    try {
        const { data, error } = await supabase
                .from('shopee_tokens')
                .select('*')
                .eq('is_active', true);

            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error("Gagal mengambil daftar toko aktif dari database");
            }
            return data;
        } catch (error) {
            console.error('Gagal mengambil daftar toko:', error);
            throw new Error('Gagal mengambil daftar toko aktif dari database');
        }
    }

export async function getRefreshCount(shopId: number): Promise<number> {
    try {
        const shopInfo = await getShopInfo(shopId);
            return shopInfo?.refresh_count || 0;
        } catch (error) {
            console.error('Gagal mendapatkan jumlah refresh:', error);
            return 0;
        }
    }

export async function getTrackingNumber(
    shopId: number, 
    orderSn: string, 
    packageNumber?: string, 
    
): Promise<any> {
  const accessToken = await getValidAccessToken(shopId);
  return shopeeApi.getTrackingNumber(shopId, orderSn, accessToken);
}

export async function getReadyToShipOrders(shopId: number, accessToken: string, pageSize: number = 20, cursor: string = ""): Promise<any> {
    return shopeeApi.getReadyToShipOrders(shopId, accessToken, pageSize, cursor);
}

export async function processReadyToShipOrders(shopId: number, orderSn: string, shippingMethod: string = 'dropoff'): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(shopId);
    
    const shippingParams = await shopeeApi.getShippingParameter(shopId, orderSn, accessToken);
    
    if (shippingParams.error) {
      console.error(`Error saat mendapatkan parameter pengiriman: ${JSON.stringify(shippingParams)}`);
      return shippingParams;
    }
    
    let shipResult;
    if (shippingMethod === 'pickup') {
      if (shippingParams.response.pickup) {
        shipResult = await shopeeApi.shipOrder(shopId, orderSn, accessToken, shippingParams.response.pickup);
      } else {
        return {
          success: false,
          error: "pickup_not_available",
          message: `Metode pickup tidak tersedia untuk pesanan ${orderSn}`,
          request_id: shippingParams.request_id || ''
        };
      }
    } else if (shippingMethod === 'dropoff') {
      if (shippingParams.response.dropoff) {
        shipResult = await shopeeApi.shipOrder(shopId, orderSn, accessToken, null, shippingParams.response.dropoff);
      } else {
        return {
          success: false,
          error: "dropoff_not_available",
          message: `Metode dropoff tidak tersedia untuk pesanan ${orderSn}`,
          request_id: shippingParams.request_id || ''
        };
      }
    } else {
      return {
        success: false,
        error: "invalid_shipping_method",
        message: `Metode pengiriman ${shippingMethod} tidak valid untuk pesanan ${orderSn}`,
        request_id: ''
      };
    }
    
    if (shipResult.success) {
      console.info(`Pesanan ${orderSn} berhasil dikirim : ${JSON.stringify(shipResult)}`);
    } else {
      console.error(`Terjadi kesalahan saat mengirim pesanan ${orderSn}: ${JSON.stringify(shipResult)}`);
    }
    
    return shipResult;
  } catch (error) {
    console.error(`Terjadi kesalahan internal saat memproses pesanan: ${error}`);
    return {
      success: false,
      error: "internal_server_error",
      message: `Terjadi kesalahan internal: ${error}`,
      request_id: ''
    };
  }
}

export async function getAdsDailyPerformance(shopId: number, startDate: string, endDate: string): Promise<any> {
    try {
        const accessToken = await getValidAccessToken(shopId);
            const response = await shopeeApi.getAdsDailyPerformance(shopId, accessToken, startDate, endDate);
            
            if (response.error) {
                console.error(`Error saat mendapatkan data performa iklan harian: ${JSON.stringify(response)}`);
                return response;
            }
            
            return response.response;
        } catch (error) {
            console.error(`Terjadi kesalahan saat mengambil data performa iklan harian: ${error}`);
            return {
                error: "internal_server_error",
                message: `Terjadi kesalahan internal: ${error}`,
                request_id: ''
            };
        }
}

export async function createShippingDocument(
  shopId: number,
  orderList: Array<{
    order_sn: string,
    package_number?: string,
    tracking_number?: string
  }>,
  documentType: string = 'THERMAL_AIR_WAYBILL'
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(shopId);
    const result = await shopeeApi.createShippingDocument(shopId, accessToken, orderList, documentType);
    
    if (result.error) {
      console.error(`Error saat membuat dokumen pengiriman: ${JSON.stringify(result)}`);
      return result;
    }
    
    return result;
  } catch (error) {
    console.error(`Terjadi kesalahan saat membuat dokumen pengiriman: ${error}`);
    return {
      error: "internal_server_error",
      message: `Terjadi kesalahan internal: ${error}`,
      request_id: ''
    };
  }
}

export async function getOrderDetail(shopId: number, orderSn: string): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(shopId);
    const result = await shopeeApi.getOrderDetail(shopId, orderSn, accessToken);
    
    if (result.error && result.error !== "") {
      console.error(`Error saat mengambil detail pesanan: ${JSON.stringify(result)}`);
      return result;
    }
    
    console.info(`Detail pesanan berhasil diambil untuk pesanan ${orderSn}`);
    return result.response;
  } catch (error) {
    console.error(`Terjadi kesalahan saat mengambil detail pesanan: ${error}`);
    return {
      error: "internal_server_error",
      message: `Terjadi kesalahan internal: ${error}`,
      request_id: ''
    };
  }
}

export function generateAuthUrl(): string {
  try {
    const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/callback`;
    const authUrl = shopeeApi.generateAuthUrl(redirectUrl);
    console.info(`URL otentikasi berhasil dibuat: ${authUrl}`);
    return authUrl;
  } catch (error) {
    console.error('Terjadi kesalahan saat membuat URL otentikasi:', error);
    throw new Error('Gagal membuat URL otentikasi');
  }
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

export async function downloadShippingDocument(
  shopId: number,
  orderList: Array<{
    order_sn: string,
    package_number?: string,
    shipping_document_type: string
  }>
): Promise<Buffer | any> {
  return retryOperation(async () => {
    const accessToken = await getValidAccessToken(shopId);
    
    console.log('Download request:', {
      shopId,
      orderList,
      accessToken: accessToken ? 'exists' : 'missing'
    });

    if (!shopId || !orderList || orderList.length === 0) {
      console.error('Invalid parameters');
      return {
        error: "invalid_parameters",
        message: "Parameter shopId dan orderList harus diisi"
      };
    }

    const formattedOrderList = orderList.map(order => {
      const formattedOrder: {
        order_sn: string,
        package_number?: string,
        shipping_document_type: string
      } = {
        order_sn: order.order_sn,
        shipping_document_type: order.shipping_document_type || "THERMAL_AIR_WAYBILL"
      };

      if (order.package_number && order.package_number.trim() !== '') {
        formattedOrder.package_number = order.package_number;
      }

      return formattedOrder;
    });

    const response = await shopeeApi.downloadShippingDocument(
      shopId, 
      accessToken, 
      formattedOrderList
    );

    console.log('Shopee API Response:', {
      isBuffer: response instanceof Buffer,
      responseType: typeof response,
      error: response.error,
      message: response.message
    });
    
    if (response instanceof Buffer) {
      return response;
    }

    if (response.error) {
      console.error('Shopee API Error:', response);
      return {
        error: response.error,
        message: response.message || "Gagal mengunduh dokumen dari Shopee API"
      };
    }

    console.error('Unexpected response format:', response);
    return {
      error: "invalid_response",
      message: "Response tidak valid dari Shopee API"
    };
  });
}

interface OrderListOptions {
  timeRangeField?: 'create_time' | 'update_time';
  startTime?: number;
  endTime?: number;
  orderStatus?: 'UNPAID' | 'READY_TO_SHIP' | 'PROCESSED' | 'SHIPPED' | 'COMPLETED' | 'IN_CANCEL' | 'CANCELLED' | 'ALL';
  pageSize?: number;
  cursor?: string;
}

export async function getOrderList(shopId: number, options: OrderListOptions = {}) {
  try {
    console.log(shopId)
    const accessToken = await getValidAccessToken(shopId);
    console.log(accessToken)
    const response = await shopeeApi.getOrderList(shopId, accessToken, {
      time_range_field: options.timeRangeField || 'update_time',
      time_from: options.startTime || Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), // Default to 7 days ago
      time_to: options.endTime || Math.floor(Date.now() / 1000), // Default to current time
      page_size: options.pageSize || 50,
      cursor: options.cursor || '',
      order_status: options.orderStatus || 'ALL'
    });

    if (response.error) {
      throw new Error(response.message || 'Gagal mengambil daftar pesanan');
    }

    return {
      success: true,
      data: response.response,
      request_id: response.request_id
    };

  } catch (error: unknown) {
    console.error('Gagal mengambil daftar pesanan:', error);
    return {
      success: false,
      error: "fetch_failed",
      message: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
    };
  }
}

export async function handleBuyerCancellation(
  shopId: number,
  orderSn: string,
  operation: 'ACCEPT' | 'REJECT'
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(shopId);
    
    console.info(`Memproses pembatalan pembeli untuk pesanan ${orderSn} dengan operasi ${operation}`);
    
    const result = await shopeeApi.handleBuyerCancellation(
      shopId,
      accessToken,
      orderSn,
      operation
    );

    if (result.error) {
      console.error(`Error saat memproses pembatalan pembeli: ${JSON.stringify(result)}`);
      return {
        success: false,
        error: result.error,
        message: result.message || 'Gagal memproses pembatalan pembeli',
        request_id: result.request_id || ''
      };
    }

    console.info(`Berhasil memproses pembatalan pembeli untuk pesanan ${orderSn}`);
    return {
      success: true,
      data: result.response,
      request_id: result.request_id
    };

  } catch (error) {
    console.error(`Terjadi kesalahan saat memproses pembatalan pembeli: ${error}`);
    return {
      success: false,
      error: "internal_server_error",
      message: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui',
      request_id: ''
    };
  }
}

export async function readConversation(
  shopId: number, 
  conversationId: number, 
  lastReadMessageId: string
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(shopId);
    
    console.info(`Menandai percakapan ${conversationId} sebagai telah dibaca`);
    
    const result = await shopeeApi.readConversation(
      shopId,
      accessToken,
      conversationId,
      lastReadMessageId
    );

    if (result.error) {
      console.error(`Error saat menandai percakapan sebagai dibaca: ${JSON.stringify(result)}`);
      return {
        success: false,
        error: result.error,
        message: result.message || 'Gagal menandai percakapan sebagai dibaca',
        request_id: result.request_id || ''
      };
    }

    console.info(`Berhasil menandai percakapan ${conversationId} sebagai dibaca`);
    return {
      success: true,
      data: result.response,
      request_id: result.request_id
    };

  } catch (error) {
    console.error(`Terjadi kesalahan saat menandai percakapan sebagai dibaca: ${error}`);
    return {
      success: false,
      error: "internal_server_error",
      message: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui',
      request_id: ''
    };
  }
}
