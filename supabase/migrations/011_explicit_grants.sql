-- ============================================================
-- MIGRATION 011 — EXPLICIT GRANTS (Data API compatibility)
-- ============================================================
-- Contexto: A partir de Outubro 2026, o Supabase deixa de expor
-- automaticamente as tabelas do schema "public" via Data API
-- (supabase-js / PostgREST). Sem GRANTs explícitos, queries
-- retornam erro 42501.
--
-- Este ficheiro formaliza todos os GRANTs do projecto Nine Calls.
-- Idempotente — pode ser corrido múltiplas vezes sem efeitos laterais.
--
-- Arquitectura de acesso:
--   service_role  → App Admin (/admin) + n8n + API routes admin
--                   Bypassa RLS. Acesso total a tudo.
--   authenticated → Dashboard Cliente (/dashboard)
--                   Sujeito a RLS. Vê apenas os seus dados.
--   anon          → Sem acesso a tabelas. Páginas públicas (/confirm/*)
--                   usam service_role nas API routes (não anon directamente).
-- ============================================================


-- ── 1. TABELAS — service_role ─────────────────────────────────────

GRANT ALL ON clients               TO service_role;
GRANT ALL ON restaurants           TO service_role;
GRANT ALL ON agents                TO service_role;
GRANT ALL ON customers             TO service_role;
GRANT ALL ON billing_cycles        TO service_role;
GRANT ALL ON calls                 TO service_role;
GRANT ALL ON bookings              TO service_role;
GRANT ALL ON takeaway_orders       TO service_role;
GRANT ALL ON ultima_hora_requests  TO service_role;
GRANT ALL ON guarantee_tracking    TO service_role;
GRANT ALL ON daily_stats           TO service_role;
GRANT ALL ON conversoes_manuais    TO service_role;
GRANT ALL ON audit_log             TO service_role;
GRANT ALL ON admin_daily_snapshot  TO service_role;


-- ── 2. TABELAS — authenticated (Dashboard Cliente) ────────────────

GRANT SELECT ON clients            TO authenticated;
GRANT SELECT ON restaurants        TO authenticated;
GRANT SELECT ON agents             TO authenticated;
GRANT SELECT ON customers          TO authenticated;
GRANT SELECT ON billing_cycles     TO authenticated;
GRANT SELECT ON calls              TO authenticated;
GRANT SELECT, UPDATE ON bookings   TO authenticated;
GRANT SELECT ON takeaway_orders    TO authenticated;
GRANT SELECT ON ultima_hora_requests TO authenticated;
GRANT SELECT ON guarantee_tracking TO authenticated;
GRANT SELECT ON daily_stats        TO authenticated;
GRANT SELECT ON conversoes_manuais TO authenticated;

REVOKE ALL ON audit_log            FROM authenticated;
REVOKE ALL ON admin_daily_snapshot FROM authenticated;


-- ── 3. TABELAS — anon ─────────────────────────────────────────────

REVOKE ALL ON clients               FROM anon;
REVOKE ALL ON restaurants           FROM anon;
REVOKE ALL ON agents                FROM anon;
REVOKE ALL ON customers             FROM anon;
REVOKE ALL ON billing_cycles        FROM anon;
REVOKE ALL ON calls                 FROM anon;
REVOKE ALL ON bookings              FROM anon;
REVOKE ALL ON takeaway_orders       FROM anon;
REVOKE ALL ON ultima_hora_requests  FROM anon;
REVOKE ALL ON guarantee_tracking    FROM anon;
REVOKE ALL ON daily_stats           FROM anon;
REVOKE ALL ON conversoes_manuais    FROM anon;
REVOKE ALL ON audit_log             FROM anon;
REVOKE ALL ON admin_daily_snapshot  FROM anon;


-- ── 4. VIEWS — GRANTs condicionais (só se a view existir) ────────
-- Usa DO block para evitar erro 42P01 caso as views ainda não
-- existam no projecto (foram criadas pela migration 008 mas podem
-- não ter sido aplicadas via SQL Editor).

DO $$
DECLARE
  v TEXT;
  client_views TEXT[] := ARRAY[
    'v_calls_enriched',
    'v_bookings_enriched',
    'v_takeaways_enriched',
    'v_ultima_hora_enriched',
    'v_customers_by_restaurant',
    'v_conversoes_manuais_enriched',
    'v_cycle_metrics',
    'v_guarantee_status',
    'v_kpis_dashboard'
  ];
BEGIN
  -- Views do Dashboard Cliente: service_role + authenticated
  FOREACH v IN ARRAY client_views LOOP
    IF EXISTS (
      SELECT 1 FROM pg_views
      WHERE schemaname = 'public' AND viewname = v
    ) THEN
      EXECUTE format('GRANT SELECT ON %I TO service_role', v);
      EXECUTE format('GRANT SELECT ON %I TO authenticated', v);
      EXECUTE format('REVOKE ALL ON %I FROM anon', v);
    END IF;
  END LOOP;

  -- v_admin_restaurants_overview: apenas service_role
  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'v_admin_restaurants_overview'
  ) THEN
    EXECUTE 'GRANT SELECT ON v_admin_restaurants_overview TO service_role';
    EXECUTE 'REVOKE ALL ON v_admin_restaurants_overview FROM authenticated';
    EXECUTE 'REVOKE ALL ON v_admin_restaurants_overview FROM anon';
  END IF;

  -- v_bookings_para_verificar (existe na migration 008, uso interno/admin)
  IF EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public' AND viewname = 'v_bookings_para_verificar'
  ) THEN
    EXECUTE 'GRANT SELECT ON v_bookings_para_verificar TO service_role';
    EXECUTE 'REVOKE ALL ON v_bookings_para_verificar FROM authenticated';
    EXECUTE 'REVOKE ALL ON v_bookings_para_verificar FROM anon';
  END IF;
END $$;


-- ── 5. SEQUÊNCIAS ─────────────────────────────────────────────────

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;


-- ============================================================
-- FIM DA MIGRATION 011
-- ============================================================
--
-- VERIFICAÇÃO pós-execução (correr no SQL Editor):
--
--   SELECT grantee, table_name, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE table_schema = 'public'
--   ORDER BY table_name, grantee;
