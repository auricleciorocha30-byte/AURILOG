
-- CORREÇÃO DE ESQUEMA PARA VIAGENS
-- Execute este bloco no SQL Editor do Supabase

-- Adiciona colunas que podem estar faltando
ALTER TABLE IF EXISTS public.trips ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE IF EXISTS public.trips ADD COLUMN IF NOT EXISTS stops jsonb DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.trips ADD COLUMN IF NOT EXISTS driver_commission numeric DEFAULT 0;
ALTER TABLE IF EXISTS public.trips ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE IF EXISTS public.trips ADD COLUMN IF NOT EXISTS vehicle_id uuid;

-- Garante que as permissões continuem ativas
GRANT ALL ON public.trips TO anon;
GRANT ALL ON public.trips TO authenticated;

-- Força o recarregamento do cache do PostgREST (opcional, mas ajuda)
NOTIFY pgrst, 'reload schema';
