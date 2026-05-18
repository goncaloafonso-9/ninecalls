-- Migration 009: Fix conflicting bookings RLS policy from migration 006
-- The client_read_only_bookings policy references restaurant_users which does not exist,
-- causing queries to fail for authenticated client users.
-- The correct policy rls_bookings_select (from migration 008) uses fn_current_client_id() and is sufficient.

DROP POLICY IF EXISTS client_read_only_bookings ON bookings;

-- Ensure the correct policies exist (idempotent)
DROP POLICY IF EXISTS rls_bookings_select ON bookings;
CREATE POLICY rls_bookings_select ON bookings
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE client_id = fn_current_client_id())
  );

DROP POLICY IF EXISTS rls_takeaway_orders_select ON takeaway_orders;
CREATE POLICY rls_takeaway_orders_select ON takeaway_orders
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE client_id = fn_current_client_id())
  );

DROP POLICY IF EXISTS rls_ultima_hora_requests_select ON ultima_hora_requests;
CREATE POLICY rls_ultima_hora_requests_select ON ultima_hora_requests
  FOR SELECT USING (
    restaurant_id IN (SELECT id FROM restaurants WHERE client_id = fn_current_client_id())
  );
