-- PRD-008 / F02 — Authentication Custom Login
-- Manual migration prepared for controlled DBA/application rollout.
-- Do not execute automatically against productive database without backup and release approval.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "password_hash" TEXT;

CREATE INDEX IF NOT EXISTS "users_password_hash_idx"
  ON "users" ("password_hash")
  WHERE "password_hash" IS NOT NULL;
