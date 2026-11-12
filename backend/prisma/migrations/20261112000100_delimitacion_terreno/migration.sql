-- Delimitación opcional de la zona de cultivo (GeoJSON Polygon, WGS84).
-- Cambio aditivo: columna nula, sin valor predeterminado ni reescritura de filas.
-- Los terrenos existentes conservan sus datos y quedan sin delimitación (NULL).
ALTER TABLE "terrenos" ADD COLUMN "poligono" JSONB;
