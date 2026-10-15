-- =========================================================================
-- ALEXSTORE: SCRIPT DE MIGRACIÓN COMPLETA Y BASE DE DATOS
-- Incluye: Tablas, Storage (productos y comprobantes), RLS, Políticas, Permisos
-- y los 48 Productos con Precios, Imágenes y Stock existentes.
-- =========================================================================

-- 1. CONCEDER PERMISOS INICIALES EN EL ESQUEMA PUBLIC
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. TABLA DE PERFILES DE USUARIO
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nombre TEXT,
    rol TEXT NOT NULL DEFAULT 'admin',
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de perfiles" ON public.perfiles;
CREATE POLICY "Permitir lectura de perfiles" ON public.perfiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir gestión de perfiles autenticados" ON public.perfiles;
CREATE POLICY "Permitir gestión de perfiles autenticados" ON public.perfiles FOR ALL USING (auth.uid() = id);

-- 3. TABLA DE CATEGORÍAS
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    imagen_url TEXT,
    activa BOOLEAN NOT NULL DEFAULT true,
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS activa BOOLEAN DEFAULT true;
ALTER TABLE public.categorias ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
UPDATE public.categorias SET activo = COALESCE(activa, activo, true), activa = COALESCE(activo, activa, true);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura pública de categorías" ON public.categorias;
CREATE POLICY "Permitir lectura pública de categorías" ON public.categorias FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir gestión completa de categorías" ON public.categorias;
CREATE POLICY "Permitir gestión completa de categorías" ON public.categorias FOR ALL USING (true) WITH CHECK (true);

-- 4. TABLA DE PRODUCTOS
CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio NUMERIC(15, 2) NOT NULL DEFAULT 0,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    imagen_url TEXT,
    imagenes TEXT[] DEFAULT '{}',
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura pública de productos" ON public.productos;
CREATE POLICY "Permitir lectura pública de productos" ON public.productos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir gestión completa de productos" ON public.productos;
CREATE POLICY "Permitir gestión completa de productos" ON public.productos FOR ALL USING (true) WITH CHECK (true);

-- 5. TABLA DE INVENTARIO
CREATE TABLE IF NOT EXISTS public.inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL UNIQUE REFERENCES public.productos(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL DEFAULT 10 CHECK (cantidad >= 0),
    stock_minimo INTEGER NOT NULL DEFAULT 3 CHECK (stock_minimo >= 0),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura pública de inventario" ON public.inventario;
CREATE POLICY "Permitir lectura pública de inventario" ON public.inventario FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir gestión completa de inventario" ON public.inventario;
CREATE POLICY "Permitir gestión completa de inventario" ON public.inventario FOR ALL USING (true) WITH CHECK (true);

-- 6. TABLA DE PEDIDOS (Con comprobante y datos del cliente)
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT NOT NULL,
    cliente_direccion TEXT,
    metodo_pago TEXT NOT NULL DEFAULT 'yappy',
    comprobante_url TEXT,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    notas TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de pedidos" ON public.pedidos;
CREATE POLICY "Permitir lectura de pedidos" ON public.pedidos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir creación de pedidos" ON public.pedidos;
CREATE POLICY "Permitir creación de pedidos" ON public.pedidos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir actualización de pedidos" ON public.pedidos;
CREATE POLICY "Permitir actualización de pedidos" ON public.pedidos FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Permitir eliminación de pedidos" ON public.pedidos;
CREATE POLICY "Permitir eliminación de pedidos" ON public.pedidos FOR DELETE USING (true);

-- 7. TABLA DE VENTAS (Panel de ventas web y manuales)
CREATE TABLE IF NOT EXISTS public.ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
    cliente_nombre TEXT NOT NULL,
    cliente_telefono TEXT,
    metodo_pago TEXT NOT NULL DEFAULT 'transferencia',
    total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    tipo TEXT NOT NULL DEFAULT 'web',
    notas TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura de ventas" ON public.ventas;
CREATE POLICY "Permitir lectura de ventas" ON public.ventas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Permitir gestión de ventas" ON public.ventas;
CREATE POLICY "Permitir gestión de ventas" ON public.ventas FOR ALL USING (true) WITH CHECK (true);

-- 8. STORAGE BUCKETS (PRODUCTOS Y COMPROBANTES DE PAGO)
CREATE SCHEMA IF NOT EXISTS storage;

-- Crear buckets con acceso público para mostrar fotos y comprobantes en pedidos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('productos', 'productos', true, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif']),
  ('comprobantes', 'comprobantes', true, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/gif', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 15728640,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Lectura pública para que clientes y admin puedan ver fotos y comprobantes
DROP POLICY IF EXISTS "Lectura pública de storage" ON storage.objects;
DROP POLICY IF EXISTS "Acceso público a storage" ON storage.objects;
DROP POLICY IF EXISTS "Imágenes de productos públicas" ON storage.objects;
CREATE POLICY "Lectura pública de storage" ON storage.objects
FOR SELECT
TO public
USING (bucket_id IN ('productos', 'comprobantes'));

-- Subida permitida para clientes (comprobantes en checkout) y administrador (imágenes de producto)
DROP POLICY IF EXISTS "Subida pública a storage" ON storage.objects;
DROP POLICY IF EXISTS "Subida de archivos a storage" ON storage.objects;
DROP POLICY IF EXISTS "Subida de archivos a productos" ON storage.objects;
CREATE POLICY "Subida pública a storage" ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id IN ('productos', 'comprobantes'));

-- Actualización permitida
DROP POLICY IF EXISTS "Actualización de storage" ON storage.objects;
CREATE POLICY "Actualización de storage" ON storage.objects
FOR UPDATE
TO public
USING (bucket_id IN ('productos', 'comprobantes'))
WITH CHECK (bucket_id IN ('productos', 'comprobantes'));

-- Eliminación permitida
DROP POLICY IF EXISTS "Eliminación de storage" ON storage.objects;
CREATE POLICY "Eliminación de storage" ON storage.objects
FOR DELETE
TO public
USING (bucket_id IN ('productos', 'comprobantes'));

-- Permisos de Storage
GRANT ALL ON TABLE storage.objects TO anon, authenticated, service_role;
GRANT ALL ON TABLE storage.buckets TO anon, authenticated, service_role;

-- 9. PERMISOS DE TABLAS
GRANT ALL ON TABLE public.categorias TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.productos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.inventario TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pedidos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ventas TO anon, authenticated, service_role;

-- =========================================================================
-- 10. CARGA DE DATOS: CATEGORÍAS EXISTENTES (4)
-- =========================================================================
INSERT INTO public.categorias (id, nombre, descripcion, imagen_url, activa, activo, creado_en)
VALUES ('c2d9d965-19ed-4903-b3e1-e49e542d503f', 'Nba temporada actual', NULL, NULL, true, true, '2026-10-01T22:19:38.475451+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  imagen_url = EXCLUDED.imagen_url,
  activa = EXCLUDED.activa,
  activo = EXCLUDED.activo;

INSERT INTO public.categorias (id, nombre, descripcion, imagen_url, activa, activo, creado_en)
VALUES ('66ab239d-f1eb-4578-a917-bc338d2f1b97', 'Camisetas del Real Madrid', 'Equipacion del Real Madrid', NULL, true, true, '2026-10-02T00:17:25.998246+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  imagen_url = EXCLUDED.imagen_url,
  activa = EXCLUDED.activa,
  activo = EXCLUDED.activo;

INSERT INTO public.categorias (id, nombre, descripcion, imagen_url, activa, activo, creado_en)
VALUES ('0eafa76a-6c1a-4394-8816-97044404f229', 'Camiseta del Barcelona', NULL, NULL, true, true, '2026-10-02T13:00:49.616036+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  imagen_url = EXCLUDED.imagen_url,
  activa = EXCLUDED.activa,
  activo = EXCLUDED.activo;

INSERT INTO public.categorias (id, nombre, descripcion, imagen_url, activa, activo, creado_en)
VALUES ('46697972-9a74-4356-b292-8d66db46fe33', 'Camiseta del fútbol', NULL, NULL, true, true, '2026-10-07T23:24:00.366211+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  imagen_url = EXCLUDED.imagen_url,
  activa = EXCLUDED.activa,
  activo = EXCLUDED.activo;

-- =========================================================================
-- 11. CARGA DE DATOS: PRODUCTOS EXISTENTES (48)
-- =========================================================================
INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('b79e6014-f0d8-46bb-8281-5b7a58a71756', 'thunder', 'entrega inmediata', 45, NULL, 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894695105_thunder_n2t4d2.jfif', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894695105_thunder_n2t4d2.jfif', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894695716_thunder1_92a0lh.jfif']::text[], true, '2026-10-01T22:44:56.414306+00:00', '2026-10-01T22:44:56.414306+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('2b665c8e-28fe-4630-a375-e69319193a79', 'spurs', 'entrega inmediata', 45, NULL, 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894734489_spurs_jg444z.jfif', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894734489_spurs_jg444z.jfif', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894735091_spurs1_9qd4c3.jfif']::text[], true, '2026-10-01T22:45:35.705858+00:00', '2026-10-01T22:49:51.161+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('19758a53-472a-4767-a277-378f0730976e', 'Sixer', 'entrega inmediata', 45, NULL, 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894765570_sixer_ope1op.jfif', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894765570_sixer_ope1op.jfif', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894766475_sixer1_zzpbmk.jfif']::text[], true, '2026-10-01T22:46:07.153558+00:00', '2026-10-01T22:49:56.673+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('c3cdec9a-eacb-417e-8d90-c8a5fb115769', 'philadelphia', 'entrega inmediata', 45, NULL, 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894855896_phila_w0rpf9.jfif', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894855896_phila_w0rpf9.jfif', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894856668_phila1_24zk7o.jfif']::text[], true, '2026-10-01T22:47:37.332584+00:00', '2026-10-01T22:50:09.329+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('dda18850-a4ca-4100-a21c-ba32104b5e81', 'philadelphia(gris)', 'entrega inmediata', 45, NULL, 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894899720_phila_blanco__x58yvd.jfif', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894899720_phila_blanco__x58yvd.jfif', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894900522_phila_blanco_1_-_copia_swjg5m.jfif']::text[], true, '2026-10-01T22:48:21.256583+00:00', '2026-10-01T22:50:15.385+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('e6eddce9-6e91-421c-9900-144af799eea8', 'philadelphia(azul)', 'entrega inmediata', 45, NULL, 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894937521_phila_azul__h09r4x.jfif', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894937521_phila_azul__h09r4x.jfif', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894938211_phila_azul_1_pl22w5.jfif']::text[], true, '2026-10-01T22:48:58.857382+00:00', '2026-10-01T22:50:20.097+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('1f1e0ac9-aed0-4256-b2f3-71a9a9483911', 'NEW YORK', 'entrega inmediata', 45, NULL, 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894982924_ney_york_azul__iwc8nr.jfif', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894982924_ney_york_azul__iwc8nr.jfif', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894983796_ney_york_azul_1_e7rur8.jfif']::text[], true, '2026-10-01T22:49:44.456181+00:00', '2026-10-01T22:50:23.722+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('c52a1b33-2d91-4aa1-958f-b3945d65e0d6', 'new york (blanco )', 'entrega inmediata', 42, NULL, 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790895058409_new_york_4hw4qn.jfif', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790895058409_new_york_4hw4qn.jfif', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790895059035_new_york1_ifu9tm.jfif']::text[], true, '2026-10-01T22:50:59.712597+00:00', '2026-10-01T22:51:01.809+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('9eedb393-b559-4794-ab6d-23fd67334990', 'miami(negro)', 'entrega inmediata', 45, NULL, 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790895094873_miami_negro__uxvpb0.jfif', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790895094873_miami_negro__uxvpb0.jfif', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790895095453_miami_negro_1_fxab4i.jfif']::text[], true, '2026-10-01T22:51:36.087316+00:00', '2026-10-01T22:51:36.087316+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('e9f6ed52-6cd7-4b54-896b-c731d82e0638', 'heat', 'entrega inmediata', 45, NULL, 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790895124649_heat_pmym6e.jfif', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790895124649_heat_pmym6e.jfif', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790895125268_heat1_0iz8x0.jfif']::text[], true, '2026-10-01T22:52:06.145515+00:00', '2026-10-01T22:52:11.041+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('729857d6-cd98-4cb9-9ba5-b7402b4c30ea', 'Miami (rojo)', 'entrega inmediata', 45, NULL, 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790895189906_miami_kj1keo.jfif', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790895189906_miami_kj1keo.jfif', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790895190702_miami_1_q4cb5l.jfif']::text[], true, '2026-10-01T22:53:11.365649+00:00', '2026-10-01T22:53:20.994+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('0c7f642f-3237-49b8-a5b6-cf7e06a428a3', 'san antonio', 'entrega inmediata', 45, NULL, 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894812993_san_antonio_a9zx6u.jfif', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894812993_san_antonio_a9zx6u.jfif', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790894813632_san_antonio1_3u8lpz.jfif']::text[], true, '2026-10-01T22:46:54.358283+00:00', '2026-10-01T22:53:30.45+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('b4c38317-f000-439a-8003-e9a832d9fdda', 'Camiseta del Real Madrid (Blanca26/27) Dorsal 10 Mbappe', 'Recomendable pedir una talla Más
Tallas 
S:1
M:2
2XL :1', 48, '66ab239d-f1eb-4578-a917-bc338d2f1b97', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790900997152_1000015471_2hhoz1.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790900997152_1000015471_2hhoz1.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790900999573_1000015475_s24vn0.jpg']::text[], true, '2026-10-02T00:29:59.271604+00:00', '2026-10-02T00:31:21.988+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('2fd96ae2-4e8d-4198-a273-052578f7f97e', 'Camiseta del Real Madrid (Blanca 26/27)Dorsal 5 Bellingham', 'Recomendable pedir una talla Más
Tallas
S:1
M:2
2XL:1', 48, '66ab239d-f1eb-4578-a917-bc338d2f1b97', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790900820369_1000015527_9rxgpk.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790900820369_1000015527_9rxgpk.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790900821347_1000015363_ctuyuo.jpg']::text[], true, '2026-10-02T00:27:02.626175+00:00', '2026-10-02T00:31:40.313+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('f5b5b2d9-f253-41bb-98d9-8726bc23ae65', 'Camiseta del Real Madrid manga larga (26/27) Dorsal 10 Mbappe', 'Preferencia pedir una talla Más
Tallas
S:1
M:1
XL:1', 48, '66ab239d-f1eb-4578-a917-bc338d2f1b97', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790901456136_1000015467_27k0z9.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790901456136_1000015467_27k0z9.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790901457120_1000015482_kajjvh.jpg']::text[], true, '2026-10-02T00:37:37.061586+00:00', '2026-10-02T00:37:37.061586+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('a8d627f4-0c2c-4dd7-a934-b8fba8656ac9', 'Camiseta del Real Madrid ( Blanca 26/27) Dorsal 7 Vini Jr.', 'Preferencia pedir una talla Más
Tallas
S:3
M:2
L:2
XL:1
2XL :2', 48, '66ab239d-f1eb-4578-a917-bc338d2f1b97', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790901658038_1000015397_nrfkz3.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790901658038_1000015397_nrfkz3.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790901659046_1000015478_29ii0m.jpg']::text[], true, '2026-10-02T00:40:58.904648+00:00', '2026-10-02T00:40:58.904648+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('c5b2a371-6250-4334-b68d-2bb3bdc7ad7e', 'Camiseta del Real Madrid Manga larga (Verde 26/27) Dorsal 10 Mbappe', 'Corren a la talla
XL:1', 50, '66ab239d-f1eb-4578-a917-bc338d2f1b97', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790902232825_1000015415_eoxisv.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790902232825_1000015415_eoxisv.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790902233622_1000015449_bz454a.jpg']::text[], true, '2026-10-02T00:50:33.559896+00:00', '2026-10-02T00:50:33.559896+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('897c1242-1a3f-4a45-957b-6dbfa4a9c761', 'Camiseta del Real Madrid segunda equipacion (Verde 26/27) Dorsal 10 Mbappe', 'Las tallas corren chicas
S:0
M:2
L:3
4XL:1', 50, '66ab239d-f1eb-4578-a917-bc338d2f1b97', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790902584988_1000015411_ckl112.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790902584988_1000015411_ckl112.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790902585878_1000015460_bhi1mv.jpg']::text[], true, '2026-10-02T00:56:25.618233+00:00', '2026-10-02T01:00:46.47+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('3e0496bd-10a3-4e6b-9490-daac7b148fc3', 'Camiseta del Real Madrid tercera equipacion (Rosada 26/27)Dorsal 10 Mbappe', 'Tallas
S:1
M:1
L:1', 50, '66ab239d-f1eb-4578-a917-bc338d2f1b97', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790903072360_1000015520_xfm5c2.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790903072360_1000015520_xfm5c2.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790903073304_1000015501_aiuslx.jpg']::text[], true, '2026-10-02T01:04:33.288626+00:00', '2026-10-02T01:04:33.288626+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('132255d4-f60d-4333-a0b9-994a58dc74fc', 'Camiseta del Barcelona primera equipacion (26/27) Dorsal 10 Lamine Yamal', 'Las tallas corren chicas
Tallas
S:2
M:3
L:1
XL :1
2XL :2
3XL:2', 48, '0eafa76a-6c1a-4394-8816-97044404f229', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790946258237_1000015623_yh50ze.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790946258237_1000015623_yh50ze.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790946260196_1000015604_ep900n.jpg']::text[], true, '2026-10-02T13:04:20.646741+00:00', '2026-10-02T13:04:20.646741+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('a8fbb6a9-8d3a-41ec-a771-b7b8d98bdd23', 'Camiseta del Barcelona primera equipacion (26/27) Dorsal 11 Raphinha', NULL, 48, '0eafa76a-6c1a-4394-8816-97044404f229', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790946529644_1000015608_4ws5hs.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790946529644_1000015608_4ws5hs.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1790946530974_1000015610_v5as4x.jpg']::text[], true, '2026-10-02T13:08:52.32464+00:00', '2026-10-02T13:08:52.32464+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('f2e5d400-5755-449e-8353-6be590c8d499', 'Camiseta del Barcelona tercera equipacion (26/27) Dorsal 10 Lamine Yamal', 'La entrega es inmediata', 50, '0eafa76a-6c1a-4394-8816-97044404f229', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791039973997_1000015726_va9ob5.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791039973997_1000015726_va9ob5.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791039975328_1000015733_g5f9e8.jpg']::text[], true, '2026-10-03T15:06:15.726018+00:00', '2026-10-03T15:08:18.269+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('286f69b8-3c45-43aa-9c16-f3fd6d49dcae', 'Camiseta del Barcelona según equipacion (26/27) Dorsal 10 Lamine Yamal', 'Versión jugador
Las tallas corren chicas', 50, '0eafa76a-6c1a-4394-8816-97044404f229', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791040269890_1000015730_xxtxns.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791040269890_1000015730_xxtxns.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791040270524_1000015686_wrvbrz.jpg']::text[], true, '2026-10-03T15:11:10.50947+00:00', '2026-10-03T15:11:10.50947+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('f32a9723-2ab4-4ab5-9f98-d71570646af5', 'Camiseta del Barcelona segúnda equipacion (26/27) Dorsal 11 Raphinha', NULL, 50, '0eafa76a-6c1a-4394-8816-97044404f229', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791040359208_1000015730_ai6ypp.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791040359208_1000015730_ai6ypp.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791040359667_1000015711_j41q9g.jpg']::text[], true, '2026-10-03T15:12:39.791948+00:00', '2026-10-03T15:12:39.791948+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('9222ad43-0fd7-4f69-ba14-4758622073e1', 'Camiseta del Barcelona segúnda equipacion (26/27) Dorsal 8 Pedri', NULL, 50, '0eafa76a-6c1a-4394-8816-97044404f229', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791040404229_1000015730_vfxr0w.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791040404229_1000015730_vfxr0w.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791040405194_1000015688_x52q8u.jpg']::text[], true, '2026-10-03T15:13:31.134765+00:00', '2026-10-03T15:13:31.134765+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('62006d0d-4e59-4a30-99f1-13fdfca62e15', 'Camiseta de Los Angeles OHTANI', 'Tallas desde S a XL', 50, 'c2d9d965-19ed-4903-b3e1-e49e542d503f', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791324990803_1000016214_kqii1e.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791324990803_1000016214_kqii1e.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791324991705_1000016207_5wutyh.jpg']::text[], true, '2026-10-06T22:16:32.84599+00:00', '2026-10-06T22:16:32.84599+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('85221c3d-1fc7-4974-89d2-e7fc1753cb57', 'Camiseta de Los Angeles Dodgers OHTANI', 'Tallas desde S a XL', 50, 'c2d9d965-19ed-4903-b3e1-e49e542d503f', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791325075244_1000016165_s5b14f.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791325075244_1000016165_s5b14f.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791325076240_1000016121_xhtd5m.jpg']::text[], true, '2026-10-06T22:17:57.60021+00:00', '2026-10-06T22:17:57.60021+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('40c85879-87a7-4903-b5dc-f48ea8fe26ca', 'Camiseta de Los Boston Ortiz', 'Tallas desde S a XL', 50, 'c2d9d965-19ed-4903-b3e1-e49e542d503f', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791325173491_1000016193_omonrm.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791325173491_1000016193_omonrm.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791325174361_1000016144_vevlxd.jpg']::text[], true, '2026-10-06T22:19:35.121563+00:00', '2026-10-06T22:19:35.121563+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('a8746955-086e-4c98-b290-5334de82b37f', 'Camiseta de Los Angeles Dodgers Dorsal 72', 'Tallas desde S a XL', 50, 'c2d9d965-19ed-4903-b3e1-e49e542d503f', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791325244228_1000016151_7oj1um.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791325244228_1000016151_7oj1um.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791325246167_1000016218_pedjxu.jpg']::text[], true, '2026-10-06T22:20:47.63559+00:00', '2026-10-06T22:20:47.63559+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('eb96d4ba-f871-49b1-859a-ee030e668f94', 'Camiseta de Los Angeles Dodgers Judge Dorsal 99', NULL, 50, 'c2d9d965-19ed-4903-b3e1-e49e542d503f', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791325305267_1000016117_qt8z0k.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791325305267_1000016117_qt8z0k.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791325306356_1000016172_ed8x5r.jpg']::text[], true, '2026-10-06T22:21:47.026296+00:00', '2026-10-06T22:21:47.026296+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('b4cd97b1-b94c-4433-892d-f9647c41ab34', 'Camiseta de Los Braves Acuña Jr. Dorsal 13', NULL, 50, 'c2d9d965-19ed-4903-b3e1-e49e542d503f', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791325608600_1000016158_irfcr9.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791325608600_1000016158_irfcr9.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791325609772_1000016179_azpf9v.jpg']::text[], true, '2026-10-06T22:26:51.080673+00:00', '2026-10-06T22:26:51.080673+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('b1e38894-7338-40a1-ba0f-f367bc20432c', 'Camiseta del Bayer de Múnich Dorsal 9 Harry Kane', NULL, 50, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791415637694_1000015933_vhoq4v.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791415637694_1000015933_vhoq4v.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791415639106_1000015896_d6h0mk.jpg']::text[], true, '2026-10-07T23:27:29.912879+00:00', '2026-10-07T23:27:29.912879+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('f7319852-c590-479d-a321-42c90b343e0d', 'Camiseta de Manchester united Dorsal 8 B. Fernándes', NULL, 50, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791415782181_1000015926_3eb6kl.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791415782181_1000015926_3eb6kl.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791415782746_1000015929_gt3djt.jpg']::text[], true, '2026-10-07T23:29:45.782774+00:00', '2026-10-07T23:29:45.782774+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('cfddc339-a8b8-40e6-a764-f93b9da31c17', 'Camiseta del Manchester City', NULL, 50, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791415835554_1000015842_nbg0hm.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791415835554_1000015842_nbg0hm.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791415839053_1000015817_6c79yy.jpg']::text[], true, '2026-10-07T23:30:42.347195+00:00', '2026-10-07T23:30:42.347195+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('1760689e-0949-4b9a-8d21-8c1fed89be7d', 'Camisa del Beyern Múnchen Dorsal 17 Olise', NULL, 50, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791415918191_1000015858_cs4sfj.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791415918191_1000015858_cs4sfj.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791415919038_1000015824_dghj3j.jpg']::text[], true, '2026-10-07T23:32:01.115443+00:00', '2026-10-07T23:32:01.115443+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('ebc2d350-09a3-437a-9f94-50189b9ba394', 'Camiseta del París Saint-Germán Dorsal 14 D. Doue', NULL, 50, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791415995322_1000015918_mbcmv4.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791415995322_1000015918_mbcmv4.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791415998469_1000015846_m5on47.jpg']::text[], true, '2026-10-07T23:33:20.745002+00:00', '2026-10-07T23:33:20.745002+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('9d58643a-9eef-48cd-b790-941933ca2fde', 'Camiseta del Liverpool FC', NULL, 50, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791416082383_1000015866_7lud0m.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791416082383_1000015866_7lud0m.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791416086555_1000015910_k8xgus.jpg']::text[], true, '2026-10-07T23:34:58.040258+00:00', '2026-10-07T23:34:58.040258+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('880af32c-8451-4522-91b2-9e188f058619', 'Camiseta de ACM Dorsal 14 Modric', NULL, 50, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791416240758_1000015851_09pfxd.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791416240758_1000015851_09pfxd.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791416241793_1000015836_hzubpj.jpg']::text[], true, '2026-10-07T23:37:23.78831+00:00', '2026-10-07T23:37:23.78831+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('ce3da4e4-4255-4708-aa17-3ca40f6f10a9', 'Camiseta del ajax', NULL, 50, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791416277651_1000015832_jk7zvs.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791416277651_1000015832_jk7zvs.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791416278447_1000015886_simcot.jpg']::text[], true, '2026-10-07T23:38:00.555447+00:00', '2026-10-07T23:38:00.555447+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('2bc46ed0-1a6e-4cd9-b13a-61dec86d6570', 'Camisa del París Saint-Germán Dorsal 10 Dembele', NULL, 50, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791416357016_1000015876_bzin0v.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791416357016_1000015876_bzin0v.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791416358341_1000015840_sopenw.jpg']::text[], true, '2026-10-07T23:39:20.36036+00:00', '2026-10-07T23:39:20.36036+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('e63f80ab-8f24-420b-8e16-c51526bb3911', 'Camiseta del Liverpool FC', NULL, 50, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791416406230_1000015922_mraegb.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791416406230_1000015922_mraegb.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791416407189_1000015906_4qlqjs.jpg']::text[], true, '2026-10-07T23:40:09.241929+00:00', '2026-10-07T23:40:09.241929+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('1537a772-7ee5-43ca-aa55-dcde5eae848e', 'Camiseta de Panamá Dorsal 8 Carrasquilla', NULL, 40, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791942277434_1000016564_nj09oq.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791942277434_1000016564_nj09oq.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791942278537_1000016549_lh1d6o.jpg']::text[], true, '2026-10-14T01:44:40.578153+00:00', '2026-10-14T01:44:40.578153+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('62e90086-0497-40ca-8998-c5b4ea60bb22', 'Camiseta de Panamá Dorsal 15 Erick Davis', NULL, 40, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791942330028_1000016564_u8fxp9.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791942330028_1000016564_u8fxp9.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791942330952_1000016555_0tzk7y.jpg']::text[], true, '2026-10-14T01:45:32.986993+00:00', '2026-10-14T01:45:32.986993+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('00bbf950-8b98-49d7-a9a5-1cb2658c167c', 'Camiseta de Panamá Dorsal 18 Kadir Barría', NULL, 40, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791942387566_1000016564_4qexee.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791942387566_1000016564_4qexee.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791942388176_1000016561_cu6dkh.jpg']::text[], true, '2026-10-14T01:46:29.792293+00:00', '2026-10-14T01:46:29.792293+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('a0a40e3e-b340-4544-be59-6de62099fb62', 'Camiseta de Panamá color azul marino', NULL, 40, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791942430852_1000016547_l753h6.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791942430852_1000016547_l753h6.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791942431605_1000016552_6cvo17.jpg']::text[], true, '2026-10-14T01:47:13.26481+00:00', '2026-10-14T01:47:13.26481+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('2f16760a-2d65-4523-8cd5-40dfbc90524c', 'Crop to de Brasil', 'Tallas
3 S Brasil amarillo sin nombre con el número 10
1 S sin nombre y sin número Brasil amarillo
4 M sin nombre y con el número 10 top amarillo Brasil', 50, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791942847528_1000016631_daa5g8.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791942847528_1000016631_daa5g8.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791942850830_1000016635_dalzbb.jpg']::text[], true, '2026-10-14T01:54:17.186184+00:00', '2026-10-14T01:54:27.019+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('89ecce25-4227-412a-a415-c7d7cdc9341b', 'Crop top de Portugal', '3 S sin nombre y con número 7 rojo
1 M con nombre y con número 7
1 S con nombre y número de Portugal 7', 50, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791943022114_1000016692_csnni4.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791943022114_1000016692_csnni4.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791943022768_1000016643_fnc1pv.jpg']::text[], true, '2026-10-14T01:56:40.753056+00:00', '2026-10-14T01:57:03.482+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

INSERT INTO public.productos (id, nombre, descripcion, precio, categoria_id, imagen_url, imagenes, activo, creado_en, actualizado_en)
VALUES ('be7b21f2-35fd-4dc7-9d3b-e87f53293b32', 'Camiseta de Brasil Amarillo versión jugador', 'L - 1 Neymar
XL - Neymar
2XL-2 Neymar', 50, '46697972-9a74-4356-b292-8d66db46fe33', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791943444378_1000016648_pvonth.jpg', ARRAY['https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791943444378_1000016648_pvonth.jpg', 'https://gfkzdakcekvvylzsyexi.supabase.co/storage/v1/object/public/productos/productos/1791943445178_1000016654_h01227.jpg']::text[], true, '2026-10-14T02:04:07.211043+00:00', '2026-10-14T02:04:07.211043+00:00')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  precio = EXCLUDED.precio,
  categoria_id = EXCLUDED.categoria_id,
  imagen_url = EXCLUDED.imagen_url,
  imagenes = EXCLUDED.imagenes,
  activo = EXCLUDED.activo;

-- =========================================================================
-- 12. CARGA DE DATOS: INVENTARIO Y STOCK EXISTENTE (48 REGISTROS)
-- =========================================================================
INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('c246fcd2-2a34-4321-ad03-80dfd8220611', '9d58643a-9eef-48cd-b790-941933ca2fde', 1, 5, '2026-10-07T23:40:42.372+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('f134edf4-6a49-4e8e-ad61-3639a6a972c5', '1760689e-0949-4b9a-8d21-8c1fed89be7d', 1, 5, '2026-10-07T23:40:47.509+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('1c5681b0-202e-46db-8070-6c586b858411', '1537a772-7ee5-43ca-aa55-dcde5eae848e', 0, 5, '2026-10-14T01:44:40.578153+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('1aa14ee2-6995-44e1-a551-1eb86ddb9897', '1f1e0ac9-aed0-4256-b2f3-71a9a9483911', 1, 5, '2026-10-02T13:05:29.499+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('1707a18c-936e-4681-a5a2-e4de8ddb1735', 'b4c38317-f000-439a-8003-e9a832d9fdda', 1, 5, '2026-10-02T13:05:29.079+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('2fcbf8e5-b5bc-4045-a3d4-db742a630e7f', 'c52a1b33-2d91-4aa1-958f-b3945d65e0d6', 1, 5, '2026-10-02T13:05:30.049+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('41b95742-4713-4078-b4d0-7cb13c9829f0', '19758a53-472a-4767-a277-378f0730976e', 1, 5, '2026-10-02T13:05:30.513+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('71281e73-c3cd-42d7-ac22-199addd02b2e', '62e90086-0497-40ca-8998-c5b4ea60bb22', 0, 5, '2026-10-14T01:45:32.986993+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('45011892-5d2a-408d-bec5-5b9560235a4b', '2b665c8e-28fe-4630-a375-e69319193a79', 1, 5, '2026-10-02T13:05:32.921+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('4ea8e0e8-3289-4645-9cd2-194c983a4428', 'dda18850-a4ca-4100-a21c-ba32104b5e81', 1, 5, '2026-10-02T13:05:34.074+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('4fd0ff17-6e77-49c4-b1f6-852a463e4969', 'a8d627f4-0c2c-4dd7-a934-b8fba8656ac9', 1, 5, '2026-10-02T13:05:34.488+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('9c4b178f-509a-4c56-b232-1a514193185c', '00bbf950-8b98-49d7-a9a5-1cb2658c167c', 0, 5, '2026-10-14T01:46:29.792293+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('665ea7fc-4af7-454c-96f4-f1b83ffd61be', '897c1242-1a3f-4a45-957b-6dbfa4a9c761', 1, 5, '2026-10-02T13:05:36.047+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('8c883f19-38ab-4422-aa58-1482e09fa132', '3e0496bd-10a3-4e6b-9490-daac7b148fc3', 1, 5, '2026-10-02T13:05:37.533+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('739ce521-1697-4d44-a3ce-7d24f1d45a65', 'f5b5b2d9-f253-41bb-98d9-8726bc23ae65', 1, 5, '2026-10-02T13:05:37.209+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('91123725-9f1b-45e2-9ca2-9d29c91e13fd', 'b79e6014-f0d8-46bb-8281-5b7a58a71756', 1, 5, '2026-10-02T13:05:37.858+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('991af618-8a2f-4fb3-8a47-763e3c5768da', '132255d4-f60d-4333-a0b9-994a58dc74fc', 1, 5, '2026-10-02T13:05:38.164+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('a3c3250e-70b7-479c-a4a2-50b7ddb4894e', 'e6eddce9-6e91-421c-9900-144af799eea8', 1, 5, '2026-10-02T13:05:43.878+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('a7786589-b727-4534-a411-730fdae71aca', '2fd96ae2-4e8d-4198-a273-052578f7f97e', 1, 5, '2026-10-02T13:05:44.062+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('59a09b13-c0d0-4f78-a91d-c6350de34092', 'a0a40e3e-b340-4544-be59-6de62099fb62', 0, 5, '2026-10-14T01:47:13.26481+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('cd32e57b-a1ed-4fd5-9981-dcb95f70b558', '729857d6-cd98-4cb9-9ba5-b7402b4c30ea', 1, 5, '2026-10-02T13:05:52.072+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('ed5a6e21-0b96-4bc7-83b9-96f6ec1e4570', '0c7f642f-3237-49b8-a5b6-cf7e06a428a3', 1, 5, '2026-10-02T13:05:53.621+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('1cfb93ff-4651-444e-b00f-4c309b163793', 'a8fbb6a9-8d3a-41ec-a771-b7b8d98bdd23', 1, 5, '2026-10-02T13:09:05.252+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('1a126601-c14d-45ed-91fe-fbc74c6e5030', '9222ad43-0fd7-4f69-ba14-4758622073e1', 1, 5, '2026-10-06T22:23:57.015+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('29370dea-6c59-4499-a1f7-2e078d135b97', '286f69b8-3c45-43aa-9c16-f3fd6d49dcae', 1, 5, '2026-10-06T22:23:58.051+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('4b5095b2-e682-4d24-93e0-8ced787a95be', 'a8746955-086e-4c98-b290-5334de82b37f', 1, 5, '2026-10-06T22:23:59.532+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('50c0a478-1c89-44f4-aca9-539678a45550', '62006d0d-4e59-4a30-99f1-13fdfca62e15', 1, 5, '2026-10-06T22:24:00.218+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('a02dd901-c043-48ea-9351-5b8671baacf2', 'f32a9723-2ab4-4ab5-9f98-d71570646af5', 1, 5, '2026-10-06T22:24:01.842+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('b3c391d6-84ff-459d-8dc0-73d30e6db03a', 'eb96d4ba-f871-49b1-859a-ee030e668f94', 1, 5, '2026-10-06T22:24:03.081+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('cab297d0-9548-494f-ad40-ac6051b5816d', '40c85879-87a7-4903-b5dc-f48ea8fe26ca', 1, 5, '2026-10-06T22:24:03.423+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('f7bfb8a5-b41e-40cd-bb0f-fc2ee7f86ac9', 'f2e5d400-5755-449e-8353-6be590c8d499', 1, 5, '2026-10-06T22:24:11.551+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('e67d5ca1-34bc-4e89-9da7-9e6e0d96497f', '85221c3d-1fc7-4974-89d2-e7fc1753cb57', 1, 5, '2026-10-06T22:24:12.042+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('6821ccb0-9d6c-48c1-aa57-2c6a3e9b2daf', '2f16760a-2d65-4523-8cd5-40dfbc90524c', 0, 5, '2026-10-14T01:54:27.634+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('a481c74d-8fa1-4713-9ef1-ebd81cddfa50', '89ecce25-4227-412a-a415-c7d7cdc9341b', 0, 5, '2026-10-14T01:57:03.734+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('fca048ce-d6da-460f-9a1f-6e55f9d004e1', 'be7b21f2-35fd-4dc7-9d3b-e87f53293b32', 0, 5, '2026-10-14T02:04:07.211043+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('b733c255-3c19-4e8a-855c-be290067f8a7', 'e63f80ab-8f24-420b-8e16-c51526bb3911', 0, 5, '2026-10-15T15:40:08.853+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('010ae999-6097-4afd-9797-e3f9c6397912', 'c5b2a371-6250-4334-b68d-2bb3bdc7ad7e', 1, 5, '2026-10-06T22:24:27.155+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('b1416c12-adcd-4d67-9a89-bf65c958972f', 'b4cd97b1-b94c-4433-892d-f9647c41ab34', 1, 5, '2026-10-07T21:56:01.736+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('0273f93d-6555-42ee-9e07-ac1514704f9d', 'cfddc339-a8b8-40e6-a764-f93b9da31c17', 1, 5, '2026-10-07T23:40:25.19+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('08d19d82-aea7-489c-b47a-1aaf8423ac51', '9eedb393-b559-4794-ab6d-23fd67334990', 2, 5, '2026-10-07T23:40:26.431+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('097be404-76e9-4f35-b5a1-2184845d9e9e', 'ebc2d350-09a3-437a-9f94-50189b9ba394', 1, 5, '2026-10-07T23:40:26.871+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('109d8139-2599-490a-9e4c-ee828de631a1', 'ce3da4e4-4255-4708-aa17-3ca40f6f10a9', 1, 5, '2026-10-07T23:40:28.136+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('11785db1-629a-487a-80c3-a1bff40151ca', 'c3cdec9a-eacb-417e-8d90-c8a5fb115769', 1, 5, '2026-10-07T23:40:30.248+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('1418da3d-bbac-42ec-8905-6f3cf240b256', '2bc46ed0-1a6e-4cd9-b13a-61dec86d6570', 1, 5, '2026-10-07T23:40:30.798+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('38e7cf22-a271-4003-a871-e1bd70218692', '880af32c-8451-4522-91b2-9e188f058619', 1, 5, '2026-10-07T23:40:33.746+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('5b34f553-cc0a-49dc-bfb5-12817dff0224', 'b1e38894-7338-40a1-ba0f-f367bc20432c', 1, 5, '2026-10-07T23:40:36.764+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('5cd6b63f-1ce3-4220-9010-81e6a7b780ee', 'e9f6ed52-6cd7-4b54-896b-c731d82e0638', 1, 5, '2026-10-07T23:40:38.756+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

INSERT INTO public.inventario (id, producto_id, cantidad, stock_minimo, actualizado_en)
VALUES ('a048628d-a8e5-4cb0-baaf-2196a6509d68', 'f7319852-c590-479d-a321-42c90b343e0d', 1, 5, '2026-10-07T23:40:41.281+00:00')
ON CONFLICT (producto_id) DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  stock_minimo = EXCLUDED.stock_minimo,
  actualizado_en = EXCLUDED.actualizado_en;

-- =========================================================================
-- 13. RECARGA DE CACHÉ DE POSTGREST
-- =========================================================================
NOTIFY pgrst, 'reload schema';
