
-- 1. CRIAR TABELAS (IF NOT EXISTS para evitar erros)

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  current_km INTEGER DEFAULT 0,
  axles INTEGER DEFAULT 2,
  cargo_type TEXT DEFAULT 'geral',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  description TEXT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  stops JSONB DEFAULT '[]',
  distance_km NUMERIC NOT NULL,
  agreed_price NUMERIC NOT NULL,
  driver_commission_percentage NUMERIC DEFAULT 10,
  driver_commission NUMERIC DEFAULT 0,
  cargo_type TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Agendada',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  due_date DATE, -- Essencial para alertas de vencimento
  is_paid BOOLEAN DEFAULT true, -- Essencial para controle de dívidas
  installments_total INTEGER DEFAULT 1,
  installment_number INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  km_at_purchase INTEGER,
  warranty_months INTEGER DEFAULT 0,
  warranty_km INTEGER DEFAULT 0,
  purchase_date DATE NOT NULL,
  cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jornada_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS road_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  location_url TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'INFO',
  category TEXT NOT NULL DEFAULT 'GENERAL',
  target_user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ATIVAR RLS (Segurança por Linha)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE jornada_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE road_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS (Limpando as antigas primeiro para evitar erro 42710)

DO $$ 
BEGIN
    -- Vehicles
    DROP POLICY IF EXISTS "Users can manage their own vehicles" ON vehicles;
    CREATE POLICY "Users can manage their own vehicles" ON vehicles FOR ALL USING (auth.uid() = user_id);

    -- Trips
    DROP POLICY IF EXISTS "Users can manage their own trips" ON trips;
    CREATE POLICY "Users can manage their own trips" ON trips FOR ALL USING (auth.uid() = user_id);

    -- Expenses
    DROP POLICY IF EXISTS "Users can manage their own expenses" ON expenses;
    CREATE POLICY "Users can manage their own expenses" ON expenses FOR ALL USING (auth.uid() = user_id);

    -- Maintenance
    DROP POLICY IF EXISTS "Users can manage their own maintenance" ON maintenance;
    CREATE POLICY "Users can manage their own maintenance" ON maintenance FOR ALL USING (auth.uid() = user_id);

    -- Jornada
    DROP POLICY IF EXISTS "Users can manage their own jornada" ON jornada_logs;
    CREATE POLICY "Users can manage their own jornada" ON jornada_logs FOR ALL USING (auth.uid() = user_id);

    -- Road Services (Global Read)
    DROP POLICY IF EXISTS "Anyone can view road services" ON road_services;
    CREATE POLICY "Anyone can view road services" ON road_services FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Admin only can manage road services" ON road_services;
    CREATE POLICY "Admin only can manage road services" ON road_services FOR ALL USING (true);

    -- Notifications (Global Read)
    DROP POLICY IF EXISTS "Anyone can view notifications" ON notifications;
    CREATE POLICY "Anyone can view notifications" ON notifications FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Admin only can manage notifications" ON notifications;
    CREATE POLICY "Admin only can manage notifications" ON notifications FOR ALL USING (true);
END $$;

-- 4. ÍNDICES (Para busca rápida de dívidas e viagens)
CREATE INDEX IF NOT EXISTS idx_expenses_user_paid ON expenses(user_id, is_paid);
CREATE INDEX IF NOT EXISTS idx_expenses_due_date ON expenses(due_date);
CREATE INDEX IF NOT EXISTS idx_trips_user_date ON trips(user_id, date);
CREATE INDEX IF NOT EXISTS idx_jornada_user_date ON jornada_logs(user_id, date);
