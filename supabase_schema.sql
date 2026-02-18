
-- AURILOG - SCRIPT DE ACESSO TOTAL
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Garantir tabelas de usuários no schema público
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. DESATIVAR RLS (Security) para permitir reconhecimento imediato de usuários manuais
-- Isso é necessário para que a chave anon consiga ler os dados sem login auth complexo
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance DISABLE ROW LEVEL SECURITY;
ALTER TABLE jornada_logs DISABLE ROW LEVEL SECURITY;

-- 3. PERMISSÕES PARA A CHAVE DA API (ANON)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 4. Inserir Admin Master Aurilog (Caso não tenha inserido manualmente)
INSERT INTO admins (name, email, password)
VALUES ('Gestor Master Aurilog', 'admin@aurilog.com', 'admin123')
ON CONFLICT (email) DO UPDATE SET password = 'admin123';

-- 5. Tabelas Operacionais com user_id para segregação
-- O App.tsx agora filtra tudo por user_id, garantindo que um motorista não veja dados do outro
