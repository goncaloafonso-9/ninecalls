-- Migration 014 — Estender Trigger 12 para tratar cancelado igual a no_show
--
-- Contexto: A tabela bookings já tem os campos:
--   checked          BOOLEAN DEFAULT FALSE
--   checked_at       TIMESTAMPTZ
--   check_resultado  TEXT
--   reserva_id_verdadeira TEXT
--
-- Não é necessário adicionar colunas. Esta migration apenas substitui a
-- função fn_trigger_12_handle_no_show para também reverter faturação e
-- garantia quando estado muda de confirmada → cancelado.
--
-- Antes desta migration, apenas confirmada → no_show era tratado.

CREATE OR REPLACE FUNCTION fn_trigger_12_handle_no_show()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comissao     NUMERIC;
  v_num_ciclo    INTEGER;
  v_gt_id        UUID;
  v_gt_organica  INTEGER;
  v_gt_manual    INTEGER;
  v_gt_estado    guarantee_estado;
  v_gt_objetivo  INTEGER;
BEGIN
  -- Dispara para: confirmada → no_show  OU  confirmada → cancelado
  IF OLD.estado <> 'confirmada' OR NEW.estado NOT IN ('no_show', 'cancelado') THEN
    RETURN NEW;
  END IF;

  NEW.estado_alterado_em := NOW();

  IF NEW.billing_cycle_id IS NOT NULL THEN
    SELECT snapshot_comissao_por_pessoa, numero_ciclo
      INTO v_comissao, v_num_ciclo
      FROM billing_cycles
     WHERE id = NEW.billing_cycle_id;

    IF FOUND AND v_comissao IS NOT NULL THEN
      -- Reverter pessoas e comissão no ciclo
      UPDATE billing_cycles
         SET total_pessoas_reservas   = GREATEST(total_pessoas_reservas - NEW.number_of_people, 0),
             valor_comissoes_reservas = GREATEST(
               valor_comissoes_reservas - (v_comissao * NEW.number_of_people), 0
             )
       WHERE id = NEW.billing_cycle_id;

      PERFORM fn_recalc_billing_cycle_total(NEW.billing_cycle_id);

      -- Reverter garantia (apenas ciclo 0)
      IF v_num_ciclo = 0 THEN
        SELECT id, contagem_organica, contagem_manual, estado, objetivo
          INTO v_gt_id, v_gt_organica, v_gt_manual, v_gt_estado, v_gt_objetivo
          FROM guarantee_tracking
         WHERE restaurant_id = NEW.restaurant_id;

        IF FOUND AND v_gt_estado IN ('em_curso', 'cumprido') THEN
          UPDATE guarantee_tracking
             SET contagem_organica = GREATEST(contagem_organica - NEW.number_of_people, 0)
           WHERE id = v_gt_id;

          UPDATE guarantee_tracking
             SET estado = CASE
                   WHEN (GREATEST(v_gt_organica - NEW.number_of_people, 0) + v_gt_manual) < objetivo
                   THEN 'em_curso'::guarantee_estado ELSE estado
                 END,
                 data_cumprimento = CASE
                   WHEN (GREATEST(v_gt_organica - NEW.number_of_people, 0) + v_gt_manual) < objetivo
                   THEN NULL ELSE data_cumprimento
                 END,
                 notificacao_enviada = CASE
                   WHEN (GREATEST(v_gt_organica - NEW.number_of_people, 0) + v_gt_manual) < objetivo
                   THEN FALSE ELSE notificacao_enviada
                 END
           WHERE id = v_gt_id;

          IF (GREATEST(v_gt_organica - NEW.number_of_people, 0) + v_gt_manual) < v_gt_objetivo THEN
            UPDATE billing_cycles
               SET fecho_pendente = false
             WHERE id = NEW.billing_cycle_id AND fecho_pendente = true;
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-criar o trigger (BEFORE UPDATE para poder modificar NEW.estado_alterado_em)
DROP TRIGGER IF EXISTS trg_bookings_12_handle_no_show ON bookings;
CREATE TRIGGER trg_bookings_12_handle_no_show
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_12_handle_no_show();

-- ============================================================
-- Verificação pós-execução:
--   1. Functions → confirmar fn_trigger_12_handle_no_show actualizada
--   2. Testar: UPDATE booking de confirmada→cancelado deve subtrair do billing_cycle
--   3. Testar: UPDATE booking de confirmada→no_show deve continuar a funcionar
-- ============================================================
