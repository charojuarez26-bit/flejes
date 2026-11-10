-- ==============================================================================
-- FLEJESPRO SAAS - SUPABASE MIGRATION 001
-- Multitenant Architecture, Realtime Print Queue & White Label Branding
-- ==============================================================================

-- 1. EXTENSIONES Y ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'supervisor', 'operator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE promo_type AS ENUM ('none', 'strikethrough', 'two_for_one', 'second_50', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE print_status AS ENUM ('pending', 'printed', 'discarded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE print_source AS ENUM ('manual', 'bulk_import', 'scanner_mobile', 'price_change_auto');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE print_mode AS ENUM ('a4_sheet', 'thermal_58mm', 'thermal_80mm');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. ORGANIZACIONES (TENANTS - MARCA BLANCA)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#0f172a',
    accent_color VARCHAR(7) DEFAULT '#f59e0b',
    header_title VARCHAR(100) DEFAULT 'SUPERMERCADO',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SUCURSALES (BRANCHES)
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PERFILES DE USUARIOS VINCULADOS A SUPABASE AUTH
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    default_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    full_name VARCHAR(120) NOT NULL,
    role user_role NOT NULL DEFAULT 'operator',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CATÁLOGO MAESTRO DE ARTÍCULOS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    barcode VARCHAR(48) NOT NULL, -- Código de barras EAN-13 o interno
    internal_sku VARCHAR(48),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(80),
    box_quantity VARCHAR(30), -- Ej: "x 24 u."
    unit_measure VARCHAR(20) DEFAULT 'un',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_org_barcode UNIQUE (organization_id, barcode)
);

-- 6. PRECIOS Y PROMOCIONES POR SUCURSAL
CREATE TABLE IF NOT EXISTS branch_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    current_price NUMERIC(12, 2) NOT NULL,
    previous_price NUMERIC(12, 2),
    promo_type promo_type DEFAULT 'none',
    promo_detail VARCHAR(100),
    updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_branch_product UNIQUE (branch_id, product_id)
);

-- 7. COLA DE IMPRESIÓN (REALTIME HABILITADO)
CREATE TABLE IF NOT EXISTS print_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    current_price NUMERIC(12, 2) NOT NULL,
    previous_price NUMERIC(12, 2),
    promo_type promo_type DEFAULT 'none',
    box_quantity VARCHAR(30),
    quantity INTEGER DEFAULT 1,
    status print_status DEFAULT 'pending',
    source print_source DEFAULT 'manual',
    preferred_mode print_mode DEFAULT 'a4_sheet',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    printed_at TIMESTAMPTZ
);

-- ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_products_org_barcode ON products(organization_id, barcode);
CREATE INDEX IF NOT EXISTS idx_branch_prices_branch ON branch_prices(branch_id, product_id);
CREATE INDEX IF NOT EXISTS idx_print_queue_pending ON print_queue(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);

-- 8. TRIGGER DE CAMBIO DE PRECIO -> NOTIFICACIÓN AUTOMÁTICA A COLA DE IMPRESIÓN
CREATE OR REPLACE FUNCTION notify_price_change_to_queue()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el precio actual cambia respecto al anterior
    IF (OLD.current_price IS DISTINCT FROM NEW.current_price) THEN
        INSERT INTO print_queue (
            organization_id,
            branch_id,
            product_id,
            current_price,
            previous_price,
            promo_type,
            quantity,
            status,
            source,
            created_by
        ) VALUES (
            NEW.organization_id,
            NEW.branch_id,
            NEW.product_id,
            NEW.current_price,
            OLD.current_price,
            NEW.promo_type,
            1,
            'pending',
            'price_change_auto',
            NEW.updated_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_price_change_queue ON branch_prices;
CREATE TRIGGER trg_price_change_queue
AFTER UPDATE ON branch_prices
FOR EACH ROW
EXECUTE FUNCTION notify_price_change_to_queue();

-- 9. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_queue ENABLE ROW LEVEL SECURITY;

-- FUNCIÓN HELPER PARA RLS (Retorna el organization_id del usuario logueado)
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- POLÍTICAS RLS BÁSICAS
-- (Los usuarios solo ven y modifican registros de su propia organización)
CREATE POLICY org_isolation_products ON products
    FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY org_isolation_branches ON branches
    FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY org_isolation_branch_prices ON branch_prices
    FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY org_isolation_print_queue ON print_queue
    FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY org_isolation_profiles ON profiles
    FOR ALL USING (organization_id = get_user_org_id());

CREATE POLICY org_isolation_organizations ON organizations
    FOR ALL USING (id = get_user_org_id());

-- 10. PUBLICACIÓN EN SUPABASE REALTIME
-- Agrega print_queue a supabase_realtime para permitir WebSockets
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE print_queue;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
