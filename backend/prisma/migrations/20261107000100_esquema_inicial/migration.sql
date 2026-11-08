-- Esquema de la sección 5 de PROYECTO.md. DDL atómico en PostgreSQL.
BEGIN;

-- Crear esquema
CREATE SCHEMA IF NOT EXISTS "public";

-- Crear tabla
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'agricultor',
    "nombre" TEXT NOT NULL,
    "parroquia" TEXT,
    "telefono" TEXT,
    "prioridad_agua" SMALLINT DEFAULT 3,
    "prioridad_suelo" SMALLINT DEFAULT 3,
    "prioridad_ingresos" SMALLINT DEFAULT 3,
    "creado_en" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- Crear tabla
CREATE TABLE "terrenos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "usuario_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "altitud_m" INTEGER,
    "area_ha" DECIMAL(8,2),
    "tiene_riego" BOOLEAN DEFAULT false,
    "tipo_suelo" TEXT,
    "creado_en" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "terrenos_pkey" PRIMARY KEY ("id")
);

-- Crear tabla
CREATE TABLE "cultivos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "familia" TEXT NOT NULL,
    "altitud_min" INTEGER NOT NULL,
    "altitud_max" INTEGER NOT NULL,
    "ciclo_meses" SMALLINT NOT NULL,
    "meses_siembra" SMALLINT[] NOT NULL,
    "lluvia_min_mensual_mm" INTEGER NOT NULL,
    "demanda_agua" SMALLINT NOT NULL,
    "tolerancia_helada" SMALLINT NOT NULL,
    "tolerancia_sequia" SMALLINT NOT NULL,
    "fija_nitrogeno" BOOLEAN NOT NULL DEFAULT false,
    "aporte_materia_organica" SMALLINT NOT NULL,
    "proteccion_erosion" SMALLINT NOT NULL,
    "valor_forraje" SMALLINT NOT NULL,
    "valor_mercado" SMALLINT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "cultivos_pkey" PRIMARY KEY ("id")
);

-- Crear tabla
CREATE TABLE "siembras" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "terreno_id" UUID NOT NULL,
    "cultivo_id" TEXT NOT NULL,
    "fecha_siembra" DATE NOT NULL,
    "fecha_cosecha" DATE,
    "notas" TEXT,
    "creado_en" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "siembras_pkey" PRIMARY KEY ("id")
);

-- Crear tabla
CREATE TABLE "plantillas_rotacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "secuencia" TEXT[] NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "plantillas_rotacion_pkey" PRIMARY KEY ("id")
);

-- Crear tabla
CREATE TABLE "clima_cache" (
    "clave" TEXT NOT NULL,
    "datos" JSONB NOT NULL,
    "actualizado_en" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clima_cache_pkey" PRIMARY KEY ("clave")
);

-- Crear índice
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- Conservar la restricción SQL UNIQUE, además del índice que utiliza Prisma.
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_email_key" UNIQUE USING INDEX "usuarios_email_key";

-- Prisma no representa estos CHECK en schema.prisma; conservarlos aquí.
ALTER TABLE "usuarios"
  ADD CONSTRAINT "usuarios_rol_check" CHECK (rol IN ('agricultor', 'tecnico')),
  ADD CONSTRAINT "usuarios_prioridad_agua_check" CHECK (prioridad_agua BETWEEN 1 AND 5),
  ADD CONSTRAINT "usuarios_prioridad_suelo_check" CHECK (prioridad_suelo BETWEEN 1 AND 5),
  ADD CONSTRAINT "usuarios_prioridad_ingresos_check" CHECK (prioridad_ingresos BETWEEN 1 AND 5);

-- Agregar clave foránea
ALTER TABLE "terrenos" ADD CONSTRAINT "terrenos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Agregar clave foránea
ALTER TABLE "siembras" ADD CONSTRAINT "siembras_terreno_id_fkey" FOREIGN KEY ("terreno_id") REFERENCES "terrenos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Agregar clave foránea
ALTER TABLE "siembras" ADD CONSTRAINT "siembras_cultivo_id_fkey" FOREIGN KEY ("cultivo_id") REFERENCES "cultivos"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT;
