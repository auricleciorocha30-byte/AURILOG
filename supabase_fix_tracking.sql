
-- CRIAÇÃO DA TABELA DE RASTREAMENTO (Executar no SQL Editor)

CREATE TABLE IF NOT EXISTS public.user_locations (
    user_id uuid PRIMARY KEY, -- Usa o ID do motorista como Chave Primária para evitar duplicatas
    email text,
    latitude double precision,
    longitude double precision,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Habilita segurança nível de linha (RLS)
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- CRÍTICO: Política permissiva para permitir que o App do Motorista (que usa login customizado) escreva na tabela
-- Removemos políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Enable all access for user_locations" ON public.user_locations;

CREATE POLICY "Enable all access for user_locations" 
ON public.user_locations 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Garante permissões para as roles do Supabase
GRANT ALL ON public.user_locations TO anon;
GRANT ALL ON public.user_locations TO authenticated;
GRANT ALL ON public.user_locations TO service_role;
