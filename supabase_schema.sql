
-- CORREÇÃO DEFINITIVA DE ESQUEMA PARA VIAGENS
-- Copie e cole este código no SQL Editor do seu Supabase

DO $$ 
BEGIN
    -- Adiciona colunas que podem estar faltando na tabela trips
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='description') THEN
        ALTER TABLE public.trips ADD COLUMN description text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='stops') THEN
        ALTER TABLE public.trips ADD COLUMN stops jsonb DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='driver_commission') THEN
        ALTER TABLE public.trips ADD COLUMN driver_commission numeric DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='notes') THEN
        ALTER TABLE public.trips ADD COLUMN notes text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trips' AND column_name='vehicle_id') THEN
        ALTER TABLE public.trips ADD COLUMN vehicle_id uuid;
    END IF;
END $$;

-- Garante que as permissões continuem ativas para usuários anônimos e autenticados
GRANT ALL ON public.trips TO anon;
GRANT ALL ON public.trips TO authenticated;

-- Força o recarregamento do cache do PostgREST para reconhecer as novas colunas imediatamente
NOTIFY pgrst, 'reload schema';
