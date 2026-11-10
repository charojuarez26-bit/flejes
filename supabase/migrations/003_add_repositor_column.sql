-- ==============================================================================
-- FLEJESPRO SAAS - SUPABASE MIGRATION 003
-- Identificación de Repositores en Cola de Impresión y Relevamiento
-- ==============================================================================

-- 1. Agregar columna 'repositor' a la tabla print_queue (cola de impresión en tiempo real)
ALTER TABLE print_queue 
ADD COLUMN IF NOT EXISTS repositor VARCHAR(120);

-- 2. Agregar columna 'repositor' a la tabla flejes_pendientes (relevamiento móvil)
ALTER TABLE flejes_pendientes 
ADD COLUMN IF NOT EXISTS repositor VARCHAR(120);

-- 3. Crear índices opcionales para filtrado por repositor
CREATE INDEX IF NOT EXISTS idx_print_queue_repositor ON print_queue(repositor);
CREATE INDEX IF NOT EXISTS idx_flejes_pendientes_repositor ON flejes_pendientes(repositor);
