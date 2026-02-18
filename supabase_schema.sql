
-- AURILOG MASTER - SCRIPT DE ACESSO TOTAL
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. DESATIVA TODA A SEGURANÇA DE LINHA (RLS)
-- Isso permite que o aplicativo leia seus usuários inseridos manualmente sem bloqueios
ALTER TABLE IF EXISTS public.admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jornada_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;

-- 2. DÁ PERMISSÃO PARA A CHAVE ANON (O que o app usa via Web)
-- Garante que o usuário "anônimo" (público) tenha todas as permissões
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 3. GARANTE QUE O ADMIN MESTRE EXISTE NA TABELA 'admins'
-- Se você não inseriu manualmente, este comando criará o acesso master
INSERT INTO public.admins (name, email, password)
VALUES ('Gestor Master', 'admin@aurilog.com', 'admin123')
ON CONFLICT (email) DO UPDATE SET password = 'admin123';

-- 4. VERIFIQUE SE OS USUÁRIOS QUE VOCÊ ADICIONOU ESTÃO NA TABELA 'public.drivers'
-- O App.tsx procura nesta tabela por e-mail e senha.
