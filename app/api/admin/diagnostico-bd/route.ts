import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'

const REQUIRED_COLUMNS = [
  'contacto_cliente', 'call_start_at', 'call_end_at', 'call_successful',
  'call_transferred', 'motivo_transferencia', 'razao_insucesso',
  'numero_slots_tentados', 'booking_datetime', 'number_of_people', 'servico',
  'special_requests', 'reserva_id_verdadeira', 'takeaway_pickup_time',
  'takeaway_items', 'takeaway_pessoas', 'ultima_hora_datetime',
  'ultima_hora_pessoas', 'ultima_hora_espaco',
]

const REQUIRED_TRIGGERS = [
  'trg_calls_01_resolve_agent',
  'trg_calls_02_resolve_restaurant',
  'trg_calls_03_resolve_customer',
  'trg_calls_04_resolve_cycle',
  'trg_calls_05_create_booking',
  'trg_calls_06_create_takeaway',
  'trg_calls_07_create_ultima_hora',
  'trg_calls_08_update_customer_counters',
  'trg_calls_09_update_daily_stats',
  'trg_calls_10_update_guarantee',
]

const REQUIRED_VIEWS = [
  'v_calls_enriched',
  'v_bookings_enriched',
  'v_takeaways_enriched',
  'v_ultima_hora_enriched',
  'v_customers_by_restaurant',
  'v_guarantee_status',
  'v_kpis_dashboard',
  'v_cycle_metrics',
  'v_admin_restaurants_overview',
]

// GET /api/admin/diagnostico-bd — returns DB diagnosis
export async function GET() {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const db = createAdminClient()

  const [
    { count: calls_count },
    { count: bookings_count },
    { count: takeaways_count },
    { count: ultima_hora_count },
  ] = await Promise.all([
    db.from('calls').select('*', { count: 'exact', head: true }),
    db.from('bookings').select('*', { count: 'exact', head: true }),
    db.from('takeaway_orders').select('*', { count: 'exact', head: true }),
    db.from('ultima_hora_requests').select('*', { count: 'exact', head: true }),
  ])

  // Check existing columns in calls
  const { data: colRows } = await db
    .from('information_schema.columns' as 'calls')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'calls') as { data: { column_name: string }[] | null }

  const existingColumns = new Set((colRows ?? []).map(r => r.column_name))
  const missing_columns = REQUIRED_COLUMNS.filter(c => !existingColumns.has(c))

  // Check existing triggers
  const { data: trgRows } = await db.rpc('exec_diagnostico_triggers' as never) as { data: { tgname: string }[] | null }
  let missing_triggers: string[]
  if (trgRows) {
    const existingTriggers = new Set(trgRows.map(r => r.tgname))
    missing_triggers = REQUIRED_TRIGGERS.filter(t => !existingTriggers.has(t))
  } else {
    // fallback: assume all missing if rpc not available
    missing_triggers = [...REQUIRED_TRIGGERS]
  }

  // Check views
  const { data: viewRows } = await db
    .from('pg_catalog.pg_views' as 'calls')
    .select('viewname')
    .eq('schemaname', 'public') as { data: { viewname: string }[] | null }

  const existingViews = new Set((viewRows ?? []).map(r => r.viewname))
  const missing_views = REQUIRED_VIEWS.filter(v => !existingViews.has(v))

  // Check if legacy function still exists
  const { data: fnRows } = await db
    .from('pg_catalog.pg_proc' as 'calls')
    .select('proname')
    .eq('proname', 'process_incoming_call') as { data: { proname: string }[] | null }

  const process_incoming_call_exists = (fnRows?.length ?? 0) > 0

  return NextResponse.json({
    calls_count: calls_count ?? 0,
    bookings_count: bookings_count ?? 0,
    takeaways_count: takeaways_count ?? 0,
    ultima_hora_count: ultima_hora_count ?? 0,
    missing_columns,
    missing_triggers,
    missing_views,
    process_incoming_call_exists,
    healthy: missing_columns.length === 0 && missing_triggers.length === 0 && missing_views.length === 0 && !process_incoming_call_exists,
  })
}

// POST /api/admin/diagnostico-bd — applies migration 008
export async function POST(_req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const db = createAdminClient()
  const results: { step: string; ok: boolean; error?: string }[] = []

  async function exec(step: string, sql: string) {
    const { error } = await db.rpc('exec_sql' as never, { sql } as never)
    if (error) {
      results.push({ step, ok: false, error: error.message })
    } else {
      results.push({ step, ok: true })
    }
  }

  // ── BLOCO 1: Colunas em calls ──────────────────────────────────────────
  await exec('add_columns_calls', `
    ALTER TABLE calls
      ADD COLUMN IF NOT EXISTS contacto_cliente TEXT,
      ADD COLUMN IF NOT EXISTS call_start_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS call_end_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS call_successful BOOLEAN,
      ADD COLUMN IF NOT EXISTS call_transferred BOOLEAN,
      ADD COLUMN IF NOT EXISTS motivo_transferencia TEXT,
      ADD COLUMN IF NOT EXISTS razao_insucesso TEXT,
      ADD COLUMN IF NOT EXISTS numero_slots_tentados INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS booking_datetime TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS number_of_people SMALLINT,
      ADD COLUMN IF NOT EXISTS servico TEXT,
      ADD COLUMN IF NOT EXISTS special_requests TEXT,
      ADD COLUMN IF NOT EXISTS reserva_id_verdadeira TEXT,
      ADD COLUMN IF NOT EXISTS takeaway_pickup_time TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS takeaway_items TEXT,
      ADD COLUMN IF NOT EXISTS takeaway_pessoas SMALLINT,
      ADD COLUMN IF NOT EXISTS ultima_hora_datetime TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS ultima_hora_pessoas SMALLINT,
      ADD COLUMN IF NOT EXISTS ultima_hora_espaco TEXT;
  `)

  // ── BLOCO 2: Drop função antiga ────────────────────────────────────────
  await exec('drop_process_incoming_call', `
    DROP FUNCTION IF EXISTS process_incoming_call CASCADE;
  `)

  // ── BLOCO 3: Trigger 5 — criar booking ────────────────────────────────
  await exec('trigger_05_create_booking', `
    CREATE OR REPLACE FUNCTION fn_calls_05_create_booking()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.appointment_booked IS NOT TRUE OR NEW.booking_datetime IS NULL THEN
        RETURN NEW;
      END IF;
      INSERT INTO bookings (
        call_id, restaurant_id, customer_id,
        booking_datetime, number_of_people, servico,
        special_requests, reserva_id_verdadeira, estado
      ) VALUES (
        NEW.id, NEW.restaurant_id, NEW.customer_id,
        NEW.booking_datetime, NEW.number_of_people, COALESCE(NEW.servico, 'desconhecido'),
        NEW.special_requests, NEW.reserva_id_verdadeira, 'confirmada'
      )
      ON CONFLICT DO NOTHING;
      RETURN NEW;
    END;
    $$;
    DROP TRIGGER IF EXISTS trg_calls_05_create_booking ON calls;
    CREATE TRIGGER trg_calls_05_create_booking
      AFTER INSERT ON calls
      FOR EACH ROW EXECUTE FUNCTION fn_calls_05_create_booking();
  `)

  // ── BLOCO 4: Trigger 6 — criar takeaway ───────────────────────────────
  await exec('trigger_06_create_takeaway', `
    CREATE OR REPLACE FUNCTION fn_calls_06_create_takeaway()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.takeaway_order_placed IS NOT TRUE OR NEW.takeaway_pickup_time IS NULL THEN
        RETURN NEW;
      END IF;
      INSERT INTO takeaway_orders (
        call_id, restaurant_id, customer_id,
        pickup_time, items, pessoas, estado,
        expira_em,
        cliente_nome, cliente_phone
      )
      SELECT
        NEW.id, NEW.restaurant_id, NEW.customer_id,
        NEW.takeaway_pickup_time, NEW.takeaway_items, NEW.takeaway_pessoas, 'pendente_restaurante',
        NOW() + INTERVAL '4 hours',
        c.nome, c.phone
      FROM customers c WHERE c.id = NEW.customer_id
      ON CONFLICT DO NOTHING;
      RETURN NEW;
    END;
    $$;
    DROP TRIGGER IF EXISTS trg_calls_06_create_takeaway ON calls;
    CREATE TRIGGER trg_calls_06_create_takeaway
      AFTER INSERT ON calls
      FOR EACH ROW EXECUTE FUNCTION fn_calls_06_create_takeaway();
  `)

  // ── BLOCO 5: Trigger 7 — criar ultima hora ────────────────────────────
  await exec('trigger_07_create_ultima_hora', `
    CREATE OR REPLACE FUNCTION fn_calls_07_create_ultima_hora()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.ultima_hora_solicitada IS NOT TRUE OR NEW.ultima_hora_datetime IS NULL THEN
        RETURN NEW;
      END IF;
      INSERT INTO ultima_hora_requests (
        call_id, restaurant_id, customer_id,
        datetime_solicitado, pessoas, espaco_preferido, estado,
        expira_em,
        cliente_nome, cliente_phone
      )
      SELECT
        NEW.id, NEW.restaurant_id, NEW.customer_id,
        NEW.ultima_hora_datetime, NEW.ultima_hora_pessoas, NEW.ultima_hora_espaco, 'pendente_restaurante',
        NOW() + INTERVAL '4 hours',
        c.nome, c.phone
      FROM customers c WHERE c.id = NEW.customer_id
      ON CONFLICT DO NOTHING;
      RETURN NEW;
    END;
    $$;
    DROP TRIGGER IF EXISTS trg_calls_07_create_ultima_hora ON calls;
    CREATE TRIGGER trg_calls_07_create_ultima_hora
      AFTER INSERT ON calls
      FOR EACH ROW EXECUTE FUNCTION fn_calls_07_create_ultima_hora();
  `)

  // ── BLOCO 6: Views essenciais ─────────────────────────────────────────
  await exec('view_bookings_enriched', `
    CREATE OR REPLACE VIEW v_bookings_enriched
    WITH (security_invoker = true) AS
    SELECT
      b.id, b.call_id, b.restaurant_id, b.customer_id,
      b.booking_datetime, b.number_of_people, b.servico,
      b.special_requests, b.reserva_id_verdadeira, b.estado,
      b.confirmado_em, b.no_show, b.created_at,
      r.nome AS restaurant_nome, r.slug AS restaurant_slug,
      c.nome AS customer_nome, c.phone AS customer_phone
    FROM bookings b
    LEFT JOIN restaurants r ON r.id = b.restaurant_id
    LEFT JOIN customers c ON c.id = b.customer_id;
  `)

  await exec('view_takeaways_enriched', `
    CREATE OR REPLACE VIEW v_takeaways_enriched
    WITH (security_invoker = true) AS
    SELECT
      t.id, t.call_id, t.restaurant_id, t.customer_id,
      t.pickup_time, t.items, t.pessoas, t.estado,
      t.expira_em, t.sms_enviado_restaurante,
      t.confirmado_em, t.rejeitado_em, t.rejeitado_razao,
      t.cliente_nome, t.cliente_phone, t.created_at,
      r.nome AS restaurant_nome, r.slug AS restaurant_slug,
      c.nome AS customer_nome, c.phone AS customer_phone
    FROM takeaway_orders t
    LEFT JOIN restaurants r ON r.id = t.restaurant_id
    LEFT JOIN customers c ON c.id = t.customer_id;
  `)

  await exec('view_ultima_hora_enriched', `
    CREATE OR REPLACE VIEW v_ultima_hora_enriched
    WITH (security_invoker = true) AS
    SELECT
      u.id, u.call_id, u.restaurant_id, u.customer_id,
      u.datetime_solicitado, u.pessoas, u.espaco_preferido, u.estado,
      u.expira_em, u.sms_enviado_restaurante,
      u.confirmado_em, u.rejeitado_em, u.rejeitado_razao,
      u.cliente_nome, u.cliente_phone, u.created_at,
      r.nome AS restaurant_nome, r.slug AS restaurant_slug,
      c.nome AS customer_nome, c.phone AS customer_phone
    FROM ultima_hora_requests u
    LEFT JOIN restaurants r ON r.id = u.restaurant_id
    LEFT JOIN customers c ON c.id = u.customer_id;
  `)

  // ── BLOCO 7: Aplicar migration 008 completa via ficheiro ──────────────
  // Tentar ler e executar o ficheiro de migration completo
  try {
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '008_ensure_complete_schema.sql')
    const sql = readFileSync(migrationPath, 'utf8')
    // Executar em blocos separados por comentários de bloco
    const { error } = await db.rpc('exec_sql' as never, { sql } as never)
    if (error) {
      results.push({ step: 'migration_008_full', ok: false, error: error.message })
    } else {
      results.push({ step: 'migration_008_full', ok: true })
    }
  } catch {
    results.push({ step: 'migration_008_full', ok: false, error: 'Ficheiro não encontrado ou exec_sql RPC não disponível' })
  }

  const allOk = results.every(r => r.ok)
  return NextResponse.json({ ok: allOk, results }, { status: allOk ? 200 : 207 })
}
