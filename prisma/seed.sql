-- Script de seed para dados iniciais do ms-users
-- Execute este script após criar as tabelas com Prisma Migrate

-- ========================================
-- 1. PERFIS (Profiles)
-- ========================================

INSERT INTO profiles (id, "createdAt", "updatedAt", code, name, description, "allowedModules", permissions, "isActive")
VALUES
  (
    'profile_gerencial_001',
    NOW(),
    NOW(),
    'GERENCIAL',
    'Gestor/Diretor',
    'Perfil para gestores e diretores hospitalares com acesso ao dashboard executivo e IA especializada',
    '["gerencial"]'::jsonb,
    '{"viewDashboard": true, "accessAI": true, "viewReports": true, "manageContracts": true}'::jsonb,
    true
  ),
  (
    'profile_auditor_002',
    NOW(),
    NOW(),
    'AUDITOR',
    'Auditor Médico',
    'Perfil para auditores médicos com acesso ao sistema de auditoria e enquadramento de porte',
    '["auditor", "gerencial"]'::jsonb,
    '{"viewPatients": true, "auditProcedures": true, "approveReject": true, "viewReports": true}'::jsonb,
    true
  ),
  (
    'profile_analista_003',
    NOW(),
    NOW(),
    'ANALISTA',
    'Analista de Conformidade',
    'Perfil para analistas responsáveis por checklist de documentação e validação de XMLs',
    '["analista"]'::jsonb,
    '{"validateXML": true, "checkDocuments": true, "managePendencies": true}'::jsonb,
    true
  )
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- 2. HOSPITAIS (Hospitals) - Exemplos
-- ========================================

INSERT INTO hospitals (id, "createdAt", "updatedAt", code, name, cnpj, subdomain, "customDomain", "azureTenantId", "logoUrl", "primaryColor", "isActive")
VALUES
  (
    'hospital_h9j_001',
    NOW(),
    NOW(),
    'h9j',
    'Hospital 9 de Julho',
    '61.600.839/0001-55',
    'h9j-lazarus',
    NULL,
    NULL,
    'https://cdn.hospital9dejulho.com.br/logo.png',
    '#1E40AF',
    true
  ),
  (
    'hospital_hsl_002',
    NOW(),
    NOW(),
    'hsl',
    'Hospital Sírio-Libanês',
    '62.780.278/0001-00',
    'hsl-lazarus',
    NULL,
    NULL,
    'https://cdn.hospitalsiriolibanes.org.br/logo.png',
    '#0F766E',
    true
  ),
  (
    'hospital_demo_003',
    NOW(),
    NOW(),
    'demo',
    'Hospital Demo (Testes)',
    '00.000.000/0001-00',
    'demo-lazarus',
    NULL,
    NULL,
    NULL,
    '#7C3AED',
    true
  )
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- 3. USUÁRIO DEMO (User) - Para testes
-- ========================================

INSERT INTO users (id, "createdAt", "updatedAt", name, email, cpf, phone, "azureAdId", "azureAdTenantId", "isActive")
VALUES
  (
    'user_demo_admin_001',
    NOW(),
    NOW(),
    'Dr. João Silva',
    'admin@lazarus.com',
    '123.456.789-00',
    '(11) 98765-4321',
    NULL,
    NULL,
    true
  )
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- 4. ACESSOS DO USUÁRIO DEMO
-- ========================================

-- Conceder acesso ao Hospital 9 de Julho com perfil Auditor
INSERT INTO user_hospital_profiles (id, "createdAt", "updatedAt", "userId", "hospitalId", "profileId", "isActive", "grantedBy", "grantedAt")
VALUES
  (
    'uhp_demo_h9j_auditor',
    NOW(),
    NOW(),
    'user_demo_admin_001',
    'hospital_h9j_001',
    'profile_auditor_002',
    true,
    'system',
    NOW()
  )
ON CONFLICT ("userId", "hospitalId", "profileId") DO NOTHING;

-- Conceder acesso ao Hospital 9 de Julho com perfil Gerencial
INSERT INTO user_hospital_profiles (id, "createdAt", "updatedAt", "userId", "hospitalId", "profileId", "isActive", "grantedBy", "grantedAt")
VALUES
  (
    'uhp_demo_h9j_gerencial',
    NOW(),
    NOW(),
    'user_demo_admin_001',
    'hospital_h9j_001',
    'profile_gerencial_001',
    true,
    'system',
    NOW()
  )
ON CONFLICT ("userId", "hospitalId", "profileId") DO NOTHING;

-- Conceder acesso ao Hospital Demo com todos os perfis
INSERT INTO user_hospital_profiles (id, "createdAt", "updatedAt", "userId", "hospitalId", "profileId", "isActive", "grantedBy", "grantedAt")
VALUES
  (
    'uhp_demo_demo_auditor',
    NOW(),
    NOW(),
    'user_demo_admin_001',
    'hospital_demo_003',
    'profile_auditor_002',
    true,
    'system',
    NOW()
  ),
  (
    'uhp_demo_demo_gerencial',
    NOW(),
    NOW(),
    'user_demo_admin_001',
    'hospital_demo_003',
    'profile_gerencial_001',
    true,
    'system',
    NOW()
  ),
  (
    'uhp_demo_demo_analista',
    NOW(),
    NOW(),
    'user_demo_admin_001',
    'hospital_demo_003',
    'profile_analista_003',
    true,
    'system',
    NOW()
  )
ON CONFLICT ("userId", "hospitalId", "profileId") DO NOTHING;

-- ========================================
-- VERIFICAÇÃO
-- ========================================

-- Verificar perfis criados
SELECT code, name, "isActive" FROM profiles ORDER BY code;

-- Verificar hospitais criados
SELECT code, name, subdomain, "isActive" FROM hospitals ORDER BY code;

-- Verificar usuário demo e seus acessos
SELECT 
  u.name AS usuario,
  h.name AS hospital,
  p.name AS perfil,
  uhp."isActive" AS ativo
FROM user_hospital_profiles uhp
JOIN users u ON uhp."userId" = u.id
JOIN hospitals h ON uhp."hospitalId" = h.id
JOIN profiles p ON uhp."profileId" = p.id
WHERE u.email = 'admin@lazarus.com'
ORDER BY h.name, p.name;
