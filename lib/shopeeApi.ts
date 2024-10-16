import axios from 'axios';
import crypto from 'crypto';

export class ShopeeAPI {
  private partnerId: number;
  private partnerKey: string;

  constructor(partnerId: number, partnerKey: string) {
    
    this.partnerId = partnerId;
    this.partnerKey = partnerKey;
  }

  private _generateSign(path: string, accessToken?: string, shopId?: number): [number, string] {
    const timest = Math.floor(Date.now() / 1000);
    let baseString = `${this.partnerId}${path}${timest}`;
    if (accessToken && shopId) {
      baseString += `${accessToken}${shopId}`;
    }
    const sign = crypto.createHmac('sha256', this.partnerKey).update(baseString).digest('hex');
    return [timest, sign];
  }

  generateAuthUrl(redirectUrl: string): string {
    const [timest, sign] = this._generateSign('/api/v2/shop/auth_partner');
    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      redirect: redirectUrl
    });
    return `https://partner.shopeemobile.com/api/v2/shop/auth_partner?${params.toString()}`;
  }

  async getTokens(code: string, shopId: number): Promise<any> {
    return this._callTokenApi(code, shopId);
  }

  private async _callTokenApi(code: string, shopId: number): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/auth/token/get';
    const path = '/api/v2/auth/token/get';
    const [timest, sign] = this._generateSign(path);

    const body = {
      code,
      shop_id: shopId,
      partner_id: this.partnerId
    };

    const fullUrl = `${url}?partner_id=${this.partnerId}&timestamp=${timest}&sign=${sign}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios.post(fullUrl, body, { headers });
      console.debug('Response from Shopee API:', response.data);

      if (!response.data.access_token || !response.data.refresh_token) {
        throw new Error('Response from Shopee API does not contain access_token or refresh_token');
      }

      return response.data;
    } catch (error) {
      console.error('Error calling Shopee API:', error);
      throw error;
    }
  }

  async refreshAccessToken(refreshToken: string, shopId: number): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/auth/access_token/get';
    const path = '/api/v2/auth/access_token/get';
    const [timest, sign] = this._generateSign(path);

    const body = {
      refresh_token: refreshToken,
      shop_id: shopId,
      partner_id: this.partnerId
    };

    const fullUrl = `${url}?partner_id=${this.partnerId}&timestamp=${timest}&sign=${sign}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios.post(fullUrl, body, { headers });
      return response.data;
    } catch (error) {
      console.error('Shopee API Error:', error);
      throw error;
    }
  }

  async getOrderDetail(shopId: number, orderSn: string, accessToken: string): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/order/get_order_detail';
    const path = '/api/v2/order/get_order_detail';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken,
      order_sn_list: orderSn,
      response_optional_fields: 'buyer_user_id,buyer_username,estimated_shipping_fee,recipient_address,actual_shipping_fee,goods_to_declare,note,note_update_time,item_list,pay_time,dropshipper,dropshipper_phone,split_up,buyer_cancel_reason,cancel_by,cancel_reason,actual_shipping_fee_confirmed,buyer_cpf_id,fulfillment_flag,pickup_done_time,package_list,shipping_carrier,payment_method,total_amount,buyer_username,invoice_data,no_plastic_packing,order_chargeable_weight_gram,edt'
    });

    const fullUrl = `${url}?${params.toString()}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    console.info(`Sending request to Shopee API for order detail: URL=${fullUrl}, Headers=${JSON.stringify(headers)}`);

    try {
      const response = await axios.get(fullUrl, { headers });
      console.info(`Response status code: ${response.status}, Response content: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      console.error('Error getting order detail:', error);
      throw error;
    }
  }

  async getTrackingNumber(shopId: number, orderSn: string, packageNumber: string, accessToken: string): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/logistics/get_tracking_number';
    const path = '/api/v2/logistics/get_tracking_number';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken,
      order_sn: orderSn,
      package_number: packageNumber
    });

    const fullUrl = `${url}?${params.toString()}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    console.info(`Sending request to Shopee API for tracking number: URL=${fullUrl}, Headers=${JSON.stringify(headers)}`);

    try {
      const response = await axios.get(fullUrl, { headers });
      console.info(`Response status code: ${response.status}, Response content: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      console.error('Error getting tracking number:', error);
      throw error;
    }
  }

  async getShopInfo(shopId: number, accessToken: string): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/shop/get_shop_info';
    const path = '/api/v2/shop/get_shop_info';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken,
      entry_list: 'shop_name'
    });

    const fullUrl = `${url}?${params.toString()}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios.get(fullUrl, { headers });
      return response.data;
    } catch (error) {
      console.error('Error getting shop info:', error);
      throw error;
    }
  }

  async getShippingParameter(shopId: number, orderSn: string, accessToken: string): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/logistics/get_shipping_parameter';
    const path = '/api/v2/logistics/get_shipping_parameter';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken,
      order_sn: orderSn
    });

    const fullUrl = `${url}?${params.toString()}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios.get(fullUrl, { headers });
      return response.data;
    } catch (error) {
      console.error('Error getting shipping parameter:', error);
      throw error;
    }
  }

  async shipOrder(shopId: number, orderSn: string, accessToken: string, pickup?: any, dropoff?: any): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/logistics/ship_order';
    const path = '/api/v2/logistics/ship_order';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken
    });

    const body: any = {
      order_sn: orderSn
    };

    if (pickup) {
      body.pickup = pickup;
    } else if (dropoff) {
      body.dropoff = dropoff;
    } else {
      throw new Error('Must provide pickup or dropoff information');
    }

    const fullUrl = `${url}?${params.toString()}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    console.info(`Sending request to Shopee API to ship order: URL=${fullUrl}, Headers=${JSON.stringify(headers)}, Body=${JSON.stringify(body)}`);

    try {
      const response = await axios.post(fullUrl, body, { headers });
      console.info(`Response status code: ${response.status}, Response content: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      console.error('Error shipping order:', error);
      throw error;
    }
  }

  async getReadyToShipOrders(shopId: number, accessToken: string, pageSize: number = 20, cursor: string = ''): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/order/get_shipment_list';
    const path = '/api/v2/order/get_shipment_list';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken,
      page_size: pageSize.toString(),
      cursor
    });

    const fullUrl = `${url}?${params.toString()}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios.get(fullUrl, { headers });
      return response.data;
    } catch (error) {
      console.error('Error getting ready to ship orders:', error);
      throw error;
    }
  }

  async getEscrowDetail(shopId: number, orderSn: string, accessToken: string): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/payment/get_escrow_detail';
    const path = '/api/v2/payment/get_escrow_detail';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken,
      order_sn: orderSn
    });

    const fullUrl = `${url}?${params.toString()}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    try {
      const response = await axios.get(fullUrl, { headers });
      return response.data;
    } catch (error) {
      console.error('Error getting escrow detail:', error);
      throw error;
    }
  }

  async getAdsDailyPerformance(shopId: number, accessToken: string, startDate: string, endDate: string): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/ads/get_all_cpc_ads_daily_performance';
    const path = '/api/v2/ads/get_all_cpc_ads_daily_performance';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate
    });

    const fullUrl = `${url}?${params.toString()}`;
    const headers = {
      'Content-Type': 'application/json'
    };

    console.info(`Sending request to Shopee API for ads daily performance: URL=${fullUrl}, Headers=${JSON.stringify(headers)}`);

    try {
      const response = await axios.get(fullUrl, { headers });
      console.info(`Response status code: ${response.status}, Response content: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      console.error('Error getting ads daily performance:', error);
      throw error;
    }
  }
  async getConversationList(shopId: number, accessToken: string, options: {
    direction: 'latest' | 'older',
    type: 'all' | 'pinned' | 'unread',
    next_timestamp_nano?: number,
    page_size?: number
  }): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/sellerchat/get_conversation_list';
    const path = '/api/v2/sellerchat/get_conversation_list';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken,
      direction: options.direction,
      type: options.type,
      page_size: (options.page_size || 25).toString()
    });

    if (options.next_timestamp_nano) {
      params.append('next_timestamp_nano', options.next_timestamp_nano.toString());
    }

    const fullUrl = `${url}?${params.toString()}`;
    const headers = { 'Content-Type': 'application/json' };

    try {
      const response = await axios.get(fullUrl, { headers });
      return response.data;
    } catch (error) {
      console.error('Error getting conversation list:', error);
      throw error;
    }
  }

  async getOneConversation(shopId: number, accessToken: string, conversationId: string): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/sellerchat/get_one_conversation';
    const path = '/api/v2/sellerchat/get_one_conversation';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken,
      conversation_id: conversationId
    });

    const fullUrl = `${url}?${params.toString()}`;
    const headers = { 'Content-Type': 'application/json' };

    try {
      const response = await axios.get(fullUrl, { headers });
      return response.data;
    } catch (error) {
      console.error('Error getting one conversation:', error);
      throw error;
    }
  }

  async getMessages(shopId: number, accessToken: string, conversationId: string, options: {
    offset?: string,
    page_size?: number,
    message_id_list?: number[]
  }): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/sellerchat/get_message';
    const path = '/api/v2/sellerchat/get_message';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken,
      conversation_id: conversationId,
      page_size: (options.page_size || 25).toString()
    });

    if (options.offset) {
      params.append('offset', options.offset);
    }

    if (options.message_id_list && options.message_id_list.length > 0) {
      params.append('message_id_list', JSON.stringify(options.message_id_list));
    }

    const fullUrl = `${url}?${params.toString()}`;
    const headers = { 'Content-Type': 'application/json' };

    try {
      const response = await axios.get(fullUrl, { headers });
      return response.data;
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  async sendMessage(shopId: number, accessToken: string, toId: number, messageType: string, content: any): Promise<any> {
    // Validasi input
    if (!Number.isInteger(toId) || toId <= 0) {
      throw new Error('Invalid to_id. Harus berupa bilangan bulat positif.');
    }
    if (!['text', 'sticker', 'image', 'item', 'order'].includes(messageType)) {
      throw new Error('Invalid message_type. Harus berupa "text", "sticker", "image", "item", atau "order".');
    }

    const url = 'https://partner.shopeemobile.com/api/v2/sellerchat/send_message';
    const path = '/api/v2/sellerchat/send_message';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken
    });

    const body: any = {
      to_id: toId,
      message_type: messageType,
      content: {}
    };

    // Menyesuaikan content berdasarkan message_type
    switch (messageType) {
      case 'text':
        if (typeof content !== 'string' || content.trim().length === 0) {
          throw new Error('Invalid content for text message. Harus berupa string non-kosong.');
        }
        body.content.text = content;
        break;
      case 'sticker':
        if (!content.sticker_id || !content.sticker_package_id) {
          throw new Error('Invalid content for sticker message. Harus menyertakan sticker_id dan sticker_package_id.');
        }
        body.content.sticker_id = content.sticker_id;
        body.content.sticker_package_id = content.sticker_package_id;
        break;
      case 'image':
        if (!content.image_url) {
          throw new Error('Invalid content for image message. Harus menyertakan image_url.');
        }
        body.content.image_url = content.image_url;
        break;
      case 'item':
        if (!Number.isInteger(content.item_id) || content.item_id <= 0) {
          throw new Error('Invalid content for item message. item_id harus berupa bilangan bulat positif.');
        }
        body.content.item_id = content.item_id;
        break;
      case 'order':
        if (typeof content.order_sn !== 'string' || content.order_sn.trim().length === 0) {
          throw new Error('Invalid content for order message. order_sn harus berupa string non-kosong.');
        }
        body.content.order_sn = content.order_sn;
        break;
    }

    const fullUrl = `${url}?${params.toString()}`;
    const headers = { 'Content-Type': 'application/json' };

    try {
      const response = await axios.post(fullUrl, body, { headers });
      return response.data;
    } catch (error) {
      console.error('Error mengirim pesan:', error);
      throw error;
    }
  }

  async readConversation(shopId: number, accessToken: string, conversationId: number, lastReadMessageId: string): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/sellerchat/read_conversation';
    const path = '/api/v2/sellerchat/read_conversation';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken
    });

    const body = {
      conversation_id: conversationId,
      last_read_message_id: lastReadMessageId
    };

    const fullUrl = `${url}?${params.toString()}`;
    const headers = { 'Content-Type': 'application/json' };

    try {
      const response = await axios.post(fullUrl, body, { headers });
      return response.data;
    } catch (error) {
      console.error('Error reading conversation:', error);
      throw error;
    }
  }

  async unreadConversation(shopId: number, accessToken: string, conversationId: string): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/sellerchat/unread_conversation';
    const path = '/api/v2/sellerchat/unread_conversation';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken
    });

    const body = {
      conversation_id: conversationId
    };

    const fullUrl = `${url}?${params.toString()}`;
    const headers = { 'Content-Type': 'application/json' };

    try {
      const response = await axios.post(fullUrl, body, { headers });
      return response.data;
    } catch (error) {
      console.error('Error unreading conversation:', error);
      throw error;
    }
  }

  async getUnreadConversationCount(shopId: number, accessToken: string): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/sellerchat/get_unread_conversation_count';
    const path = '/api/v2/sellerchat/get_unread_conversation_count';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken
    });

    const fullUrl = `${url}?${params.toString()}`;
    const headers = { 'Content-Type': 'application/json' };

    try {
      const response = await axios.get(fullUrl, { headers });
      return response.data;
    } catch (error) {
      console.error('Error getting unread conversation count:', error);
      throw error;
    }
  }

  async uploadImage(shopId: number, accessToken: string, file: File): Promise<any> {
    const url = 'https://partner.shopeemobile.com/api/v2/sellerchat/upload_image';
    const path = '/api/v2/sellerchat/upload_image';
    const [timest, sign] = this._generateSign(path, accessToken, shopId);

    const params = new URLSearchParams({
      partner_id: this.partnerId.toString(),
      timestamp: timest.toString(),
      sign,
      shop_id: shopId.toString(),
      access_token: accessToken
    });

    const formData = new FormData();
    formData.append('file', file);

    const fullUrl = `${url}?${params.toString()}`;
    const headers = { 'Content-Type': 'multipart/form-data' };

    try {
      const response = await axios.post(fullUrl, formData, { headers });
      return response.data;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }
}

export default ShopeeAPI;
