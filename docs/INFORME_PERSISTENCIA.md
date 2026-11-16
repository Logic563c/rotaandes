# Informe de persistencia de RotaAndes

> **Registro histórico de esta fase.** Se conservan sus fechas, versiones, cifras y resultados; las menciones a publicación pendiente o a repositorio privado describen ese momento. Para la versión vigente, las instrucciones actuales y las evidencias verificadas el 15-11-2026, consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los comandos de publicación, migración o reversión de este registro no son instrucciones para la auditoría documental actual.

Estado: fase implementada y verificada en `feat/base-datos-autenticacion`, lista para revisión. El commit de cierre utiliza el mensaje `Implementar persistencia PostgreSQL con Prisma.`. No se realizaron despliegues ni push. `main`, `PROYECTO.md`, `AGENTS.md` y el frontend existente permanecen sin cambios respecto a `ee4f8c8`.

## Resultado

- Conexión real mediante `rotaandes_app`, con PostgreSQL local en `127.0.0.1:5432`.
- Esquema Prisma con los seis modelos de la sección 5, nombres físicos originales, tipos nativos, valores predeterminados y nulabilidad.
- Migración inicial versionada, aplicada tanto a desarrollo como a una base aislada de pruebas.
- Cliente Prisma reutilizable, generación explícita y comprobación de su versión compilada.
- Asistente iniciado en la terminal integrada de VS Code con entrada oculta. Reutiliza configuración, autenticación disponible y bases existentes; guarda `.env` de forma atómica.
- Sin autenticación de la aplicación, CRUD, semillas, datos agronómicos, nuevas pantallas ni integraciones externas.

## Versiones comprobadas

| Componente | Versión |
| --- | --- |
| Node.js | 24.20.0 |
| npm | 11.19.0 |
| PostgreSQL servidor y psql | 18.4 |
| Prisma CLI | 7.10.1 |
| Prisma Client | 7.10.1 |
| `@prisma/adapter-pg` | 7.10.1 |
| `pg` / `@types/pg` | 8.23.1 |
| TypeScript | 5.9.3 |
| Express | 5.3.0 |

Prisma y su adaptador están fijados a la misma versión estable. No se instaló Prisma 8 candidata.

## Bases y permisos

| Base | Propietario | Codificación | Uso |
| --- | --- | --- | --- |
| `rotaandes_dev` | `rotaandes_app` | UTF8 | Desarrollo |
| `rotaandes_pruebas_36cbc85c` | `rotaandes_app` | UTF8 | Integridad y persistencia aisladas |

El rol de aplicación tiene LOGIN y no tiene SUPERUSER, CREATEDB ni CREATEROLE. El administrador se utilizó exclusivamente durante la configuración; su contraseña no se guardó en `.env`.

Se comprobó la idempotencia ejecutando nuevamente el asistente con `-SinInteraccion`: reutilizó ambas bases sin pedir claves, no creó otra base y dejó idéntico el contenido de `.env`. Solo existe una base de pruebas del proyecto. No se borraron bases existentes.

## Tablas y relaciones

| Tabla | Clave primaria | Relaciones y restricciones destacadas |
| --- | --- | --- |
| `usuarios` | `id` UUID, generado en PostgreSQL | Email único; rol agricultor/tecnico; tres prioridades entre 1 y 5 |
| `terrenos` | `id` UUID, generado en PostgreSQL | `usuario_id → usuarios.id`, ON DELETE CASCADE |
| `cultivos` | `id` TEXT | Identificadores textuales; SMALLINT[] y booleanos según el contrato |
| `siembras` | `id` UUID, generado en PostgreSQL | `terreno_id → terrenos.id`, ON DELETE CASCADE; `cultivo_id → cultivos.id`, ON DELETE NO ACTION |
| `plantillas_rotacion` | `id` TEXT | Secuencia TEXT[] obligatoria |
| `clima_cache` | `clave` TEXT | JSONB obligatorio y timestamp de actualización predeterminado |

Todas las claves foráneas mantienen ON UPDATE NO ACTION. También existe `_prisma_migrations`, tabla auxiliar de Prisma y no un modelo adicional del dominio.

La inspección SQL de solo lectura se ejecutó en ambas bases y confirmó cuatro CHECK, tres claves foráneas y la restricción UNIQUE del email. Las pruebas verifican las seis claves primarias y todos los tipos y la nulabilidad del contrato.

Después de las pruebas, las seis tablas de dominio tienen cero registros en ambas bases: no quedaron fixtures ni se cargaron semillas.

## Migraciones

`backend/prisma/migrations/20261107000100_esquema_inicial/migration.sql`

- Preparada mediante Prisma Migrate y revisada antes de aplicarse.
- Incluye BEGIN/COMMIT, los cuatro CHECK, los NOT NULL de los arreglos y la restricción UNIQUE.
- Aplicada correctamente a desarrollo y reproducida en la base aislada.
- Las ejecuciones posteriores informaron que no había migraciones pendientes.
- `prisma migrate diff --from-config-datasource --to-schema=prisma/schema.prisma --exit-code` terminó con código 0 y `No difference detected`.
- No se utilizó shadow database, `migrate reset`, `db push` ni DROP DATABASE. No se editó la migración después de aplicarla.

Los CHECK y los NOT NULL de los arreglos se conservan en SQL, además del modelo Prisma, y cuentan con comprobaciones de catálogo y comportamiento.

## Resultados ejecutados

| Comprobación | Resultado |
| --- | --- |
| `npm.cmd run check` | Aprobado, código de salida 0 |
| Lint | Aprobado, sin warnings |
| TypeScript estricto | Aprobado |
| Pruebas unitarias backend | 45 aprobadas |
| Pruebas frontend | 15 aprobadas |
| Pruebas PostgreSQL / Prisma | 32 aprobadas |
| Build backend y frontend | Aprobado |
| E2E en Edge, escritorio y celular | 2 aprobadas |
| Utilidades PowerShell | 14 comprobaciones aprobadas |
| Cliente Prisma compilado | Conexión y consulta reales aprobadas |
| Reejecución del asistente | Aprobada sin claves adicionales, cambios de contenido ni nuevas bases |
| `git diff --check` | Aprobado |

Las pruebas SQL cubren conexión, propietario y permisos, tablas, columnas, tipos, valores predeterminados, PK, FK, UNIQUE, CHECK, relaciones, cascadas, JSONB, arreglos, datos inválidos, rollback y rechazo real de una contraseña incorrecta. Toda escritura se realizó en la base aislada y se revirtió. Las E2E comprobaron `/api/health` y la página existente contra el backend real.

## Problemas corregidos

- Creación repetida de bases de pruebas: ahora se reutilizan las configuradas o compatibles existentes.
- Errores nativos de psql en PowerShell 5: captura separada y diagnóstico público sin secretos.
- Sobrecarga incorrecta de `String.Split`: sustituida por `-split` y verificada con caracteres reservados.
- Reemplazo atómico de un `.env` existente: se usa `[NullString]::Value` y se prueba creación, reemplazo y limpieza.
- Formato del catálogo para TIMESTAMPTZ(6): normalización limitada de la comparación, sin cambiar el esquema aplicado.
- Posible exposición de URLs en errores nativos o en el reporter: se comparan únicamente mensajes y estados públicos.
- La ejecución restringida produjo un fallo de acceso a información del usuario de Windows en tsx. Las comprobaciones finales se ejecutaron con autorización fuera de esa restricción y aprobaron.
- Auditoría previa al commit: la consulta de la URL solo admite un `schema=public` opcional. Se rechazan parámetros con los que pg podría sobrescribir servidor, puerto o usuario, así como esquemas duplicados y fragmentos. Las URLs locales existentes no se modificaron.
- Se ampliaron las exclusiones de claves privadas y almacenes de certificados; los ejemplos de entorno conservan únicamente valores ficticios.

## Archivos de la fase respecto al commit base ee4f8c8

`M` indica modificado y `A` agregado respecto a la Fase 0; estas marcas no describen cambios pendientes después del commit de cierre.

```text
M .gitignore
A .vscode/tasks.json
M README.md
M package.json
M package-lock.json
M eslint.config.mjs
M backend/.env.example
M backend/package.json
M backend/tsconfig.json
M backend/vitest.config.ts
A backend/vitest.base.config.ts
A backend/prisma.config.ts
A backend/prisma.pruebas.config.ts
A backend/prisma/schema.prisma
A backend/prisma/migrations/migration_lock.toml
A backend/prisma/migrations/20261107000100_esquema_inicial/migration.sql
A backend/scripts/comprobarConfiguracion.ts
A backend/scripts/verificarBase.ts
A backend/scripts/verificarEsquema.sql
A backend/src/lib/configuracionBase.ts
A backend/src/lib/prisma.ts
A backend/tests/configuracionBase.test.ts
A backend/tests/base-datos/persistencia.integration.test.ts
A scripts/configurarBaseLocal.ps1
A tests/scripts/configurarBaseLocal.test.ps1
M docs/DECISIONES.md
A docs/INFORME_PERSISTENCIA.md
```

`backend/.env`, el cliente generado, `dist`, dependencias y `.tmp` están excluidos de Git. Se comprobaron los hashes de los dos documentos protegidos y permanecen intactos.

## Verificación reproducible para revisión

No hace falta ejecutar estos comandos para terminar la fase: ya fueron comprobados. Desde PowerShell:

```powershell
Set-Location C:\Users\DELL\Documents\PROYECTOS\rotaandes
npm.cmd run db:status --workspace backend
npm.cmd run db:verify --workspace backend
npm.cmd run check
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tests\scripts\configurarBaseLocal.test.ps1
```

Para generar el cliente o aplicar futuras migraciones autorizadas:

```powershell
npm.cmd run prisma:generate --workspace backend
npm.cmd run db:migrate --workspace backend
```

Inspección opcional con psql, que solicita la contraseña de forma oculta:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -X -W -h 127.0.0.1 -p 5432 -U rotaandes_app -d rotaandes_dev -v ON_ERROR_STOP=1 -f .\backend\scripts\verificarEsquema.sql
```

En pgAdmin: servidor `127.0.0.1:5432`, usuario `rotaandes_app`, base `rotaandes_dev`; abrir Query Tool y ejecutar `backend/scripts/verificarEsquema.sql`. Es una inspección de solo lectura. Actualizar Schemas → public → Tables para ver las seis tablas y el registro de migraciones.

No quedan bloqueos de esta fase. Las limitaciones de representación del ORM y las instrucciones para revisar futuras migraciones están documentadas en `DECISIONES.md`. La siguiente fase no se ha iniciado.
