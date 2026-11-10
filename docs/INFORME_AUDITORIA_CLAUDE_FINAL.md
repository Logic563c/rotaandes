# Informe de auditoría final — RotaAndes

Fecha: 9 de noviembre de 2026 · Rama: `fix/estabilizacion-final` (desde `d589f63`) · Presentación: 11 de noviembre de 2026.

Detalle técnico de NASA POWER, evidencia y recuperación: [DIAGNOSTICO_NASA_Y_RECUPERACION.md](DIAGNOSTICO_NASA_Y_RECUPERACION.md).

## 1. Estado de los módulos

| Módulo | Estado en `fix/estabilizacion-final` | Evidencia |
| --- | --- | --- |
| Registro, login, perfil, JWT | Funciona | Recorrido local real; pruebas unitarias, PostgreSQL y E2E |
| Terrenos, siembras, altitud automática | Funciona | Open-Meteo real: 2.773 m en Latacunga |
| Climatología NASA POWER | **Corregido** (fallaba con 500) | 200 con NASA real en coordenadas de 6 decimales |
| Calendario 10 × 12 = 120 celdas | **Corregido** (fallaba con 500) | 120 celdas, 4 estados, motivo por celda |
| Rotaciones (actual + 2) | **Corregido** (sin ranking por falta de clima) | Puntajes con clima real; sugerida no determinada se muestra sin inventar |
| Simulador −30/+30 %, −2/+2 °C | **Corregido** | Cambios coherentes; fuera de rango → 400; no escribe datos |
| Tendencias 2005–2024 | **Corregido** (mismo defecto de coordenadas) | Mensual y diaria NASA real; respaldo por celda nuevo |
| Pronóstico Open-Meteo | Funciona | 7 días reales; sin dependencia de NASA |
| Capas MODIS NDVI / SMAP (GIBS) | Funciona (solo imágenes) | 200 en producción; GeoJSON analítico **no implementado** (503 honesto) |
| PDF | Funciona | 200, PDF válido, autenticado; 404 para otra cuenta |
| Panel técnico | Funciona | Pruebas de permisos y E2E existentes |
| Landing, glosario, fuentes | Funciona | E2E existentes |

## 2. Errores originales y causas

Ver la sección 2 del diagnóstico. Resumen: NASA POWER v2.10.1 redondea a milésimas las coordenadas devueltas y el validador solo aceptaba centésimas → toda respuesta para un terreno marcado en el mapa se rechazaba → 500 en clima y calendario, y rotaciones sin ranking. Agravantes: mensaje genérico para todo 5xx, timeout del frontend de 8 s, sin reintentos, rechazo inmediato por concurrencia y respaldo limitado a cinco coordenadas exactas.

Los cuatro síntomas (A–D) tienen una sola causa raíz. No se encontraron fallos de CORS, JWT, caché, PostgreSQL ni configuración de Railway/Vercel.

## 3. Pruebas

`npm.cmd run check` (lint → typecheck → unitarias → PostgreSQL local aislado → build → Playwright escritorio/celular 320/375/390) terminó con **código 0** el 9-11-2026:

| Suite | Antes | Ahora |
| --- | --- | --- |
| Backend (Vitest) | 358 | **375** |
| Frontend (Vitest) | 168 | **170** |
| PostgreSQL aislado | 152 | **152** |
| Playwright E2E | 42 | **42** |
| Total | 720 | **739** |

ESLint sin advertencias, TypeScript estricto sin errores, `npm audit`: 0 vulnerabilidades. Aviso no bloqueante conocido: chunk principal de 514 kB (150 kB gzip).

Pruebas nuevas (`backend/tests/recuperacionNasa.test.ts`, `ClimaTerreno.test.tsx`): redondeo a milésimas, rechazo de otra ubicación, reintento ante 503, sin reintento ante 400/HTML, caída de red, cola de concurrencia y su límite, bordes de celda, integridad SHA-256 de 34 archivos NASA, igualdad valor a valor entre respaldo exacto y de celda, cobertura de cinco localidades, servicio con NASA caído (clima y tendencias) sin escribir caché, 503 visible y 500 genérico, timeout distinguido. Se ajustaron pruebas previas solo donde el comportamiento cambió por diseño (código 503, punto cercano ahora con respaldo de su celda, `Content-Type`), sin relajar lo que protegen.

Pruebas reales separadas de las automatizadas: NASA en vivo (48 puntos de verificación de celdas, endpoints climatología/mensual/diaria), Open-Meteo en vivo y un recorrido HTTP completo contra el backend local (sección 6 del diagnóstico). `prisma migrate deploy` con el archivo LF frente a un registro CRLF, en un esquema desechable local: «No pending migrations», código 0, checksum registrado sin cambios; esquema eliminado después.

## 4. PostgreSQL de producción y respaldo

- **Causa del timeout del túnel:** la clave `~/.ssh/id_ed25519` (registrada en Railway como «Laptop RotaAndes», huella `SHA256:xZMm…Z7k`) tiene frase de paso y el servicio `ssh-agent` de Windows estaba deshabilitado. En modo no interactivo `ssh` no podía desbloquearla y Railway respondía `no_ssh_key`. El propietario habilitó `ssh-agent` (inicio manual) y cargó la clave con `ssh-add`. No se expuso PostgreSQL, no se cambiaron credenciales ni se registraron claves nuevas.
- **Respaldo realizado el 2026-11-10T01:26:37Z:** `pg_dump` 18.6 en formato custom (`-Fc -Z 6`), ejecutado dentro del contenedor `postgres` mediante `railway ssh` por socket local (sin manejar contraseñas en el equipo), transmitido en base64 y decodificado localmente. Código de salida 0.
  - Archivo: `C:\Users\DELL\Documents\RESPALDOS_ROTAANDES\rotaandes_prod_20261110T012634Z.dump`, fuera del repositorio, 14.811 bytes, SHA-256 `BFF180BBF7FD4BBE4D35E71641BBA7DD8BD68338744576FFBDADEA5249A3577D`.
  - `pg_restore -l`: base `rotaandes_prod`, formato CUSTOM, 7 tablas con datos, 8 claves primarias/únicas y 3 claves foráneas.
  - **Restauración de prueba:** el rol local no tiene `CREATEDB`, así que se restauró con `psql -1 -v ON_ERROR_STOP=1` en un esquema desechable de la base local de pruebas. Resultado idéntico a producción: usuarios 5, terrenos 5, siembras 4, cultivos 10, plantillas 8, clima_cache 9, migraciones 1; 55 restricciones; checksum de migración `2aec5b49…6edfb`. El esquema y el SQL temporal se eliminaron.
- No se escribió en PostgreSQL de producción; solo se leyó (conteos y volcado).
- Esta rama no contiene migraciones nuevas ni cambios de esquema o catálogo. El pre-deploy solo ejecutaría `migrate deploy` (sin pendientes; comprobado que la diferencia LF/CRLF no lo hace fallar) y el upsert idempotente de 10 cultivos y 8 plantillas.
- **Restaurar (solo ante un desastre y con autorización expresa):** `pg_restore --clean --if-exists --no-owner -d <URL privada de rotaandes_prod> <archivo.dump>` a través de `railway connect postgres --tunnel-only`.

## 5. Publicación

- GitHub: `release/publicacion` = `d589f63`. Los commits de esta rama son locales y se incorporan por fast-forward. **No se ha hecho push.**
- Railway: sigue en el despliegue `022133e1-d1e1-4d86-9c40-595f8e300cd8` (código `012d6be`), con el defecto de coordenadas. **No se ha desplegado.**
- Vercel: sin cambios. **No se ha desplegado.**
- El despliegue queda pendiente de autorización expresa (ver la solicitud entregada al propietario).

## 6. Incidencias pendientes

| Severidad | Incidencia | Estado |
| --- | --- | --- |
| Crítica | Producción sigue devolviendo 500 en clima/calendario y rotaciones sin ranking | Corregido en la rama; **requiere desplegar** |
| Resuelto | Respaldo manual verificable de PostgreSQL de producción | Hecho y restaurado de prueba (sección 4) |
| Importante | Recorrido real en las URL públicas tras el despliegue | Pendiente del despliegue |
| Menor | El cliente Open-Meteo rechaza al instante una tercera consulta simultánea (no espera turno) | Sin cambio; riesgo bajo con caché de 30 min |
| Menor | Chunk JS principal de 514 kB | Aviso conocido, no bloqueante |
| Mejora futura | GeoJSON analítico de NDVI/SMAP (hoy solo imágenes GIBS) | No implementado; se informa con 503 |
| Mejora futura | Validación agronómica local del catálogo y pruebas con agricultores | Fuera del alcance técnico |
