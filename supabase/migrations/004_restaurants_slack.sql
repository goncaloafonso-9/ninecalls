-- Migration 004: Add Slack channel fields to restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS slack_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS slack_channel_name TEXT;

COMMENT ON COLUMN restaurants.slack_channel_id IS 'ID do canal Slack (ex: C0123456789) criado no onboarding';
COMMENT ON COLUMN restaurants.slack_channel_name IS 'Nome do canal Slack (ex: restaurante-slug)';
