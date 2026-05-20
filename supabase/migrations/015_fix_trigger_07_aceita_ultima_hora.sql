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
    'pendente_restaurante'::takeaway_estado, NOW() + INTERVAL '4 hours'
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calls_06_create_takeaway ON calls;
CREATE TRIGGER trg_calls_06_create_takeaway
  AFTER INSERT ON calls
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_06_create_takeaway();


CREATE OR REPLACE FUNCTION fn_trigger_07_create_ultima_hora()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_espaco             espaco_tipo;
  v_aceita_ultima_hora BOOLEAN;
  v_estado             ultima_hora_estado;
  v_billing_cycle_id   UUID;
BEGIN
  IF NEW.ultima_hora_solicitada IS NOT TRUE OR NEW.ultima_hora_datetime IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT aceita_ultima_hora INTO v_aceita_ultima_hora
  FROM restaurants
  WHERE id = NEW.restaurant_id;

  v_espaco := CASE
    WHEN NEW.ultima_hora_espaco IN ('sala','terraco','esplanada','sem_preferencia','desconhecido')
    THEN NEW.ultima_hora_espaco::espaco_tipo
    ELSE 'desconhecido'::espaco_tipo
  END;

  IF v_aceita_ultima_hora IS TRUE THEN
    v_estado           := 'pendente_restaurante'::ultima_hora_estado;
    v_billing_cycle_id := NEW.billing_cycle_id;
  ELSE
    v_estado           := 'nao_aplicavel'::ultima_hora_estado;
    v_billing_cycle_id := NULL;
  END IF;

  INSERT INTO ultima_hora_requests (
    call_id, restaurant_id, customer_id, billing_cycle_id,
    cliente_nome, cliente_phone,
    datetime_solicitado, ultima_hora_datetime, pessoas, espaco_preferido,
    estado, expira_em
  )
  VALUES (
    NEW.id, NEW.restaurant_id, NEW.customer_id, v_billing_cycle_id,
    NEW.nome_cliente, NEW.caller_phone,
    NEW.ultima_hora_datetime, NEW.ultima_hora_datetime, NEW.ultima_hora_pessoas, v_espaco,
    v_estado, NOW() + INTERVAL '4 hours'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calls_07_create_ultima_hora ON calls;
CREATE TRIGGER trg_calls_07_create_ultima_hora
  AFTER INSERT ON calls
  FOR EACH ROW EXECUTE FUNCTION fn_trigger_07_create_ultima_hora();
