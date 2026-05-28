-- Lazarus ms-users — DDL incremental/idempotente compatível com DB Ops MVP
-- Data: 2026-05-28
-- Origem: prisma/schema.prisma validado localmente sem conexão com produção.
-- Escopo: criar/adicionar estruturas necessárias ao ms-users no schema padrão do DATABASE_URL.
-- Guardrails: sem DROP, TRUNCATE, DELETE, UPDATE, Prisma db push ou Prisma reset.
-- Nota: esta variante usa identificadores sem aspas porque a allowlist atual do DB Ops aceita
--       somente sintaxe SQL aditiva não-quoted para CREATE TABLE, ALTER TABLE ADD COLUMN e CREATE INDEX.

CREATE TABLE IF NOT EXISTS users (
    id TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP(3),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    cpf TEXT,
    phone TEXT,
    avatar TEXT,
    password_hash TEXT,
    azure_ad_id TEXT,
    azure_ad_tenant_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    allowed_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS hospitals (
    id TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP(3),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    cnpj TEXT,
    subdomain TEXT NOT NULL,
    custom_domain TEXT,
    azure_tenant_id TEXT,
    logo_url TEXT,
    primary_color TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT hospitals_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS user_hospital_profiles (
    id TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT NOT NULL,
    hospital_id TEXT NOT NULL,
    profile_id TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    granted_by TEXT,
    granted_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_by TEXT,
    revoked_at TIMESTAMP(3),
    CONSTRAINT user_hospital_profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS auth_audit_logs (
    id TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    hospital_id TEXT,
    profile_id TEXT,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    metadata JSONB,
    CONSTRAINT auth_audit_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT NOT NULL,
    hospital_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP(3) NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT user_sessions_pkey PRIMARY KEY (id)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS azure_ad_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS azure_ad_tenant_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allowed_modules JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3);
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS subdomain TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS azure_tenant_id TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE user_hospital_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE user_hospital_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE user_hospital_profiles ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE user_hospital_profiles ADD COLUMN IF NOT EXISTS hospital_id TEXT;
ALTER TABLE user_hospital_profiles ADD COLUMN IF NOT EXISTS profile_id TEXT;
ALTER TABLE user_hospital_profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE user_hospital_profiles ADD COLUMN IF NOT EXISTS granted_by TEXT;
ALTER TABLE user_hospital_profiles ADD COLUMN IF NOT EXISTS granted_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE user_hospital_profiles ADD COLUMN IF NOT EXISTS revoked_by TEXT;
ALTER TABLE user_hospital_profiles ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP(3);

ALTER TABLE auth_audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE auth_audit_logs ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE auth_audit_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE auth_audit_logs ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE auth_audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE auth_audit_logs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE auth_audit_logs ADD COLUMN IF NOT EXISTS hospital_id TEXT;
ALTER TABLE auth_audit_logs ADD COLUMN IF NOT EXISTS profile_id TEXT;
ALTER TABLE auth_audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE auth_audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE auth_audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS hospital_id TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS access_token TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP(3);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS users_cpf_key ON users (cpf);
CREATE UNIQUE INDEX IF NOT EXISTS users_azure_ad_id_key ON users (azure_ad_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE INDEX IF NOT EXISTS users_azure_ad_id_idx ON users (azure_ad_id);
CREATE INDEX IF NOT EXISTS users_is_active_idx ON users (is_active);
CREATE INDEX IF NOT EXISTS users_password_hash_idx ON users (password_hash) WHERE password_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_code_key ON profiles (code);
CREATE INDEX IF NOT EXISTS profiles_code_idx ON profiles (code);
CREATE INDEX IF NOT EXISTS profiles_is_active_idx ON profiles (is_active);

CREATE UNIQUE INDEX IF NOT EXISTS hospitals_code_key ON hospitals (code);
CREATE UNIQUE INDEX IF NOT EXISTS hospitals_cnpj_key ON hospitals (cnpj);
CREATE UNIQUE INDEX IF NOT EXISTS hospitals_subdomain_key ON hospitals (subdomain);
CREATE UNIQUE INDEX IF NOT EXISTS hospitals_custom_domain_key ON hospitals (custom_domain);
CREATE INDEX IF NOT EXISTS hospitals_code_idx ON hospitals (code);
CREATE INDEX IF NOT EXISTS hospitals_subdomain_idx ON hospitals (subdomain);
CREATE INDEX IF NOT EXISTS hospitals_is_active_idx ON hospitals (is_active);

CREATE INDEX IF NOT EXISTS user_hospital_profiles_user_id_idx ON user_hospital_profiles (user_id);
CREATE INDEX IF NOT EXISTS user_hospital_profiles_hospital_id_idx ON user_hospital_profiles (hospital_id);
CREATE INDEX IF NOT EXISTS user_hospital_profiles_profile_id_idx ON user_hospital_profiles (profile_id);
CREATE INDEX IF NOT EXISTS user_hospital_profiles_is_active_idx ON user_hospital_profiles (is_active);
CREATE UNIQUE INDEX IF NOT EXISTS user_hospital_profiles_user_id_hospital_id_profile_id_key ON user_hospital_profiles (user_id, hospital_id, profile_id);

CREATE INDEX IF NOT EXISTS auth_audit_logs_user_id_idx ON auth_audit_logs (user_id);
CREATE INDEX IF NOT EXISTS auth_audit_logs_action_idx ON auth_audit_logs (action);
CREATE INDEX IF NOT EXISTS auth_audit_logs_created_at_idx ON auth_audit_logs (created_at);
CREATE INDEX IF NOT EXISTS auth_audit_logs_hospital_id_idx ON auth_audit_logs (hospital_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_access_token_key ON user_sessions (access_token);
CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_refresh_token_key ON user_sessions (refresh_token);
CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS user_sessions_hospital_id_idx ON user_sessions (hospital_id);
CREATE INDEX IF NOT EXISTS user_sessions_access_token_idx ON user_sessions (access_token);
CREATE INDEX IF NOT EXISTS user_sessions_is_active_idx ON user_sessions (is_active);
CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx ON user_sessions (expires_at);
