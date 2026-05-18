-- Migration 001: Add missing values to tipo_chamada enum
ALTER TYPE tipo_chamada ADD VALUE IF NOT EXISTS 'reagendamento';
ALTER TYPE tipo_chamada ADD VALUE IF NOT EXISTS 'cancelamento';
