
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
  status TEXT DEFAULT 'Disponível',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Realtime para as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE user_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE drivers;

-- Políticas de RLS
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update their own location" 
ON user_locations FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all locations" 
ON user_locations FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage drivers" 
ON drivers FOR ALL 
USING (true);

-- Adicionar índice para performance em tempo real
CREATE INDEX IF NOT EXISTS idx_user_locations_updated ON user_locations(updated_at);
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);
