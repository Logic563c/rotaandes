# Procedimiento: respaldo verificado de PostgreSQL de producción

Para la persona responsable del proyecto, desde su propio PowerShell. El respaldo **solo lee** producción: ejecuta `pg_dump` dentro del servicio `postgres` de Railway y no modifica ni migra nada. Es el mismo método del respaldo del 10-11-2026, ahora en un script revisable: [`scripts/respaldarProduccion.ps1`](../scripts/respaldarProduccion.ps1).

Revisado el **15-11-2026**. El estado vigente es **tres migraciones, 29 cultivos y ocho plantillas**, según la consulta de solo lectura de [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Esta auditoría documental no generó un respaldo nuevo ni ejecutó una restauración; tampoco necesita desplegar servicios.

## Requisitos (una sola vez)

1. Railway CLI con sesión iniciada: `railway login` y, en la raíz del repositorio, `railway link`, eligiendo el proyecto **rotaandes**.
2. Clave SSH cargada en el agente (la que Railway tiene registrada):
   ```powershell
   Get-Service ssh-agent | Set-Service -StartupType Automatic; Start-Service ssh-agent
   ssh-add $env:USERPROFILE\.ssh\id_ed25519
   ```
3. PostgreSQL 18 instalado en el equipo (`C:\Program Files\PostgreSQL\18\bin`), para leer y restaurar el archivo.
4. Dependencias instaladas desde la raíz con `npm.cmd ci`, Node.js 24 y `backend\.env` con `TEST_DATABASE_URL` apuntando a la base **local** de pruebas. La restauración de prueba **escribe** ahí, en un esquema temporal que se borra al terminar. No ejecutarla durante una tarea que prohíba modificar PostgreSQL.

## Ejecución

En PowerShell, en la carpeta del proyecto:

```powershell
cd C:\Users\DELL\Documents\PROYECTOS\rotaandes
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\respaldarProduccion.ps1
```

El script hace, en orden:

1. **Comprobaciones previas:** Railway con sesión y vinculado a `rotaandes`, clave SSH cargada y herramientas de PostgreSQL disponibles.
2. **Respaldo:** `pg_dump -Fc -Z 6 -d rotaandes_prod` dentro del contenedor. Se transfiere en base64 para no dañar los bytes y se guarda en `Documentos\RESPALDOS_ROTAANDES\rotaandes_prod_<fecha UTC>.dump`.
3. **Validación del archivo:** firma `PGDMP`, tamaño, huella SHA-256 (guardada en `.dump.sha256`) y `pg_restore -l`, que comprueba que las 7 tablas tienen datos en el respaldo.
4. **Restauración de prueba:** con [`scripts/probarRestauracionRespaldo.mjs`](../scripts/probarRestauracionRespaldo.mjs), restaura en un esquema desechable de la base **local** de pruebas. Muestra solo conteos de filas, migraciones aplicadas, restricciones y relaciones huérfanas, y después borra el esquema y el SQL temporal.
5. **Resultado:** `RESPALDO VERIFICADO` en verde, o un `ERROR` claro y la ejecución se detiene.

Para verificar un respaldo del estado vigente se espera ver:

- conteos coherentes con la captura de producción tomada para ese respaldo; las altas y ediciones concurrentes pueden cambiar los conteos posteriores, así que no usar cifras de usuarios/terrenos de un informe antiguo;
- **29 cultivos y ocho plantillas**;
- las tres migraciones terminadas y sin reversión: `20261107000100_esquema_inicial`, `20261112000100_delimitacion_terreno` y `20261115000100_catalogo_ampliado`;
- relaciones huérfanas `{"terrenos":0,"siembras":0}`;
- `RESTAURACION_VERIFICADA`.

El restaurador existente muestra conteos y nombres y comprueba relaciones huérfanas y que haya alguna migración aplicada. **No exige automáticamente estas tres migraciones ni compara los conteos con producción**: el responsable debe contrastar esa salida con el estado esperado. `-OmitirRestauracion` omite la prueba aunque el script termine mostrando `RESPALDO VERIFICADO`; esa frase por sí sola no acredita restauración. Con ese modificador, registrar expresamente «restauración no comprobada».

Los respaldos anteriores a la ampliación pueden tener diez cultivos y una o dos migraciones: siguen siendo copias históricas, pero no acreditan recuperación del catálogo actual. Conservar fecha, SHA-256 y evidencia de restauración de cada copia sin renombrarla como si fuera nueva. Mantener los finales de línea de las migraciones aplicadas: las huellas registradas se documentan en [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md).

## Qué compartir y qué no

- **Compartir con el responsable por un canal privado:** la ruta del archivo, su tamaño, su SHA-256 y la salida de la restauración (conteos). El repositorio público puede registrar un resumen sin datos personales ni rutas privadas innecesarias; nunca adjuntar el respaldo.
- **No compartir:** el archivo `.dump` ni su contenido. Contiene correos y hashes de contraseñas. Guárdalo en una carpeta privada o en un medio externo cifrado. Nunca en Git, en el ZIP de entrega ni en un chat.

## Si algo falla

| Mensaje | Qué hacer |
| --- | --- |
| `Railway CLI no tiene sesión` | `railway login` |
| `no está vinculado al proyecto rotaandes` | `railway link` en la raíz del repositorio |
| `El agente SSH no tiene claves cargadas` | `ssh-add $env:USERPROFILE\.ssh\id_ed25519` |
| `pg_dump terminó con código …` | Revisa el archivo `pg_dump_<fecha>.log` junto al respaldo. Suele ser un problema de red o que el servicio está reiniciándose; espera y repite. |
| `no tiene la firma PGDMP` | El archivo está incompleto. Bórralo y repite. |
| `La restauración de prueba falló` | No publiques. Conserva el archivo y comparte solo el mensaje. |

## Restaurar en producción (solo en caso de desastre)

La restauración real en producción **no forma parte de este procedimiento**. Es una operación destructiva que requiere decisión expresa, una ventana de mantenimiento y un respaldo adicional del estado de ese momento. Un cambio documental no requiere ninguna reversión de la aplicación.

Para una reversión funcional, revisar por separado frontend, backend y esquema vigente. No reutilizar automáticamente los destinos del informe del 12-11-2026: son históricos. La compatibilidad aditiva de `poligono` no garantiza que un backend anterior a la ampliación acepte las siembras de los 19 cultivos nuevos. No ejecutar el SQL de reversión del catálogo ni borrar siembras para acomodar una versión antigua; preparar un plan específico que conserve los datos.
