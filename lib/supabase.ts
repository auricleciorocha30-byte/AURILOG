
import { createClient } from '@supabase/supabase-js';

// Credenciais do projeto hbqzareyfehtcsnfyeft
const supabaseUrl = 'https://hbqzareyfehtcsnfyeft.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhicXphcmV5ZmVodGNzbmZ5ZWZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDg0MzksImV4cCI6MjA4MTkyNDQzOX0.2cwGePSVbU-F8Lwm0j3SoRG5V2XG6pBI32_8LGYlzK0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
