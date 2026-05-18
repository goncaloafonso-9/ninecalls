-- ============================================================
-- Migration 007 — Fix ingest pipeline
-- Executar no Supabase SQL Editor (service_role)
--
-- Problema: a função process_incoming_call usava nomes de colunas
-- do schema antigo que não existem no schema v4.1:
--   call_id_externo   → telnyx_call_id
--   chamada_sucesso   → call_successful
--   chamada_transferida → call_transferred
--   data_reserva / hora_reserva (separados) → booking_datetime (TIMESTAMPTZ)
--   notas_reserva     → special_requests
--   items             → takeaway_items
--   hora_levantamento → takeaway_pickup_time
--   num_pessoas       → number_of_people
--
-- O novo fluxo: n8n WF-DC-01 → POST /api/internal/ingest-call
-- → INSERT directo na tabela calls com colunas v4.1
-- → Triggers AFTER INSERT (5-10) criam os registos derivados
--
-- Esta migration:
--   1. Remove a função antiga (incompatível)
--   2. Garante que as colunas necessárias existem na tabela calls
-- ============================================================


-- ── 1. Remover função antiga (era chamada pela API, já não é usada) ─────
DROP FUNCTION IF EXISTS process_incoming_call(
  uuid, text, text, text, text, integer, text, text, text, text,
  boolean, boolean, boolean, boolean, boolean, jsonb,
  integer, date, time, text, text, jsonb, time
);

-- Fallback: remover por nome (caso a assinatura acima não bata)
DO $$
BEGIN
  -- Tenta remover qualquer versão da função
  PERFORM pg_catalog.pg_proc.proname
    FROM pg_catalog.pg_proc
    JOIN pg_catalog.pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
   WHERE proname = 'process_incoming_call'
     AND nspname = 'public';

  IF FOUND THEN
    EXECUTE 'DROP FUNCTION IF EXISTS public.process_incoming_call CASCADE';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignora se não existir
END $$;


-- ── 2. Garantir que as colunas v4.1 existem em calls ───────────────────
-- Colunas adicionadas por migrations anteriores mas verificadas aqui
-- para garantir que o INSERT do ingest-call funciona

ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS contacto_cliente      TEXT,
  ADD COLUMN IF NOT EXISTS call_start_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_end_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS call_successful       BOOLEAN,
  ADD COLUMN IF NOT EXISTS call_transferred      BOOLEAN,
  ADD COLUMN IF NOT EXISTS motivo_transferencia  TEXT,
  ADD COLUMN IF NOT EXISTS razao_insucesso       TEXT,
  ADD COLUMN IF NOT EXISTS numero_slots_tentados INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_datetime      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS number_of_people      SMALLINT,
  ADD COLUMN IF NOT EXISTS servico               TEXT CHECK (servico IN ('almoco', 'jantar', 'desconhecido')),
  ADD COLUMN IF NOT EXISTS special_requests      TEXT,
  ADD COLUMN IF NOT EXISTS reserva_id_verdadeira TEXT,
  ADD COLUMN IF NOT EXISTS takeaway_pickup_time  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS takeaway_items        TEXT,
  ADD COLUMN IF NOT EXISTS takeaway_pessoas      SMALLINT,
  ADD COLUMN IF NOT EXISTS ultima_hora_datetime  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ultima_hora_pessoas   SMALLINT,
  ADD COLUMN IF NOT EXISTS ultima_hora_espaco    TEXT;


-- ── 3. Verificação final ────────────────────────────────────────────────
-- Confirmar que os triggers AFTER INSERT existem
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
    FROM pg_trigger
   WHERE tgname IN (
     'trg_calls_05_create_booking',
     'trg_calls_06_create_takeaway',
     'trg_calls_07_create_ultima_hora'
   );

  IF v_count < 3 THEN
    RAISE WARNING 'ATENÇÃO: Apenas % de 3 triggers AFTER INSERT encontrados em calls. '
                  'Executar NINE-CALLS-SUPABASE-SCHEMA-COMPLETO.md (Secção 7) para criar os triggers em falta.',
                  v_count;
  ELSE
    RAISE NOTICE 'OK: Triggers 5, 6, 7 verificados em calls.';
  END IF;
END $$;

-- ============================================================
-- FIM
-- Verificar no Supabase Studio:
--   1. Functions → process_incoming_call deve estar AUSENTE
--   2. Table Editor → calls → confirmar colunas booking_datetime,
--      number_of_people, call_successful, call_transferred, etc.
--   3. Database → Triggers → verificar trg_calls_05/06/07 em calls
-- ============================================================
