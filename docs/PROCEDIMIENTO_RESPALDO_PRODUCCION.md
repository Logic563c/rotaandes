# Procedimiento: respaldo verificado de PostgreSQL de producción

Para la persona responsable del proyecto, desde su propio PowerShell. El respaldo **solo lee** producción: ejecuta `pg_dump` dentro del servicio `postgres` de Railway y no modifica ni migra nada. Es el mismo método del respaldo del 10-11-2026, ahora en un script revisable: [`scripts/respaldarProduccion.ps1`](../scripts/respaldarProduccion.ps1).

## Requisitos (una sola vez)

1. Railway CLI con sesión iniciada: `railway login` y, en la raíz del repositorio, `railway link`, eligiendo el proyecto **rotaandes**.
2. Clave SSH cargada en el agente (la que Railway tiene registrada):
   ```powershell
   Get-Service ssh-agent | Set-Service -StartupType Automatic; Start-Service ssh-agent
   ssh-add $env:USERPROFILE\.ssh\id_ed25519
   ```
3. PostgreSQL 18 instalado en el equipo (`C:\Program Files\PostgreSQL\18\bin`), para leer y restaurar el archivo.
4. `backend\.env` con `TEST_DATABASE_URL` apuntando a la base **local** de pruebas. La restauración de prueba se hace ahí, en un esquema temporal que se borra al terminar.

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

Antes de publicar se espera ver:

- conteos de filas iguales a los de producción;
- migraciones: solo `20261107000100_esquema_inicial`, porque la delimitación aún no está aplicada en producción;
- relaciones huérfanas `{"terrenos":0,"siembras":0}`;
- `RESTAURACION_VERIFICADA`.

## Qué compartir y qué no

- **Compartir:** la ruta del archivo, su tamaño, su SHA-256 y la salida de la restauración (conteos). Con eso se puede continuar con la publicación.
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

La restauración real en producción **no forma parte de este procedimiento**. Es una operación destructiva que requiere decisión expresa, una ventana de mantenimiento y un respaldo adicional del estado de ese momento. Para revertir una publicación normalmente basta con volver a los despliegues anteriores de Railway y Vercel; la columna nueva `poligono` es compatible con las versiones anteriores.
