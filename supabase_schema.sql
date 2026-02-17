
-- Tabela para rastreamento de localização
CREATE TABLE IF NOT EXISTS user_locations (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Motoristas Cadastrados pelo Admin
-- Nota: A senha é armazenada aqui apenas para fins de visualização/registro do admin neste protótipo.
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT, 
  status TEXT DEFAULT 'Disponível',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Políticas de RLS
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can update their own location" 
ON user_locations FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view locations" 
ON user_locations FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage drivers" 
ON drivers FOR ALL 
USING (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_locations_updated ON user_locations(updated_at);
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);
