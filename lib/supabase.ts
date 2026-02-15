
import { createClient } from '@supabase/supabase-js';

// As credenciais são injetadas automaticamente do ambiente Supabase
const supabaseUrl = 'https://hbqzareyfehtcsnfyeft.supabase.co';
const supabaseAnonKey = 'sb_publishable_JBI23-gaSy8CCqTxD1FzfQ_-ZlVt8KX';

// Configuração Master do Cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
