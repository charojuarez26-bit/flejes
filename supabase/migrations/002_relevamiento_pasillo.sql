-- ==============================================================================
-- FLEJESPRO SAAS - SUPABASE MIGRATION 002
-- Relevamiento de Precios en Góndola ("Modo Pasillo") & Supabase Storage
-- ==============================================================================

-- 1. CREACIÓN DEL BUCKET DE STORAGE PARA FOTOS DE FLEJES
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos_flejes', 'fotos_flejes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de Storage para fotos_flejes
CREATE POLICY "Permitir subida pública/autenticada de fotos de góndola"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fotos_flejes');

CREATE POLICY "Permitir lectura pública de fotos de góndola"
ON storage.objects FOR SELECT
USING (bucket_id = 'fotos_flejes');

-- 2. TABLA flejes_pendientes PARA REGISTROS DEL CELULAR
CREATE TABLE IF NOT EXISTS flejes_pendientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    branch_id UUID,
    codigo_barra VARCHAR(64) NOT NULL,
    precio_nuevo NUMERIC(12, 2) NOT NULL,
    foto_url TEXT,
    nombre_producto VARCHAR(200),
    estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'incorporado', 'descartado'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Índices para búsqueda ágil
CREATE INDEX IF NOT EXISTS idx_flejes_pendientes_estado ON flejes_pendientes(estado);
CREATE INDEX IF NOT EXISTS idx_flejes_pendientes_barcode ON flejes_pendientes(codigo_barra);
CREATE INDEX IF NOT EXISTS idx_flejes_pendientes_created ON flejes_pendientes(created_at DESC);

-- 3. HABILITACIÓN DE REALTIME PARA NOTIFICACIONES A LA PC
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE flejes_pendientes;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. POLÍTICAS RLS (Permitir lectura e inserción)
ALTER TABLE flejes_pendientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir inserción de relevamientos móviles"
ON flejes_pendientes FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir lectura de relevamientos"
ON flejes_pendientes FOR SELECT
USING (true);

CREATE POLICY "Permitir actualización de nombre/estado desde PC"
ON flejes_pendientes FOR UPDATE
USING (true);
