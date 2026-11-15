-- Ampliación del catálogo de cultivos (15-11-2026).
-- Los 19 cultivos nuevos no tienen fuente para los índices de rotación ni para algunos rangos: esos valores
-- se guardan como NULL ("no determinado") en lugar de inventarlos. Solo se relaja NOT NULL; no se borran
-- ni modifican filas, columnas, restricciones CHECK ni claves foráneas. Los 10 cultivos originales conservan sus valores.
ALTER TABLE "cultivos" ALTER COLUMN "altitud_min" DROP NOT NULL,
ALTER COLUMN "altitud_max" DROP NOT NULL,
ALTER COLUMN "lluvia_min_mensual_mm" DROP NOT NULL,
ALTER COLUMN "demanda_agua" DROP NOT NULL,
ALTER COLUMN "tolerancia_helada" DROP NOT NULL,
ALTER COLUMN "tolerancia_sequia" DROP NOT NULL,
ALTER COLUMN "aporte_materia_organica" DROP NOT NULL,
ALTER COLUMN "proteccion_erosion" DROP NOT NULL,
ALTER COLUMN "valor_forraje" DROP NOT NULL,
ALTER COLUMN "valor_mercado" DROP NOT NULL;
