BEGIN READ ONLY;

SELECT current_database() AS base, current_user AS usuario,
       current_setting('server_version') AS version;

SELECT datname AS base, pg_get_userbyid(datdba) AS propietario,
       pg_encoding_to_char(encoding) AS codificacion
FROM pg_database WHERE datname = current_database();

SELECT rolname, rolsuper, rolcreatedb, rolcreaterole
FROM pg_roles WHERE rolname = current_user;

SELECT tablename AS tabla FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;

SELECT table_name AS tabla, column_name AS columna, data_type AS tipo,
       udt_name AS tipo_interno, is_nullable AS admite_null, column_default AS valor_predeterminado,
       numeric_precision AS precision_numerica, numeric_scale AS decimales
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
ORDER BY table_name, ordinal_position;

SELECT conrelid::regclass AS tabla, conname AS restriccion,
       contype AS tipo, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;

SELECT migration_name, finished_at IS NOT NULL AS aplicada, rolled_back_at IS NOT NULL AS revertida
FROM _prisma_migrations ORDER BY started_at;

COMMIT;
