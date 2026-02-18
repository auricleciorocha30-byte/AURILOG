
-- AURILOG MASTER - SCRIPT DE ACESSO TOTAL
-- Execute este script no SQL Editor do seu projeto Supabase para liberar o login

-- 1. DESATIVA A SEGURANÇA DE LINHA (RLS)
-- Isso permite que o app leia os e-mails e senhas que você cadastrou manualmente no banco.
ALTER TABLE IF EXISTS public.admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.maintenance DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.jornada_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_locations DISABLE ROW LEVEL SECURITY;

-- 2. DÁ PERMISSÃO PARA O USUÁRIO WEB (ANON) LER E ESCREVER
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 3. GARANTE QUE O GESTOR MESTRE EXISTE
-- Se você não consegue logar, este comando garante que este usuário abaixo funcione.
INSERT INTO public.admins (name, email, password)
VALUES ('Gestor Master', 'admin@aurilog.com', 'admin123')
ON CONFLICT (email) DO UPDATE SET password = 'admin123';

-- 4. EXEMPLO DE MOTORISTA (Caso queira testar)
INSERT INTO public.drivers (name, email, password)
VALUES ('Motorista Exemplo', 'motorista@aurilog.com', '123456')
ON CONFLICT (email) DO UPDATE SET password = '123456';

-- DICA: Se você criou usuários na aba 'Authentication' do Supabase, eles NÃO vão funcionar.
-- Você deve criá-los na aba 'Table Editor', nas tabelas 'public.admins' ou 'public.drivers'.
