
-- 1. CRIAR TABELA DE ADMINISTRADORES (GESTÃO MASTER)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. INSERIR ADMINISTRADOR INICIAL (Caso não exista)
-- Use estas credenciais: admin@aurilog.com / admin123
INSERT INTO admins (name, email, password)
SELECT 'Gestor Master', 'admin@aurilog.com', 'admin123'
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE email = 'admin@aurilog.com');

-- 3. CRIAR TABELA DE MOTORISTAS
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT, 
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CRIAR TABELA DE LOCALIZAÇÃO
CREATE TABLE IF NOT EXISTS user_locations (
  user_id UUID PRIMARY KEY,
  email TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. HABILITAR SEGURANÇA (RLS)
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS DE ACESSO (Simplificadas para o painel Master)
CREATE POLICY "Acesso Total Admins" ON admins FOR ALL USING (true);
CREATE POLICY "Acesso Total Drivers" ON drivers FOR ALL USING (true);
CREATE POLICY "Acesso Total Localização" ON user_locations FOR ALL USING (true);

-- 7. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);
