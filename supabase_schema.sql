
-- AURILOG MASTER - SCRIPT DE ACESSO TOTAL E CORREÇÃO DE CONSTRATINTS
-- Execute este script no SQL Editor do seu projeto Supabase para resolver o erro de cadastro

-- 1. REMOVE CONSTRANGIMENTOS QUE APONTAM PARA AUTH.USERS
-- Como estamos usando login manual, o user_id deve ser um UUID simples que existe em public.admins ou public.drivers
ALTER TABLE IF EXISTS public.vehicles DROP CONSTRAINT IF EXISTS vehicles_user_id_fkey;
ALTER TABLE IF EXISTS public.trips DROP CONSTRAINT IF EXISTS trips_user_id_fkey;
ALTER TABLE IF EXISTS public.expenses DROP CONSTRAINT IF EXISTS expenses_user_id_fkey;
ALTER TABLE IF EXISTS public.maintenance DROP CONSTRAINT IF EXISTS maintenance_user_id_fkey;
ALTER TABLE IF EXISTS public.jornada_logs DROP CONSTRAINT IF EXISTS jornada_logs_user_id_fkey;

-- 2. DESATIVA A SEGURANÇA DE LINHA (RLS) PARA TODOS
ALTER TABLE IF EXISTS public.admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jornada_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_locations DISABLE ROW LEVEL SECURITY;

-- 3. GARANTE PERMISSÕES DE ACESSO AO USUÁRIO WEB
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. INSERE OU ATUALIZA O GESTOR MESTRE COM ID FIXO PARA GARANTIA
-- Usamos um UUID fixo para o master para que o front-end sempre tenha uma referência válida se o banco estiver vazio.
INSERT INTO public.admins (id, name, email, password)
VALUES ('00000000-0000-0000-0000-000000000000', 'Gestor Master', 'admin@aurilog.com', 'admin123')
ON CONFLICT (email) DO UPDATE SET password = 'admin123';

-- 5. ADICIONA ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_vehicles_user ON public.vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_user ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON public.expenses(user_id);
