-- Migration 002: Add PCA (Post Call Analysis) fields to calls table
ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS call_summary TEXT,
  ADD COLUMN IF NOT EXISTS call_successful BOOLEAN,
  ADD COLUMN IF NOT EXISTS user_sentiment TEXT CHECK (user_sentiment IN ('positive', 'neutral', 'negative')),
  ADD COLUMN IF NOT EXISTS motivo_transferencia TEXT,
  ADD COLUMN IF NOT EXISTS razao_insucesso TEXT,
  ADD COLUMN IF NOT EXISTS numero_slots_tentados INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS espaco_preferido TEXT;

COMMENT ON COLUMN calls.call_summary IS 'Resumo gerado pelo agente Telnyx no final da chamada';
COMMENT ON COLUMN calls.call_successful IS 'Se a chamada foi resolvida com sucesso pelo agente';
COMMENT ON COLUMN calls.user_sentiment IS 'Sentimento detectado: positive, neutral ou negative';
COMMENT ON COLUMN calls.motivo_transferencia IS 'Razão pela qual a chamada foi transferida para humano';
COMMENT ON COLUMN calls.razao_insucesso IS 'Diagnóstico do agente para chamadas não resolvidas';
COMMENT ON COLUMN calls.numero_slots_tentados IS 'Número de horários tentados antes de confirmação';
COMMENT ON COLUMN calls.espaco_preferido IS 'Espaço preferido pelo cliente: sala/terraço/esplanada';
