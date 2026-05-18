-- ============================================================
--  Migration 008 — Ensure Complete Schema v4.1
--  Totalmente idempotente: seguro para executar múltiplas vezes.
--  Executar no Supabase SQL Editor (service_role).
-- ============================================================


-- ============================================================
-- BLOCO 1 — Colunas em falta na tabela calls
-- ============================================================

ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS contacto_cliente       TEXT,
  ADD COLUMN IF NOT EXISTS call_start_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_end_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_successful        BOOLEAN,
  ADD COLUMN IF NOT EXISTS call_transferred       BOOLEAN,
  ADD COLUMN IF NOT EXISTS motivo_transferencia   TEXT,
  ADD COLUMN IF NOT EXISTS razao_insucesso        TEXT,
  ADD COLUMN IF NOT EXISTS numero_slots_tentados  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_datetime       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS number_of_people       SMALLINT,
  ADD COLUMN IF NOT EXISTS special_requests       TEXT,
  ADD COLUMN IF NOT EXISTS reserva_id_verdadeira  TEXT,
  ADD COLUMN IF NOT EXISTS takeaway_pickup_time   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS takeaway_items         TEXT,
  ADD COLUMN IF NOT EXISTS takeaway_pessoas       SMALLINT,
  ADD COLUMN IF NOT EXISTS ultima_hora_datetime   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ultima_hora_pessoas    SMALLINT,
  ADD COLUMN IF NOT EXISTS ultima_hora_espaco     TEXT;

-- servico com CHECK constraint (adicionar só se não existir)
DO $$ BEGIN
  ALTER TABLE calls ADD COLUMN IF NOT EXISTS servico TEXT;
  -- Tentar adicionar CHECK apenas se ainda não existe
  ALTER TABLE calls ADD CONSTRAINT calls_servico_check
    CHECK (servico IN ('almoco','jantar','desconhecido'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- BLOCO 2 — Remover função legada process_incoming_call
-- ============================================================

DO $$ BEGIN
  EXECUTE 'DROP FUNCTION IF EXISTS process_incoming_call CASCADE';
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- ============================================================
-- BLOCO 3 — Triggers BEFORE INSERT on calls (1-4)
-- ============================================================

-- Trigger 1: resolve_agent
CREATE OR REPLACE FUNCTION fn_trigger_01_resolve_agent()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_telnyx_agent_id TEXT;
BEGIN
  v_telnyx_agent_id := NEW.raw_payload ->> 'agent_id';
  IF v_telnyx_agent_id IS NULL THEN
    v_telnyx_agent_id := NEW.raw_payload -> 'call' ->> 'agent_id';
  END IF;
  IF v_telnyx_agent_id IS NOT NULL THEN
    SELECT id INTO NEW.agent_id
      FROM agents
     WHERE telnyx_agent_id = v_telnyx_agent_id AND activo = true
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_calls_01_resolve_agent ON calls;
CREATE TRIGGER trg_calls_01_resolve_agent
  BEFORE INSERT ON calls
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_01_resolve_agent();


-- Trigger 2: fill_restaurant_id
CREATE OR REPLACE FUNCTION fn_trigger_02_fill_restaurant_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.agent_id IS NOT NULL AND NEW.restaurant_id IS NULL THEN
    SELECT restaurant_id INTO NEW.restaurant_id FROM agents WHERE id = NEW.agent_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_calls_02_fill_restaurant_id ON calls;
CREATE TRIGGER trg_calls_02_fill_restaurant_id
  BEFORE INSERT ON calls
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_02_fill_restaurant_id();


-- Trigger 3: upsert_customer
CREATE OR REPLACE FUNCTION fn_trigger_03_upsert_customer()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_first_name TEXT;
BEGIN
  IF NEW.restaurant_id IS NULL OR NEW.caller_phone IS NULL THEN RETURN NEW; END IF;
  v_first_name := NULLIF(TRIM(COALESCE(NEW.nome_cliente, '')), '');
  INSERT INTO customers (restaurant_id, phone, first_name, primeira_interacao, ultima_interacao)
  VALUES (NEW.restaurant_id, NEW.caller_phone, v_first_name, NOW(), NOW())
  ON CONFLICT (restaurant_id, phone) DO UPDATE
    SET first_name       = COALESCE(NULLIF(TRIM(EXCLUDED.first_name), ''), customers.first_name),
        ultima_interacao = NOW()
  RETURNING id INTO NEW.customer_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_calls_03_upsert_customer ON calls;
CREATE TRIGGER trg_calls_03_upsert_customer
  BEFORE INSERT ON calls
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_03_upsert_customer();


-- Trigger 4: resolve_billing_cycle
CREATE OR REPLACE FUNCTION fn_trigger_04_resolve_billing_cycle()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.restaurant_id IS NOT NULL THEN
    SELECT id INTO NEW.billing_cycle_id
      FROM billing_cycles
     WHERE restaurant_id = NEW.restaurant_id AND estado = 'ativo'
     ORDER BY numero_ciclo DESC
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_calls_04_resolve_billing_cycle ON calls;
CREATE TRIGGER trg_calls_04_resolve_billing_cycle
  BEFORE INSERT ON calls
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_04_resolve_billing_cycle();


-- ============================================================
-- BLOCO 4 — Triggers AFTER INSERT on calls (5-10)
-- ============================================================

-- Trigger 5: create_booking
CREATE OR REPLACE FUNCTION fn_trigger_05_create_booking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_espaco  espaco_tipo;
  v_servico servico_tipo;
  v_lingua  call_lingua;
BEGIN
  IF NEW.appointment_booked IS NOT TRUE OR NEW.booking_datetime IS NULL THEN
    RETURN NEW;
  END IF;

  v_espaco := CASE
    WHEN NEW.espaco_preferido IN ('sala','terraco','esplanada','sem_preferencia','desconhecido')
    THEN NEW.espaco_preferido::espaco_tipo ELSE 'desconhecido'::espaco_tipo
  END;
  v_servico := CASE
    WHEN NEW.servico IN ('almoco','jantar','desconhecido')
    THEN NEW.servico::servico_tipo ELSE 'desconhecido'::servico_tipo
  END;
  v_lingua := NEW.lingua_detectada;

  INSERT INTO bookings (
    call_id, restaurant_id, agent_id, customer_id, billing_cycle_id,
    cliente_nome, cliente_phone,
    booking_datetime, number_of_people,
    espaco, servico, special_requests, lingua,
    reserva_id_verdadeira,
    estado, confirmado_em
  )
  VALUES (
    NEW.id, NEW.restaurant_id, NEW.agent_id, NEW.customer_id, NEW.billing_cycle_id,
    NEW.nome_cliente, NEW.caller_phone,
    NEW.booking_datetime, NEW.number_of_people,
    v_espaco, v_servico, NEW.special_requests, v_lingua,
    NEW.reserva_id_verdadeira,
    'confirmada', COALESCE(NEW.call_start_at, NOW())
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_calls_05_create_booking ON calls;
CREATE TRIGGER trg_calls_05_create_booking
  AFTER INSERT ON calls
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_05_create_booking();


-- Trigger 6: create_takeaway
CREATE OR REPLACE FUNCTION fn_trigger_06_create_takeaway()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.takeaway_order_placed IS NOT TRUE OR NEW.takeaway_pickup_time IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO takeaway_orders (
    call_id, restaurant_id, customer_id, billing_cycle_id,
    cliente_nome, cliente_phone, pickup_time, items, pessoas,
    estado, expira_em
  )
  VALUES (
    NEW.id, NEW.restaurant_id, NEW.customer_id, NEW.billing_cycle_id,
    NEW.nome_cliente, NEW.caller_phone,
    NEW.takeaway_pickup_time, NEW.takeaway_items, NEW.takeaway_pessoas,
    'pendente_restaurante', NOW() + INTERVAL '4 hours'
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_calls_06_create_takeaway ON calls;
CREATE TRIGGER trg_calls_06_create_takeaway
  AFTER INSERT ON calls
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_06_create_takeaway();


-- Trigger 7: create_ultima_hora
CREATE OR REPLACE FUNCTION fn_trigger_07_create_ultima_hora()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_espaco espaco_tipo;
BEGIN
  IF NEW.ultima_hora_solicitada IS NOT TRUE OR NEW.ultima_hora_datetime IS NULL THEN
    RETURN NEW;
  END IF;
  v_espaco := CASE
    WHEN NEW.ultima_hora_espaco IN ('sala','terraco','esplanada','sem_preferencia','desconhecido')
    THEN NEW.ultima_hora_espaco::espaco_tipo ELSE 'desconhecido'::espaco_tipo
  END;
  INSERT INTO ultima_hora_requests (
    call_id, restaurant_id, customer_id, billing_cycle_id,
    cliente_nome, cliente_phone,
    datetime_solicitado, ultima_hora_datetime, pessoas, espaco_preferido,
    estado, expira_em
  )
  VALUES (
    NEW.id, NEW.restaurant_id, NEW.customer_id, NEW.billing_cycle_id,
    NEW.nome_cliente, NEW.caller_phone,
    NEW.ultima_hora_datetime, NEW.ultima_hora_datetime, NEW.ultima_hora_pessoas, v_espaco,
    'pendente_restaurante', NOW() + INTERVAL '4 hours'
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_calls_07_create_ultima_hora ON calls;
CREATE TRIGGER trg_calls_07_create_ultima_hora
  AFTER INSERT ON calls
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_07_create_ultima_hora();


-- Trigger 8: update_customer_counters
CREATE OR REPLACE FUNCTION fn_trigger_08_update_customer_counters()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;
  UPDATE customers
     SET total_chamadas          = total_chamadas + 1,
         total_reservas          = total_reservas + CASE WHEN NEW.appointment_booked = TRUE THEN 1 ELSE 0 END,
         total_takeaways         = total_takeaways + CASE WHEN NEW.takeaway_order_placed = TRUE THEN 1 ELSE 0 END,
         total_mesas_ultima_hora = total_mesas_ultima_hora + CASE WHEN NEW.ultima_hora_solicitada = TRUE THEN 1 ELSE 0 END,
         ultima_interacao        = NOW()
   WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_calls_08_update_customer_counters ON calls;
CREATE TRIGGER trg_calls_08_update_customer_counters
  AFTER INSERT ON calls
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_08_update_customer_counters();


-- Trigger 9: update_daily_stats (full-recalc)
CREATE OR REPLACE FUNCTION fn_trigger_09_update_daily_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_date DATE;
BEGIN
  IF NEW.restaurant_id IS NULL THEN RETURN NEW; END IF;
  v_date := (COALESCE(NEW.call_start_at, NOW()) AT TIME ZONE 'UTC')::DATE;

  INSERT INTO daily_stats (
    restaurant_id, stat_date,
    total_chamadas, chamadas_sucesso, chamadas_transferidas, chamadas_insucesso,
    reservas_criadas, takeaways_solicitados, ultimas_horas_solicitadas,
    minutos_usados, duracao_media_segundos,
    sentiment_positivo, sentiment_neutro, sentiment_negativo,
    atualizado_em
  )
  SELECT
    NEW.restaurant_id, v_date,
    COUNT(*),
    COUNT(*) FILTER (WHERE call_successful = TRUE),
    COUNT(*) FILTER (WHERE call_transferred = TRUE),
    COUNT(*) FILTER (WHERE call_successful = FALSE),
    COUNT(*) FILTER (WHERE appointment_booked = TRUE),
    COUNT(*) FILTER (WHERE takeaway_order_placed = TRUE),
    COUNT(*) FILTER (WHERE ultima_hora_solicitada = TRUE),
    COALESCE(SUM(duration_seconds), 0) / 60.0,
    COALESCE(AVG(duration_seconds) FILTER (WHERE duration_seconds > 0), 0),
    COUNT(*) FILTER (WHERE user_sentiment = 'positive'),
    COUNT(*) FILTER (WHERE user_sentiment = 'neutral'),
    COUNT(*) FILTER (WHERE user_sentiment = 'negative'),
    NOW()
  FROM calls
  WHERE restaurant_id = NEW.restaurant_id
    AND (COALESCE(call_start_at, criado_em) AT TIME ZONE 'UTC')::DATE = v_date
  ON CONFLICT (restaurant_id, stat_date) DO UPDATE
    SET total_chamadas            = EXCLUDED.total_chamadas,
        chamadas_sucesso          = EXCLUDED.chamadas_sucesso,
        chamadas_transferidas     = EXCLUDED.chamadas_transferidas,
        chamadas_insucesso        = EXCLUDED.chamadas_insucesso,
        reservas_criadas          = EXCLUDED.reservas_criadas,
        takeaways_solicitados     = EXCLUDED.takeaways_solicitados,
        ultimas_horas_solicitadas = EXCLUDED.ultimas_horas_solicitadas,
        minutos_usados            = EXCLUDED.minutos_usados,
        duracao_media_segundos    = EXCLUDED.duracao_media_segundos,
        sentiment_positivo        = EXCLUDED.sentiment_positivo,
        sentiment_neutro          = EXCLUDED.sentiment_neutro,
        sentiment_negativo        = EXCLUDED.sentiment_negativo,
        atualizado_em             = NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_calls_09_update_daily_stats ON calls;
CREATE TRIGGER trg_calls_09_update_daily_stats
  AFTER INSERT ON calls
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_09_update_daily_stats();


-- Trigger 10: update_guarantee_on_booking
CREATE OR REPLACE FUNCTION fn_trigger_10_update_guarantee_on_booking()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.appointment_booked IS NOT TRUE OR NEW.restaurant_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.number_of_people IS NULL OR NEW.number_of_people <= 0 THEN RETURN NEW; END IF;

  UPDATE guarantee_tracking
     SET contagem_organica = contagem_organica + NEW.number_of_people
   WHERE restaurant_id = NEW.restaurant_id AND estado = 'em_curso';

  PERFORM fn_check_guarantee_cumprida(NEW.restaurant_id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_calls_10_update_guarantee_on_booking ON calls;
CREATE TRIGGER trg_calls_10_update_guarantee_on_booking
  AFTER INSERT ON calls
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_10_update_guarantee_on_booking();


-- ============================================================
-- BLOCO 5 — Trigger AFTER INSERT on bookings (11)
-- ============================================================

CREATE OR REPLACE FUNCTION fn_trigger_11_billing_on_booking_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comissao NUMERIC;
BEGIN
  IF NEW.billing_cycle_id IS NULL THEN RETURN NEW; END IF;

  SELECT snapshot_comissao_por_pessoa INTO v_comissao
    FROM billing_cycles
   WHERE id = NEW.billing_cycle_id AND estado = 'ativo';

  IF NOT FOUND OR v_comissao IS NULL THEN RETURN NEW; END IF;

  UPDATE billing_cycles
     SET total_pessoas_reservas   = total_pessoas_reservas + NEW.number_of_people,
         valor_comissoes_reservas = valor_comissoes_reservas + (v_comissao * NEW.number_of_people)
   WHERE id = NEW.billing_cycle_id;

  PERFORM fn_recalc_billing_cycle_total(NEW.billing_cycle_id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_bookings_11_billing_on_insert ON bookings;
CREATE TRIGGER trg_bookings_11_billing_on_insert
  AFTER INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_11_billing_on_booking_insert();


-- ============================================================
-- BLOCO 6 — Trigger BEFORE UPDATE on bookings (12)
-- ============================================================

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
  IF OLD.estado <> 'confirmada' OR NEW.estado <> 'no_show' THEN RETURN NEW; END IF;

  NEW.estado_alterado_em := NOW();

  IF NEW.billing_cycle_id IS NOT NULL THEN
    SELECT snapshot_comissao_por_pessoa, numero_ciclo
      INTO v_comissao, v_num_ciclo
      FROM billing_cycles
     WHERE id = NEW.billing_cycle_id;

    IF FOUND AND v_comissao IS NOT NULL THEN
      UPDATE billing_cycles
         SET total_pessoas_reservas   = GREATEST(total_pessoas_reservas - NEW.number_of_people, 0),
             valor_comissoes_reservas = GREATEST(
               valor_comissoes_reservas - (v_comissao * NEW.number_of_people), 0
             )
       WHERE id = NEW.billing_cycle_id;

      PERFORM fn_recalc_billing_cycle_total(NEW.billing_cycle_id);

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
DROP TRIGGER IF EXISTS trg_bookings_12_handle_no_show ON bookings;
CREATE TRIGGER trg_bookings_12_handle_no_show
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_12_handle_no_show();


-- ============================================================
-- BLOCO 7 — Trigger AFTER UPDATE on ultima_hora_requests (13)
-- ============================================================

CREATE OR REPLACE FUNCTION fn_trigger_13_guarantee_and_billing_on_ultima_hora()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comissao NUMERIC;
BEGIN
  IF OLD.estado <> 'pendente_restaurante' OR NEW.estado <> 'aceite' THEN RETURN NEW; END IF;
  IF NEW.pessoas IS NULL OR NEW.pessoas <= 0 THEN RETURN NEW; END IF;

  UPDATE guarantee_tracking
     SET contagem_organica = contagem_organica + NEW.pessoas
   WHERE restaurant_id = NEW.restaurant_id AND estado = 'em_curso';

  PERFORM fn_check_guarantee_cumprida(NEW.restaurant_id);

  IF NEW.billing_cycle_id IS NOT NULL THEN
    SELECT snapshot_comissao_por_pessoa INTO v_comissao
      FROM billing_cycles WHERE id = NEW.billing_cycle_id AND estado = 'ativo';

    IF FOUND AND v_comissao IS NOT NULL THEN
      UPDATE billing_cycles
         SET total_pessoas_ultima_hora   = total_pessoas_ultima_hora + NEW.pessoas,
             valor_comissoes_ultima_hora = valor_comissoes_ultima_hora + (v_comissao * NEW.pessoas)
       WHERE id = NEW.billing_cycle_id;

      PERFORM fn_recalc_billing_cycle_total(NEW.billing_cycle_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_ultima_hora_13_guarantee_and_billing ON ultima_hora_requests;
CREATE TRIGGER trg_ultima_hora_13_guarantee_and_billing
  AFTER UPDATE ON ultima_hora_requests
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_13_guarantee_and_billing_on_ultima_hora();


-- ============================================================
-- BLOCO 8 — Trigger AFTER UPDATE on takeaway_orders (14)
-- ============================================================

CREATE OR REPLACE FUNCTION fn_trigger_14_guarantee_and_billing_on_takeaway()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_taxa_takeaway        NUMERIC;
  v_pessoas_por_takeaway SMALLINT;
BEGIN
  IF OLD.estado <> 'pendente_restaurante' OR NEW.estado <> 'confirmado' THEN RETURN NEW; END IF;

  IF NEW.billing_cycle_id IS NOT NULL THEN
    SELECT snapshot_taxa_takeaway, snapshot_pessoas_por_takeaway
      INTO v_taxa_takeaway, v_pessoas_por_takeaway
      FROM billing_cycles WHERE id = NEW.billing_cycle_id AND estado = 'ativo';

    IF FOUND THEN
      UPDATE billing_cycles
         SET total_takeaways_confirmados = total_takeaways_confirmados + 1,
             valor_takeaways             = valor_takeaways + COALESCE(v_taxa_takeaway, 0)
       WHERE id = NEW.billing_cycle_id;

      PERFORM fn_recalc_billing_cycle_total(NEW.billing_cycle_id);

      IF COALESCE(v_pessoas_por_takeaway, 0) > 0 THEN
        UPDATE guarantee_tracking
           SET contagem_organica = contagem_organica + v_pessoas_por_takeaway
         WHERE restaurant_id = NEW.restaurant_id AND estado = 'em_curso';

        PERFORM fn_check_guarantee_cumprida(NEW.restaurant_id);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_takeaway_14_guarantee_and_billing ON takeaway_orders;
CREATE TRIGGER trg_takeaway_14_guarantee_and_billing
  AFTER UPDATE ON takeaway_orders
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_14_guarantee_and_billing_on_takeaway();


-- ============================================================
-- BLOCO 9 — Views (CREATE OR REPLACE — todas idempotentes)
-- ============================================================

CREATE OR REPLACE VIEW v_calls_enriched
  WITH (security_invoker = true) AS
SELECT
  c.id, c.telnyx_call_id,
  c.call_start_at, c.call_end_at, c.duration_seconds, c.caller_phone,
  c.call_summary, c.call_successful, c.user_sentiment,
  c.nome_cliente, c.contacto_cliente,
  c.tipo_chamada, c.lingua_detectada,
  c.appointment_booked, c.booking_datetime, c.number_of_people,
  c.special_requests, c.espaco_preferido, c.servico,
  c.reserva_id_verdadeira,
  c.takeaway_order_placed, c.takeaway_pickup_time, c.takeaway_items, c.takeaway_pessoas,
  c.ultima_hora_solicitada, c.ultima_hora_pessoas, c.ultima_hora_datetime, c.ultima_hora_espaco,
  c.call_transferred, c.motivo_transferencia, c.razao_insucesso, c.numero_slots_tentados,
  c.criado_em,
  c.restaurant_id,
  r.nome       AS restaurant_nome,
  r.client_id,
  c.customer_id,
  cu.phone     AS customer_phone,
  c.agent_id,
  a.nome       AS agent_nome,
  c.billing_cycle_id
FROM calls c
LEFT JOIN restaurants r  ON r.id  = c.restaurant_id
LEFT JOIN customers   cu ON cu.id = c.customer_id
LEFT JOIN agents      a  ON a.id  = c.agent_id;


CREATE OR REPLACE VIEW v_bookings_enriched
  WITH (security_invoker = true) AS
SELECT
  b.id, b.call_id,
  b.restaurant_id,
  r.nome               AS restaurant_nome,
  r.client_id,
  b.billing_cycle_id,
  b.customer_id,
  b.cliente_nome, b.cliente_phone,
  b.booking_datetime, b.number_of_people,
  b.espaco, b.servico, b.special_requests, b.lingua,
  b.reserva_id_verdadeira,
  b.estado, b.estado_alterado_em, b.confirmado_em,
  b.checked, b.checked_at, b.check_resultado,
  c.call_start_at      AS chamada_data,
  (
    b.estado = 'confirmada'
    AND NOW() >= b.confirmado_em
    AND NOW() <= b.booking_datetime + INTERVAL '48 hours'
  )                    AS pode_marcar_no_show,
  GREATEST(
    EXTRACT(EPOCH FROM (b.booking_datetime + INTERVAL '48 hours' - NOW())) / 3600.0,
    0
  )                    AS horas_restantes_no_show
FROM bookings b
LEFT JOIN restaurants r ON r.id = b.restaurant_id
LEFT JOIN calls       c ON c.id = b.call_id;


CREATE OR REPLACE VIEW v_bookings_para_verificar
  WITH (security_invoker = true) AS
SELECT
  b.id, b.restaurant_id,
  r.slug AS restaurant_slug, r.software_reservas,
  b.billing_cycle_id, b.booking_datetime, b.number_of_people,
  b.estado, b.reserva_id_verdadeira
FROM bookings b
LEFT JOIN restaurants r ON r.id = b.restaurant_id
WHERE b.checked = FALSE
  AND b.reserva_id_verdadeira IS NOT NULL
  AND r.software_reservas IN ('zenchef', 'thefork');


CREATE OR REPLACE VIEW v_takeaways_enriched
  WITH (security_invoker = true) AS
SELECT
  t.id, t.call_id,
  t.restaurant_id,
  r.nome AS restaurant_nome,
  r.client_id,
  t.billing_cycle_id, t.customer_id,
  t.cliente_nome, t.cliente_phone,
  t.pickup_time, t.items, t.pessoas,
  t.estado,
  t.sms_enviado_restaurante, t.timestamp_resposta_restaurante,
  t.sms_cliente_enviado, t.expira_em, t.criado_em
FROM takeaway_orders t
LEFT JOIN restaurants r ON r.id = t.restaurant_id;


CREATE OR REPLACE VIEW v_ultima_hora_enriched
  WITH (security_invoker = true) AS
SELECT
  u.id, u.call_id,
  u.restaurant_id,
  r.nome AS restaurant_nome,
  r.client_id,
  u.billing_cycle_id, u.customer_id,
  u.cliente_nome, u.cliente_phone,
  u.datetime_solicitado, u.ultima_hora_datetime,
  u.pessoas, u.espaco_preferido,
  u.estado,
  u.sms_enviado_restaurante, u.timestamp_resposta_restaurante,
  u.sms_cliente_enviado, u.mensagem_enviada_cliente,
  u.expira_em, u.criado_em
FROM ultima_hora_requests u
LEFT JOIN restaurants r ON r.id = u.restaurant_id;


CREATE OR REPLACE VIEW v_customers_by_restaurant
  WITH (security_invoker = true) AS
SELECT
  cu.id, cu.restaurant_id,
  r.nome AS restaurant_nome, r.client_id,
  cu.phone, cu.first_name,
  cu.total_chamadas, cu.total_reservas, cu.total_takeaways, cu.total_mesas_ultima_hora,
  cu.primeira_interacao, cu.ultima_interacao, cu.criado_em
FROM customers cu
LEFT JOIN restaurants r ON r.id = cu.restaurant_id;


CREATE OR REPLACE VIEW v_conversoes_manuais_enriched
  WITH (security_invoker = true) AS
SELECT
  cm.id, cm.restaurant_id,
  r.nome AS restaurant_nome, r.client_id,
  cm.billing_cycle_id, cm.tipo, cm.pessoas, cm.motivo, cm.criado_em
FROM conversoes_manuais cm
LEFT JOIN restaurants r ON r.id = cm.restaurant_id;


CREATE OR REPLACE VIEW v_cycle_metrics
  WITH (security_invoker = true) AS
SELECT
  bc.id, bc.restaurant_id,
  r.nome AS restaurant_nome, r.client_id, r.valor_estimado_por_pessoa,
  bc.numero_ciclo,
  bc.data_inicio, bc.data_fim_prevista, bc.data_fim_real,
  bc.estado, bc.estado_pagamento,
  bc.fecho_pendente, bc.isento_faturacao,
  bc.snapshot_comissao_por_pessoa, bc.snapshot_taxa_takeaway, bc.snapshot_pessoas_por_takeaway,
  bc.total_pessoas_reservas, bc.total_pessoas_ultima_hora, bc.total_takeaways_confirmados,
  bc.valor_comissoes_reservas, bc.valor_comissoes_ultima_hora, bc.valor_takeaways, bc.valor_total,
  bc.valor_rescisao_antecipada,
  ROUND((
    COALESCE(bc.total_pessoas_reservas, 0)
    + COALESCE(bc.total_pessoas_ultima_hora, 0)
    + (COALESCE(bc.total_takeaways_confirmados, 0) * COALESCE(bc.snapshot_pessoas_por_takeaway, 0))
  ) * COALESCE(r.valor_estimado_por_pessoa, 0), 2) AS receita_estimada_recuperada,
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


CREATE OR REPLACE VIEW v_guarantee_status
  WITH (security_invoker = true) AS
SELECT
  gt.id, gt.restaurant_id,
  r.nome AS restaurant_nome, r.client_id, r.estado AS restaurant_estado,
  gt.billing_cycle_id, gt.objetivo,
  gt.contagem_organica, gt.contagem_manual, gt.contagem_actual,
  gt.estado, gt.data_cumprimento, gt.cumprido_antes_30_dias, gt.notificacao_enviada,
  GREATEST((CURRENT_DATE - bc.data_inicio) - COALESCE(bc.dias_pausados, 0) + 1, 1) AS dia_efectivo,
  30 AS total_dias_garantia,
  bc.data_inicio AS ciclo_data_inicio,
  bc.data_fim_prevista AS ciclo_data_fim_prevista,
  bc.dias_pausados,
  ROUND((gt.contagem_actual::NUMERIC / NULLIF(gt.objetivo, 0)) * 100, 1) AS progresso_pct,
  GREATEST(gt.objetivo - gt.contagem_actual, 0) AS pessoas_em_falta,
  GREATEST(30 - ((CURRENT_DATE - bc.data_inicio) - COALESCE(bc.dias_pausados, 0)), 0) AS dias_restantes,
  gt.criado_em
FROM guarantee_tracking gt
LEFT JOIN restaurants    r  ON r.id  = gt.restaurant_id
LEFT JOIN billing_cycles bc ON bc.id = gt.billing_cycle_id;


CREATE OR REPLACE VIEW v_kpis_dashboard
  WITH (security_invoker = true) AS
SELECT
  ds.restaurant_id,
  r.nome AS restaurant_nome, r.client_id, r.estado AS restaurant_estado,
  r.tem_takeaway, r.aceita_ultima_hora,
  r.valor_estimado_por_pessoa, r.valor_medio_takeaway, r.em_compromisso,
  ds.stat_date,
  ds.total_chamadas, ds.chamadas_sucesso, ds.chamadas_transferidas, ds.chamadas_insucesso,
  ds.reservas_criadas, ds.takeaways_solicitados, ds.ultimas_horas_solicitadas,
  COALESCE((
    SELECT COUNT(*) FROM ultima_hora_requests u
     WHERE u.restaurant_id = ds.restaurant_id
       AND (u.criado_em AT TIME ZONE 'UTC')::DATE = ds.stat_date
       AND u.estado = 'aceite'
  ), 0) AS ultimas_horas_aceites,
  COALESCE((
    SELECT COUNT(*) FROM takeaway_orders t
     WHERE t.restaurant_id = ds.restaurant_id
       AND (t.criado_em AT TIME ZONE 'UTC')::DATE = ds.stat_date
       AND t.estado = 'confirmado'
  ), 0) AS takeaways_confirmados,
  ds.minutos_usados, ds.duracao_media_segundos,
  ds.sentiment_positivo, ds.sentiment_neutro, ds.sentiment_negativo
FROM daily_stats ds
LEFT JOIN restaurants r ON r.id = ds.restaurant_id;


CREATE OR REPLACE VIEW v_admin_restaurants_overview
  WITH (security_invoker = true) AS
SELECT
  r.id, r.slug, r.nome, r.estado,
  r.client_id,
  cl.nome_empresa AS cliente_nome,
  r.em_compromisso, r.periodo_compromisso_dias, r.data_inicio_compromisso,
  r.tem_takeaway, r.aceita_ultima_hora,
  bc.id AS ciclo_id, bc.numero_ciclo,
  bc.data_inicio AS ciclo_inicio, bc.data_fim_prevista AS ciclo_fim,
  bc.estado_pagamento, bc.valor_total AS ciclo_valor_total,
  bc.isento_faturacao, bc.fecho_pendente, bc.dias_pausados,
  gt.contagem_actual AS garantia_contagem,
  gt.objetivo        AS garantia_objetivo,
  gt.estado          AS garantia_estado,
  cl.stripe_customer_id,
  (SELECT MAX(c.call_start_at) FROM calls c WHERE c.restaurant_id = r.id) AS ultima_chamada,
  r.criado_em
FROM restaurants r
LEFT JOIN clients         cl ON cl.id = r.client_id
LEFT JOIN billing_cycles  bc ON bc.restaurant_id = r.id AND bc.estado IN ('ativo', 'pausado')
LEFT JOIN guarantee_tracking gt ON gt.restaurant_id = r.id;


-- ============================================================
-- BLOCO 10 — RLS (idempotente com DROP IF EXISTS)
-- ============================================================

REVOKE ALL ON audit_log FROM anon, authenticated;
REVOKE ALL ON admin_daily_snapshot FROM anon, authenticated;

ALTER TABLE clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_cycles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls                ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE takeaway_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ultima_hora_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guarantee_tracking   ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversoes_manuais   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_clients_select              ON clients;
DROP POLICY IF EXISTS rls_restaurants_select          ON restaurants;
DROP POLICY IF EXISTS rls_agents_select               ON agents;
DROP POLICY IF EXISTS rls_customers_select            ON customers;
DROP POLICY IF EXISTS rls_billing_cycles_select       ON billing_cycles;
DROP POLICY IF EXISTS rls_calls_select                ON calls;
DROP POLICY IF EXISTS rls_bookings_select             ON bookings;
DROP POLICY IF EXISTS rls_takeaway_orders_select      ON takeaway_orders;
DROP POLICY IF EXISTS rls_ultima_hora_requests_select ON ultima_hora_requests;
DROP POLICY IF EXISTS rls_guarantee_tracking_select   ON guarantee_tracking;
DROP POLICY IF EXISTS rls_daily_stats_select          ON daily_stats;
DROP POLICY IF EXISTS rls_conversoes_manuais_select   ON conversoes_manuais;
DROP POLICY IF EXISTS rls_bookings_update_no_show     ON bookings;

CREATE POLICY rls_clients_select ON clients
  FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY rls_restaurants_select ON restaurants
  FOR SELECT USING (client_id = fn_current_client_id());

CREATE POLICY rls_agents_select ON agents
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE client_id = fn_current_client_id())
  );

CREATE POLICY rls_customers_select ON customers
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE client_id = fn_current_client_id())
  );

CREATE POLICY rls_billing_cycles_select ON billing_cycles
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE client_id = fn_current_client_id())
  );

CREATE POLICY rls_calls_select ON calls
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE client_id = fn_current_client_id())
  );

CREATE POLICY rls_bookings_select ON bookings
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE client_id = fn_current_client_id())
  );

CREATE POLICY rls_takeaway_orders_select ON takeaway_orders
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE client_id = fn_current_client_id())
  );

CREATE POLICY rls_ultima_hora_requests_select ON ultima_hora_requests
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE client_id = fn_current_client_id())
  );

CREATE POLICY rls_guarantee_tracking_select ON guarantee_tracking
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE client_id = fn_current_client_id())
  );

CREATE POLICY rls_daily_stats_select ON daily_stats
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE client_id = fn_current_client_id())
  );

CREATE POLICY rls_conversoes_manuais_select ON conversoes_manuais
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE client_id = fn_current_client_id())
  );

CREATE POLICY rls_bookings_update_no_show ON bookings
  FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE client_id = fn_current_client_id()
    )
    AND estado = 'confirmada'
    AND booking_datetime + INTERVAL '48 hours' >= NOW()
  )
  WITH CHECK (estado = 'no_show');


-- ============================================================
-- FIM — Migration 008 completa
-- ============================================================
