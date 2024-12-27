import { supabase } from '@/lib/supabase';
import { sendEventToAll } from '@/app/api/webhook/route';

// Types
export interface ShopeeUpdateWebhook {
  code: number;
  timestamp: number;
  shop_id: number;
  data: {
    actions: Array<{
      content: string;
      update_time: number;
      title: string;
      url: string;
    }>;
  };
}

export interface UpdateNotification {
  id?: number;
  type: 'shopee_update';
  action: string;
  shop_id: number;
  title: string;
  content: string;
  url: string;
  details: any;
  timestamp: number;
  read: boolean;
}

// Service Class
export class UpdateService {
  static async handleUpdate(data: ShopeeUpdateWebhook) {
    try {
      // Proses setiap update dalam actions array
      for (const action of data.data.actions) {
        await this.saveUpdateToDatabase({
          ...data,
          data: { actions: [action] } // Simpan satu action per record
        });
        await this.sendUpdateNotification(data.shop_id, action);
      }
    } catch (error) {
      console.error('Error handling update:', error);
      throw error;
    }
  }

  private static async saveUpdateToDatabase(data: ShopeeUpdateWebhook) {
    const { error } = await supabase
      .from('shopee_notifications')
      .insert({
        notification_type: 'shopee_update',
        shop_id: data.shop_id,
        data: data,
        processed: true,
        read: false
      });

    if (error) throw error;
  }

  private static async sendUpdateNotification(shop_id: number, action: ShopeeUpdateWebhook['data']['actions'][0]) {
    const notification: UpdateNotification = {
      type: 'shopee_update',
      action: 'UPDATE',
      shop_id: shop_id,
      title: action.title,
      content: action.content,
      url: action.url,
      details: {
        title: action.title,
        content: action.content,
        url: action.url
      },
      timestamp: action.update_time,
      read: false
    };

    sendEventToAll(notification);
  }

  public static createUpdateNotification(notification: any): UpdateNotification {
    const action = notification.data.data.actions[0];
    return {
      id: notification.id,
      type: 'shopee_update',
      action: 'UPDATE',
      shop_id: notification.data.shop_id,
      title: action.title,
      content: action.content,
      url: action.url,
      details: {
        title: action.title,
        content: action.content,
        url: action.url
      },
      timestamp: action.update_time,
      read: notification.read
    };
  }
} 