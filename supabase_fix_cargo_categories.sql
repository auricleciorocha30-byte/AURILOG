
-- CRIAÇÃO DA TABELA CARGO_CATEGORIES (Executar no SQL Editor do Supabase)

CREATE TABLE IF NOT EXISTS public.cargo_categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilita RLS
ALTER TABLE public.cargo_categories ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Enable all access for all users" ON public.cargo_categories FOR ALL USING (true) WITH CHECK (true);

-- Permissões
GRANT ALL ON public.cargo_categories TO anon;
GRANT ALL ON public.cargo_categories TO authenticated;
