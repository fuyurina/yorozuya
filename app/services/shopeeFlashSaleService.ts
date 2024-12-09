import { supabase } from '@/lib/supabase';
import { shopeeApi } from '@/lib/shopeeConfig';
import { getValidAccessToken } from './tokenManager';

export async function getFlashSaleTimeSlotId(
  shopId: number,
  startTime: number,
  endTime: number
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(shopId);
    const response = await shopeeApi.getFlashSaleTimeSlotId(shopId, accessToken, {
      start_time: startTime,
      end_time: endTime
    });

    if (response.error) {
      return {
        success: false,
        error: response.error,
        message: response.message || 'Gagal mendapatkan time slot ID'
      };
    }

    return {
      success: true,
      data: response.response,
      request_id: response.request_id
    };
  } catch (error) {
    console.error('Kesalahan saat mendapatkan time slot ID:', error);
    return {
      success: false,
      error: "internal_server_error",
      message: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
    };
  }
}

export async function createShopFlashSale(
  shopId: number,
  data: {
    time_slot_id: number,
    item_list: Array<{
      item_id: number,
      model_list: Array<{
        model_id: number,
        promotion_price: number,
        stock: number
      }>
    }>
  }
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(shopId);
    const response = await shopeeApi.createShopFlashSale(shopId, accessToken, data);

    if (response.error) {
      return {
        success: false,
        error: response.error,
        message: response.message || 'Gagal membuat flash sale'
      };
    }

    return {
      success: true,
      data: response.response,
      request_id: response.request_id
    };
  } catch (error) {
    console.error('Kesalahan saat membuat flash sale:', error);
    return {
      success: false,
      error: "internal_server_error",
      message: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
    };
  }
}

export async function getFlashSaleItemCriteria(
  shopId: number,
  itemIdList: number[]
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(shopId);
    const response = await shopeeApi.getFlashSaleItemCriteria(shopId, accessToken, itemIdList);

    if (response.error) {
      return {
        success: false,
        error: response.error,
        message: response.message || 'Gagal mendapatkan kriteria item'
      };
    }

    return {
      success: true,
      data: response.response,
      request_id: response.request_id
    };
  } catch (error) {
    console.error('Kesalahan saat mendapatkan kriteria item:', error);
    return {
      success: false,
      error: "internal_server_error",
      message: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
    };
  }
}

export async function addShopFlashSaleItems(
  shopId: number,
  data: {
    time_slot_id: number,
    item_list: Array<{
      item_id: number,
      model_list: Array<{
        model_id: number,
        promotion_price: number,
        stock: number
      }>
    }>
  }
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(shopId);
    const response = await shopeeApi.addShopFlashSaleItems(shopId, accessToken, data);

    if (response.error) {
      return {
        success: false,
        error: response.error,
        message: response.message || 'Gagal menambahkan item flash sale'
      };
    }

    return {
      success: true,
      data: response.response,
      request_id: response.request_id
    };
  } catch (error) {
    console.error('Kesalahan saat menambahkan item flash sale:', error);
    return {
      success: false,
      error: "internal_server_error",
      message: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
    };
  }
}

export async function getShopFlashSaleList(
  shopId: number,
  options: {
    type: number,
    start_time?: number,
    end_time?: number,
    pagination_offset: number,
    pagination_entry_count: number
  }
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(shopId);
    const response = await shopeeApi.getShopFlashSaleList(shopId, accessToken, {
      type: options.type,
      start_time: options.start_time,
      end_time: options.end_time,
      pagination_offset: options.pagination_offset,
      pagination_entry_count: options.pagination_entry_count
    });

    if (response.error) {
      return {
        success: false,
        error: response.error,
        message: response.message || 'Gagal mendapatkan daftar flash sale'
      };
    }

    return {
      success: true,
      data: response.response,
      request_id: response.request_id
    };
  } catch (error) {
    console.error('Kesalahan saat mendapatkan daftar flash sale:', error);
    return {
      success: false,
      error: "internal_server_error",
      message: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
    };
  }
}

export async function getShopFlashSale(
  shopId: number,
  flashSaleId: number
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(shopId);
    const response = await shopeeApi.getShopFlashSale(shopId, accessToken, flashSaleId);

    if (response.error) {
      return {
        success: false,
        error: response.error,
        message: response.message || 'Gagal mendapatkan detail flash sale'
      };
    }

    return {
      success: true,
      data: response.response,
      request_id: response.request_id
    };
  } catch (error) {
    console.error('Kesalahan saat mendapatkan detail flash sale:', error);
    return {
      success: false,
      error: "internal_server_error",
      message: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
    };
  }
}

export async function updateShopFlashSale(
  shopId: number,
  data: {
    flash_sale_id: number,
    status: 1 | 2
  }
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(shopId);
    const response = await shopeeApi.updateShopFlashSale(shopId, accessToken, data);

    if (response.error) {
      return {
        success: false,
        error: response.error,
        message: response.message || 'Gagal mengupdate flash sale'
      };
    }

    return {
      success: true,
      data: response.response,
      request_id: response.request_id
    };
  } catch (error) {
    console.error('Kesalahan saat mengupdate flash sale:', error);
    return {
      success: false,
      error: "internal_server_error",
      message: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
    };
  }
}

export async function updateShopFlashSaleItems(
  shopId: number,
  data: {
    flash_sale_id: number,
    item_list: Array<{
      item_id: number,
      model_list: Array<{
        model_id: number,
        promotion_price: number,
        stock: number
      }>
    }>
  }
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(shopId);
    const response = await shopeeApi.updateShopFlashSaleItems(shopId, accessToken, data);

    if (response.error) {
      return {
        success: false,
        error: response.error,
        message: response.message || 'Gagal mengupdate item flash sale'
      };
    }

    return {
      success: true,
      data: response.response,
      request_id: response.request_id
    };
  } catch (error) {
    console.error('Kesalahan saat mengupdate item flash sale:', error);
    return {
      success: false,
      error: "internal_server_error",
      message: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
    };
  }
}

export async function deleteShopFlashSale(
  shopId: number,
  flashSaleId: number
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(shopId);
    const response = await shopeeApi.deleteShopFlashSale(shopId, accessToken, flashSaleId);

    if (response.error) {
      return {
        success: false,
        error: response.error,
        message: response.message || 'Gagal menghapus flash sale'
      };
    }

    return {
      success: true,
      data: response.response,
      request_id: response.request_id
    };
  } catch (error) {
    console.error('Kesalahan saat menghapus flash sale:', error);
    return {
      success: false,
      error: "internal_server_error",
      message: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
    };
  }
}

export async function deleteShopFlashSaleItems(
  shopId: number,
  data: {
    flash_sale_id: number,
    item_ids: number[]
  }
): Promise<any> {
  try {
    const accessToken = await getValidAccessToken(shopId);
    const response = await shopeeApi.deleteShopFlashSaleItems(shopId, accessToken, data);

    if (response.error) {
      return {
        success: false,
        error: response.error,
        message: response.message || 'Gagal menghapus item flash sale'
      };
    }

    return {
      success: true,
      data: response.response,
      request_id: response.request_id
    };
  } catch (error) {
    console.error('Kesalahan saat menghapus item flash sale:', error);
    return {
      success: false,
      error: "internal_server_error",
      message: error instanceof Error ? error.message : 'Terjadi kesalahan yang tidak diketahui'
    };
  }
} 