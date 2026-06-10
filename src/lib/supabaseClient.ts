import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Inicialização segura do cliente Supabase. Se as chaves não existirem,
// o cliente não tentará realizar chamadas à API remota (o app usará LocalStorage como fallback).
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabase) {
  console.warn(
    'Supabase URL ou Anon Key não configurados. O jogo funcionará apenas no modo LocalStorage.'
  );
}
