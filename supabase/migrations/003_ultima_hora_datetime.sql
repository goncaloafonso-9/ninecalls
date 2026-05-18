-- Migration 003: Add datetime field to ultima_hora_requests
ALTER TABLE ultima_hora_requests
  ADD COLUMN IF NOT EXISTS ultima_hora_datetime TIMESTAMPTZ;

COMMENT ON COLUMN ultima_hora_requests.ultima_hora_datetime IS 'Datetime ISO 8601 da mesa de última hora solicitada';
