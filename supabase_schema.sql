
-- AURILOG MASTER - SCRIPT DE ESTRUTURA E ACESSO
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. TABELA DE GESTORES (ADMINS)
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE MOTORISTAS (DRIVERS)
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. DESATIVAR SEGURANÇA (RLS)
-- Como estamos usando e-mail/senha manuais, precisamos desativar o RLS para que o App leia estas tabelas via chave Anon.
ALTER TABLE IF EXISTS public.admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jornada_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_locations DISABLE ROW LEVEL SECURITY;

-- 4. PERMISSÕES TOTAIS PARA O APP WEB (ANON)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. INSERIR ADMIN MESTRE (Caso já não exista)
INSERT INTO public.admins (name, email, password)
VALUES ('Gestor Master', 'admin@aurilog.com', 'admin123')
ON CONFLICT (email) DO NOTHING;

-- 6. EXEMPLO DE MOTORISTA (Para teste imediato)
INSERT INTO public.drivers (name, email, password)
VALUES ('Motorista Teste', 'motorista@aurilog.com', '123456')
ON CONFLICT (email) DO NOTHING;
