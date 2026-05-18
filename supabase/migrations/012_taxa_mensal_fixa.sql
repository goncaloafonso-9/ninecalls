-- Migration 012 — Taxa Mensal Fixa
-- Adiciona taxa_mensal_fixa aos restaurantes e snapshot + valor aos ciclos.
-- Actualiza fn_recalc_billing_cycle_total para incluir valor_mensalidade.

-- 1. Coluna na tabela restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS taxa_mensal_fixa NUMERIC(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN restaurants.taxa_mensal_fixa IS
  'Taxa mensal fixa cobrada por ciclo. 0 = sem mensalidade (sem linha Stripe).';

-- 2. Colunas na tabela billing_cycles
ALTER TABLE billing_cycles
  ADD COLUMN IF NOT EXISTS snapshot_taxa_mensal_fixa NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_mensalidade         NUMERIC(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN billing_cycles.snapshot_taxa_mensal_fixa IS
  'Snapshot de restaurants.taxa_mensal_fixa no momento de criação do ciclo. Imutável.';
COMMENT ON COLUMN billing_cycles.valor_mensalidade IS
  'Valor da mensalidade para este ciclo (= snapshot_taxa_mensal_fixa). Incluído em valor_total.';

-- 3. Actualizar fn_recalc_billing_cycle_total para incluir valor_mensalidade
CREATE OR REPLACE FUNCTION fn_recalc_billing_cycle_total(p_cycle_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE billing_cycles
     SET valor_total = COALESCE(valor_comissoes_reservas, 0)
                     + COALESCE(valor_comissoes_ultima_hora, 0)
                     + COALESCE(valor_takeaways, 0)
                     + COALESCE(valor_rescisao_antecipada, 0)
                     + COALESCE(valor_mensalidade, 0),
         isento_faturacao = (
           COALESCE(valor_comissoes_reservas, 0)
           + COALESCE(valor_comissoes_ultima_hora, 0)
           + COALESCE(valor_takeaways, 0)
           + COALESCE(valor_rescisao_antecipada, 0)
           + COALESCE(valor_mensalidade, 0)
         ) = 0
   WHERE id = p_cycle_id;
END;
$$;

COMMENT ON FUNCTION fn_recalc_billing_cycle_total IS
  'Recalcula valor_total e isento_faturacao incluindo valor_mensalidade. '
  'isento_faturacao=TRUE apenas quando valor_total=0.';

GRANT EXECUTE ON FUNCTION fn_recalc_billing_cycle_total(UUID) TO service_role;

-- ============================================================
-- Verificação pós-execução:
--   1. Table Editor → restaurants → confirmar coluna taxa_mensal_fixa
--   2. Table Editor → billing_cycles → confirmar snapshot_taxa_mensal_fixa e valor_mensalidade
--   3. Functions → confirmar fn_recalc_billing_cycle_total actualizada
-- ============================================================
