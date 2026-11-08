-- Ejecutar solo dentro del PostgreSQL NUEVO autorizado de Railway, mediante SSH.
-- La clave se obtiene del entorno privado del servicio; nunca de argumentos.
\set ON_ERROR_STOP on
\getenv clave_app ROTAANDES_APP_PASSWORD
\if :{?clave_app}
\else
  \echo 'Falta la variable privada del rol de aplicación. Operación detenida.'
  \quit 1
\endif

SELECT current_setting('server_version_num')::int >= 180000
  AND current_setting('server_version_num')::int < 190000 AS version_compatible \gset
\if :version_compatible
\else
  \echo 'Se requiere PostgreSQL 18. No se cambia la instancia existente.'
  \quit 1
\endif

SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rotaandes_app') AS rol_existe \gset
\if :rol_existe
  SELECT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
    AND NOT rolreplication AND NOT rolbypassrls AS rol_seguro
    FROM pg_roles WHERE rolname = 'rotaandes_app' \gset
  \if :rol_seguro
  \else
    \echo 'El rol existente tiene permisos incompatibles. No se modifica.'
    \quit 1
  \endif
\else
  -- Solo esta sesión administrativa: no registrar sentencias con la clave.
  SET log_statement = 'none';
  SET log_min_duration_statement = -1;
  SET log_min_duration_sample = -1;
  SET log_statement_sample_rate = 0;
  SET log_min_error_statement = 'panic';
  CREATE ROLE rotaandes_app WITH LOGIN PASSWORD :'clave_app'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
\endif
\unset clave_app

SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'rotaandes_prod') AS base_existe \gset
\if :base_existe
  SELECT pg_get_userbyid(datdba) = 'rotaandes_app' AND pg_encoding_to_char(encoding) = 'UTF8' AS base_compatible
    FROM pg_database WHERE datname = 'rotaandes_prod' \gset
  \if :base_compatible
  \else
    \echo 'La base existente tiene otro propietario o codificación. No se modifica.'
    \quit 1
  \endif
\else
  CREATE DATABASE rotaandes_prod OWNER rotaandes_app ENCODING 'UTF8' TEMPLATE template0;
\endif

\echo 'Rol sin privilegios administrativos y base de producción comprobados.'
