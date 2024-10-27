import { supabase } from '@/lib/supabase';
import { SHOPEE_PARTNER_ID,SHOPEE_PARTNER_KEY, shopeeApi } from '@/lib/shopeeConfig';
import { getValidAccessToken } from './tokenManager';


export async function getShopInfo(shopId: number): Promise<any> {
    const { data, error } = await supabase
        .from('shopee_tokens')
        .select('*')
        .eq('shop_id', shopId)
        .single();

    if (error) throw error;
    return data;
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

export async function getTrackingNumber(shopId: number, orderSn: string, packageNumber: string, accessToken: string): Promise<any> {
    return shopeeApi.getTrackingNumber(shopId, orderSn, packageNumber, accessToken);
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
    
    console.info(`Dokumen pengiriman berhasil dibuat untuk pesanan: ${JSON.stringify(result.response)}`);
    console.info(`Response dokumen: ${result}`);
    return result.response;
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
