-- Migration 013 — Google Drive Folder Link
-- Remove google_drive_folder_id de clients (sem utilidade neste nível).
-- Renomeia google_drive_folder_id → google_drive_folder_link em restaurants
-- para passar a guardar o link partilhável completo em vez do folder ID raw.

-- 1. Remover coluna de clients
ALTER TABLE clients DROP COLUMN IF EXISTS google_drive_folder_id;

-- 2. Renomear coluna em restaurants
ALTER TABLE restaurants
  RENAME COLUMN google_drive_folder_id TO google_drive_folder_link;

COMMENT ON COLUMN restaurants.google_drive_folder_link IS
  'Link partilhável da pasta Google Drive do restaurante. Ex: https://drive.google.com/drive/folders/...';

-- ============================================================
-- Verificação pós-execução:
--   1. Table Editor → clients → confirmar ausência de google_drive_folder_id
--   2. Table Editor → restaurants → confirmar coluna google_drive_folder_link
--   3. Actualizar manualmente os valores existentes com os links partilháveis reais
-- ============================================================
