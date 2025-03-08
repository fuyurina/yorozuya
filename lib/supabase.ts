import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  if (!supabaseInstance) {
    // Hardcoded nilai Supabase URL dan Anon Key
    const supabaseUrl = "https://jsitzrpjtdorcdxencxm.supabase.co";
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaXR6cnBqdGRvcmNkeGVuY3htIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjQ5MjEyOSwiZXhwIjoyMDQyMDY4MTI5fQ.tk5zgD7dv-LKae93N2c6Dj3cFSHtEhJYL772QeT7CIQ";
    
    supabaseInstance = createClient(
      supabaseUrl,
      supabaseAnonKey
    );
  }
  return supabaseInstance;
};

// Untuk backward compatibility
export const supabase = getSupabase();