-- Migration 005: Add founder fields to billing_cycles and contracts
ALTER TABLE billing_cycles
  ADD COLUMN IF NOT EXISTS is_founder BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS skip_stripe_invoice BOOLEAN DEFAULT FALSE;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS is_founder_terms BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS founder_notes TEXT;

COMMENT ON COLUMN billing_cycles.is_founder IS 'True = ciclo fundador, sem invoice Stripe';
COMMENT ON COLUMN billing_cycles.skip_stripe_invoice IS 'True = não criar invoice mesmo com valor > 0';
COMMENT ON COLUMN contracts.is_founder_terms IS 'True = contrato com condições de cliente fundador';
COMMENT ON COLUMN contracts.founder_notes IS 'Notas internas sobre o acordo com o cliente fundador';
