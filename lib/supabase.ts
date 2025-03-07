import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Periksa apakah environment variables tersedia
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase environment variables tidak tersedia:', {
        url: supabaseUrl ? 'tersedia' : 'tidak tersedia',
        key: supabaseAnonKey ? 'tersedia' : 'tidak tersedia'
      });
      
      // Gunakan nilai default untuk development atau throw error yang lebih jelas
      if (process.env.NODE_ENV === 'development') {
        // Untuk development, gunakan nilai default (jika ada)
        const fallbackUrl = 'https://jsitzrpjtdorcdxencxm.supabase.co';
        const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaXR6cnBqdGRvcmNkeGVuY3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjQ5MjEyOSwiZXhwIjoyMDQyMDY4MTI5fQ.tk5zgD7dv-LKae93N2c6Dj3cFSHtEhJYL772QeT7CIQ'
        
        console.warn('Menggunakan fallback Supabase credentials untuk development');
        supabaseInstance = createClient(fallbackUrl, fallbackKey);
      } else {
        // Untuk production, throw error yang lebih jelas
        throw new Error(
          'Supabase environment variables tidak tersedia. ' +
          'Pastikan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
          'sudah diatur dengan benar di environment variables.'
        );
      }
    } else {
      // Jika environment variables tersedia, buat client seperti biasa
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    }
  }
  
  return supabaseInstance;
};

// Untuk backward compatibility
// Ubah ini untuk menangani error dengan lebih baik
export const supabase = (() => {
  try {
    return getSupabase();
  } catch (error) {
    console.error('Error initializing Supabase client:', error);
    // Return dummy client atau null tergantung kebutuhan aplikasi
    return null;
  }
})();