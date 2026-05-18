-- Migration 010: Add idempotency field for mid-cycle email (day 15)
-- Prevents duplicate emails if cron runs more than once on the same day.

ALTER TABLE billing_cycles
  ADD COLUMN IF NOT EXISTS email_intercalar_enviado_em TIMESTAMPTZ NULL;

COMMENT ON COLUMN billing_cycles.email_intercalar_enviado_em IS
  'Timestamp de quando o email de relatório intercalar (dia 15) foi enviado. NULL = ainda não enviado. Previne duplicados em caso de retry do cron.';
