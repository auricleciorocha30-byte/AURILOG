
-- Tabela para rastreamento de localização
CREATE TABLE IF NOT EXISTS user_locations (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Motoristas Cadastrados pelo Admin
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT, -- Armazenado para referência do admin neste protótipo
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (com verificação de existência)
DROP POLICY IF EXISTS "Users can update their own location" ON user_locations;
CREATE POLICY "Users can update their own location" 
ON user_locations FOR ALL 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Everyone can view locations" ON user_locations;
CREATE POLICY "Everyone can view locations" 
ON user_locations FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admins can manage drivers" ON drivers;
CREATE POLICY "Admins can manage drivers" 
ON drivers FOR ALL 
USING (true);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_user_locations_updated ON user_locations(updated_at);
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);
