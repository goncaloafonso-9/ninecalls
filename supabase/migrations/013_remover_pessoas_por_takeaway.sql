-- Migration 013 — Remover pessoas_por_takeaway
-- Receita estimada passa a usar valores fixos globais: €20/pessoa, €35/takeaway
-- Os valores por restaurante (valor_estimado_por_pessoa) deixam de ser usados no cálculo.

-- ============================================================
-- 1. Remover coluna de restaurants
-- ============================================================
ALTER TABLE restaurants DROP COLUMN IF EXISTS pessoas_por_takeaway;

-- ============================================================
-- 2. Drop views que dependem da coluna antes de a remover
-- ============================================================
DROP VIEW IF EXISTS v_cycle_metrics;

-- ============================================================
-- 3. Remover snapshot de billing_cycles
-- ============================================================
ALTER TABLE billing_cycles DROP COLUMN IF EXISTS snapshot_pessoas_por_takeaway;

-- ============================================================
-- 4. Actualizar trigger fn_trigger_14
--    Remove a lógica de contagem de pessoas por takeaway na garantia.
--    Takeaways confirmados já NÃO contribuem para guarantee_tracking.contagem_organica.
-- ============================================================
CREATE OR REPLACE FUNCTION fn_trigger_14_guarantee_and_billing_on_takeaway()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_taxa_takeaway NUMERIC;
BEGIN
  IF OLD.estado <> 'pendente_restaurante' OR NEW.estado <> 'confirmado' THEN RETURN NEW; END IF;

  IF NEW.billing_cycle_id IS NOT NULL THEN
    SELECT snapshot_taxa_takeaway
      INTO v_taxa_takeaway
      FROM billing_cycles WHERE id = NEW.billing_cycle_id AND estado = 'ativo';

    IF FOUND THEN
      UPDATE billing_cycles
         SET total_takeaways_confirmados = total_takeaways_confirmados + 1,
             valor_takeaways             = valor_takeaways + COALESCE(v_taxa_takeaway, 0)
       WHERE id = NEW.billing_cycle_id;

      PERFORM fn_recalc_billing_cycle_total(NEW.billing_cycle_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. Recriar view v_cycle_metrics
--    receita_estimada_recuperada = pessoas × €20 + takeaways × €35
--    Remove referência a snapshot_pessoas_por_takeaway e valor_estimado_por_pessoa
-- ============================================================
CREATE OR REPLACE VIEW v_cycle_metrics
  WITH (security_invoker = true) AS
SELECT
  bc.id, bc.restaurant_id,
  r.nome AS restaurant_nome, r.client_id,
  bc.numero_ciclo,
  bc.data_inicio, bc.data_fim_prevista, bc.data_fim_real,
  bc.estado, bc.estado_pagamento,
  bc.fecho_pendente, bc.isento_faturacao,
  bc.snapshot_comissao_por_pessoa, bc.snapshot_taxa_takeaway,
  bc.total_pessoas_reservas, bc.total_pessoas_ultima_hora, bc.total_takeaways_confirmados,
  bc.valor_comissoes_reservas, bc.valor_comissoes_ultima_hora, bc.valor_takeaways, bc.valor_total,
  bc.valor_rescisao_antecipada,
  ROUND(
    (COALESCE(bc.total_pessoas_reservas, 0) + COALESCE(bc.total_pessoas_ultima_hora, 0)) * 20
    + COALESCE(bc.total_takeaways_confirmados, 0) * 35
  , 2) AS receita_estimada_recuperada,
  bc.data_pausa, bc.dias_pausados, bc.minutos_usados,
  COALESCE((SELECT SUM(c2.duration_seconds) / 60.0 FROM calls c2 WHERE c2.billing_cycle_id = bc.id), 0) AS minutos_usados_live,
  (SELECT COUNT(*) FROM calls c WHERE c.billing_cycle_id = bc.id) AS total_chamadas,
  (SELECT COUNT(*) FROM calls c WHERE c.billing_cycle_id = bc.id AND c.call_successful = TRUE) AS chamadas_sucesso,
  (SELECT COUNT(*) FROM calls c WHERE c.billing_cycle_id = bc.id AND c.call_transferred = TRUE) AS chamadas_transferidas,
  (SELECT COUNT(*) FROM bookings b WHERE b.billing_cycle_id = bc.id AND b.estado = 'confirmada') AS reservas_confirmadas,
  (SELECT COUNT(*) FROM bookings b WHERE b.billing_cycle_id = bc.id AND b.estado = 'no_show') AS reservas_no_show,
  (SELECT COUNT(*) FROM takeaway_orders t WHERE t.billing_cycle_id = bc.id AND t.estado = 'confirmado') AS takeaways_confirmados_count,
  (SELECT COUNT(*) FROM takeaway_orders t WHERE t.billing_cycle_id = bc.id AND t.estado = 'pendente_restaurante') AS takeaways_pendentes,
  (SELECT COUNT(*) FROM ultima_hora_requests u WHERE u.billing_cycle_id = bc.id AND u.estado = 'aceite') AS ultimas_horas_aceites,
  bc.stripe_invoice_id, bc.numero_fatura_at, bc.data_emissao_fatura,
  bc.reembolso_ativacao, bc.is_founder, bc.skip_stripe_invoice,
  bc.criado_em, bc.atualizado_em
FROM billing_cycles bc
LEFT JOIN restaurants r ON r.id = bc.restaurant_id;

-- ============================================================
-- Verificação pós-execução:
--   1. Table Editor → restaurants → confirmar que pessoas_por_takeaway não existe
--   2. Table Editor → billing_cycles → confirmar que snapshot_pessoas_por_takeaway não existe
--   3. Functions → confirmar fn_trigger_14_guarantee_and_billing_on_takeaway actualizada
--   4. Views → v_cycle_metrics → confirmar nova fórmula receita_estimada_recuperada
-- ============================================================
