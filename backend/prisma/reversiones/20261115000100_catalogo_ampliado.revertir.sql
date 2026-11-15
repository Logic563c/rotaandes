-- Reversión manual de la migración 20261115000100_catalogo_ampliado (NO es una migración de Prisma).
-- Úsela solo si se decide volver al backend de 69f925b, con un respaldo verificado previo y autorización expresa.
-- Se niega a continuar si algún agricultor ya registró siembras de los cultivos ampliados: en ese caso no se borran
-- datos de usuarios; corresponde corregir hacia adelante. No modifica los 10 cultivos originales ni otras tablas.
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "siembras" WHERE "cultivo_id" IN ('col', 'remolacha', 'lechuga', 'cilantro', 'apio', 'perejil', 'zanahoria',
      'cebolla_colorada', 'cebolla_blanca', 'coliflor', 'papa_nabo', 'col_china', 'rabano', 'frejol', 'zapallo', 'zambo', 'berro', 'acelga', 'melloco')) THEN
    RAISE EXCEPTION 'Hay siembras de cultivos de la ampliación: no se revierte para no borrar datos de usuarios.';
  END IF;
  IF EXISTS (SELECT 1 FROM "cultivos" WHERE "id" NOT IN ('col', 'remolacha', 'lechuga', 'cilantro', 'apio', 'perejil', 'zanahoria',
      'cebolla_colorada', 'cebolla_blanca', 'coliflor', 'papa_nabo', 'col_china', 'rabano', 'frejol', 'zapallo', 'zambo', 'berro', 'acelga', 'melloco')
      AND ("altitud_min" IS NULL OR "altitud_max" IS NULL OR "lluvia_min_mensual_mm" IS NULL OR "demanda_agua" IS NULL OR "tolerancia_helada" IS NULL
        OR "tolerancia_sequia" IS NULL OR "aporte_materia_organica" IS NULL OR "proteccion_erosion" IS NULL OR "valor_forraje" IS NULL OR "valor_mercado" IS NULL)) THEN
    RAISE EXCEPTION 'Hay otros cultivos con valores nulos: revisar antes de restaurar NOT NULL.';
  END IF;
END $$;
DELETE FROM "cultivos" WHERE "id" IN ('col', 'remolacha', 'lechuga', 'cilantro', 'apio', 'perejil', 'zanahoria',
  'cebolla_colorada', 'cebolla_blanca', 'coliflor', 'papa_nabo', 'col_china', 'rabano', 'frejol', 'zapallo', 'zambo', 'berro', 'acelga', 'melloco');
ALTER TABLE "cultivos" ALTER COLUMN "altitud_min" SET NOT NULL,
ALTER COLUMN "altitud_max" SET NOT NULL,
ALTER COLUMN "lluvia_min_mensual_mm" SET NOT NULL,
ALTER COLUMN "demanda_agua" SET NOT NULL,
ALTER COLUMN "tolerancia_helada" SET NOT NULL,
ALTER COLUMN "tolerancia_sequia" SET NOT NULL,
ALTER COLUMN "aporte_materia_organica" SET NOT NULL,
ALTER COLUMN "proteccion_erosion" SET NOT NULL,
ALTER COLUMN "valor_forraje" SET NOT NULL,
ALTER COLUMN "valor_mercado" SET NOT NULL;
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261115000100_catalogo_ampliado';
COMMIT;
