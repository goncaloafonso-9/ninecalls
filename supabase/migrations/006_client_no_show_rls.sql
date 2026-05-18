-- Migration 006: Remove client ability to mark no-show; make bookings read-only for clients
REVOKE UPDATE ON TABLE bookings FROM authenticated;

DROP POLICY IF EXISTS "client_can_update_booking_estado" ON bookings;

-- Ensure read-only select policy exists for clients
CREATE POLICY "client_read_only_bookings"
  ON bookings FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM restaurant_users
      WHERE user_id = auth.uid()
    )
  );
