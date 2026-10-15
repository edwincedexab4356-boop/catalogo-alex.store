// Complete, battle-tested SQL script for Supabase Database & Storage for AlexStore
export const SUPABASE_SCHEMA_SQL = `-- ========================================================
-- ALEXSTORE - SCRIPT SQL COMPLETO PARA SUPABASE
-- Copia y pega este script en: Supabase Dashboard -> SQL Editor -> Run
-- ========================================================

-- 1. CONCEDER PERMISOS BÁSICOS EN EL ESQUEMA PUBLIC
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. TABLA DE PERFILES
CREATE TABLE IF NOT EXISTS public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nombre TEXT,
  rol TEXT NOT NULL DEFAULT 'admin',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de perfiles" ON public.perfiles;
CREATE POLICY "Lectura de perfiles" ON public.perfiles FOR SELECT TO public USING (TRUE);

DROP POLICY IF EXISTS "Gestión de perfiles" ON public.perfiles;
CREATE POLICY "Gestión de perfiles" ON public.perfiles FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- 3. TABLA DE CATEGORÍAS (Soporte dual activa / activo)
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS activa BOOLEAN DEFAULT TRUE;
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
UPDATE public.categorias SET activo = COALESCE(activa, activo, TRUE), activa = COALESCE(activo, activa, TRUE);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de categorías" ON public.categorias;
CREATE POLICY "Lectura pública de categorías" ON public.categorias FOR SELECT TO public USING (TRUE);

DROP POLICY IF EXISTS "Gestión de categorías" ON public.categorias;
CREATE POLICY "Gestión de categorías" ON public.categorias FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- 4. TABLA DE PRODUCTOS
CREATE TABLE IF NOT EXISTS public.productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  imagen_url TEXT,
  imagenes TEXT[] DEFAULT '{}',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de productos" ON public.productos;
CREATE POLICY "Lectura pública de productos" ON public.productos FOR SELECT TO public USING (TRUE);

DROP POLICY IF EXISTS "Gestión de productos" ON public.productos;
CREATE POLICY "Gestión de productos" ON public.productos FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- 5. TABLA DE INVENTARIO
CREATE TABLE IF NOT EXISTS public.inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL UNIQUE REFERENCES public.productos(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL DEFAULT 10 CHECK (cantidad >= 0),
  stock_minimo INTEGER NOT NULL DEFAULT 3 CHECK (stock_minimo >= 0),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de inventario" ON public.inventario;
CREATE POLICY "Lectura pública de inventario" ON public.inventario FOR SELECT TO public USING (TRUE);

DROP POLICY IF EXISTS "Gestión de inventario" ON public.inventario;
CREATE POLICY "Gestión de inventario" ON public.inventario FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- 6. TABLA DE PEDIDOS & COMPROBANTES (NUEVA)
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  cliente_direccion TEXT,
  metodo_pago TEXT NOT NULL DEFAULT 'yappy',
  comprobante_url TEXT,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  items JSONB NOT NULL DEFAULT '[]',
  notas TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de pedidos" ON public.pedidos;
CREATE POLICY "Lectura de pedidos" ON public.pedidos FOR SELECT TO public USING (TRUE);

DROP POLICY IF EXISTS "Inserción pública de pedidos" ON public.pedidos;
CREATE POLICY "Inserción pública de pedidos" ON public.pedidos FOR INSERT TO public WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Gestión autenticada de pedidos" ON public.pedidos;
CREATE POLICY "Gestión autenticada de pedidos" ON public.pedidos FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- 7. TABLA DE VENTAS & FACTURACIÓN (NUEVA)
CREATE TABLE IF NOT EXISTS public.ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  pedido_id UUID,
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT,
  metodo_pago TEXT NOT NULL DEFAULT 'efectivo',
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  items JSONB NOT NULL DEFAULT '[]',
  tipo TEXT NOT NULL DEFAULT 'web',
  notas TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de ventas autenticada" ON public.ventas;
CREATE POLICY "Lectura de ventas autenticada" ON public.ventas FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Gestión de ventas autenticada" ON public.ventas;
CREATE POLICY "Gestión de ventas autenticada" ON public.ventas FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- 8. STORAGE BUCKETS PARA PRODUCTOS Y COMPROBANTES DE PAGO
-- Habilitar extensión si no está
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear buckets públicos para productos y comprobantes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('productos', 'productos', TRUE, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif']),
  ('comprobantes', 'comprobantes', TRUE, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
  public = TRUE,
  file_size_limit = 15728640,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Habilitar RLS en storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública para imágenes y comprobantes
DROP POLICY IF EXISTS "Acceso público a storage" ON storage.objects;
DROP POLICY IF EXISTS "Imágenes de productos públicas" ON storage.objects;
DROP POLICY IF EXISTS "Lectura pública de storage" ON storage.objects;
CREATE POLICY "Lectura pública de storage" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id IN ('productos', 'comprobantes'));

-- Políticas de subida pública (clientes y admin)
DROP POLICY IF EXISTS "Subida de archivos a productos" ON storage.objects;
DROP POLICY IF EXISTS "Subida pública a storage" ON storage.objects;
CREATE POLICY "Subida pública a storage" ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id IN ('productos', 'comprobantes'));

-- Políticas de actualización
DROP POLICY IF EXISTS "Actualización de imágenes autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Actualización de storage" ON storage.objects;
CREATE POLICY "Actualización de storage" ON storage.objects
  FOR UPDATE
  TO public
  USING (bucket_id IN ('productos', 'comprobantes'))
  WITH CHECK (bucket_id IN ('productos', 'comprobantes'));

-- Políticas de eliminación
DROP POLICY IF EXISTS "Eliminación de imágenes autenticada" ON storage.objects;
DROP POLICY IF EXISTS "Eliminación de storage" ON storage.objects;
CREATE POLICY "Eliminación de storage" ON storage.objects
  FOR DELETE
  TO public
  USING (bucket_id IN ('productos', 'comprobantes'));

-- 9. PERMISOS Y PRIVILEGIOS
GRANT ALL ON TABLE storage.objects TO anon, authenticated, service_role;
GRANT ALL ON TABLE storage.buckets TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pedidos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ventas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.categorias TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.productos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.inventario TO anon, authenticated, service_role;

-- Notificar a PostgREST para recargar la caché de esquema
NOTIFY pgrst, 'reload schema';
`;
