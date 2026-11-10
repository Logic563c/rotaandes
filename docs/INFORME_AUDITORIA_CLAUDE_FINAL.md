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

## 5. Publicación (autorizada el 9-11-2026)

- **GitHub:** `release/publicacion` avanzó por fast-forward `d589f63..f9bb124` (confirmado en el remoto). Sin force push.
- **Railway:** despliegue `d2d9a468-b397-4599-aba2-0f356fd384b4`, estado SUCCESS, desde una exportación limpia de `f9bb124` (318 archivos versionados, sin secretos; la migración exportada conserva el checksum `2aec5b…` de producción). Pre-deploy: «Migraciones aplicadas y catálogo autorizado verificado», 10 cultivos, 8 plantillas, 0 usuarios creados. `/api/health` → 200. Despliegue anterior para reversión: `022133e1-d1e1-4d86-9c40-595f8e300cd8`.
- **Vercel:** despliegue `dpl_C3PxdnCqtNnBqPRcjF16RFWek3Vp` (READY), creado sin dominio y promovido a `https://rotaandes.vercel.app` tras verificar el backend. El bundle público contiene la corrección y apunta a `backend-production-954a9.up.railway.app`. Rutas SPA `/`, `/login`, `/registro`, `/glosario`, `/fuentes` y `/terrenos` → 200.

### Pruebas reales de producción

**API (sin navegador)**, terreno temporal en Latacunga (−0,934512; −78,615873):
- Clima 200 en 644 ms, `estado_datos: nasa`. Antes del despliegue la misma ruta daba 500.
- Calendario: 120 celdas.
- Rotaciones: actual 58,59; Papa → Vicia + avena → Papa 62,15; la segunda sugerida queda no determinada.
- Escenarios: 200. Con `lluvia_pct=31` → 400.
- Tendencias, pronóstico y PDF (75.827 bytes): 200.
- Desde otra cuenta: 404 en las 8 rutas del terreno. Sin token: 401.

**Navegador Edge en las URL públicas, sin interceptar solicitudes**, con NASA, Open-Meteo y GIBS reales:
- Recorrido completo:
  1. Portada.
  2. Registro, cierre de sesión y login.
  3. Perfil.
  4. Terreno con coordenadas de 6 decimales y dos siembras.
  5. Climatología NASA.
  6. Calendario de 120 celdas.
  7. Tres rotaciones.
  8. Pronóstico.
  9. Simulador a −30 % y +2 °C.
  10. Tendencias.
  11. MODIS NDVI y SMAP con leyenda.
  12. Descarga del PDF (76.085 bytes).
  13. Glosario y fuentes.
  14. El agricultor no puede entrar al panel técnico.
  15. Persistencia tras un nuevo login.
  16. Cierre de sesión.
- Celular a 390 y 320 px: clima, calendario y rotaciones sin desbordamiento horizontal.
- **0 errores de consola y 0 respuestas HTTP ≥400 inesperadas.**
- Capturas de escritorio y celular en `.tmp/evidencias-auditoria-final/`, carpeta ignorada por Git.
- **Panel técnico:** no se probó en producción, porque crear una cuenta técnica exige SQL remoto y no se autorizó en esta sesión. Está cubierto por las pruebas E2E locales y de PostgreSQL. El rechazo al agricultor sí se verificó en producción.

## 6. Incidencias pendientes

| Severidad | Incidencia | Estado |
| --- | --- | --- |
| Resuelto | Producción devolvía 500 en clima/calendario y rotaciones sin ranking | Desplegado y verificado en las URL públicas |
| Resuelto | Respaldo manual verificable de PostgreSQL de producción | Hecho y restaurado de prueba (sección 4) |
| Resuelto | Recorrido real en las URL públicas | Aprobado (sección 5) |
| Menor | Cuentas temporales de las pruebas siguen en producción (sin terrenos, salvo quizá dos intentos interrumpidos) | Borrarlas requiere SQL remoto; pendiente de autorización |
| Menor | Panel técnico no recorrido en producción | Cubierto por pruebas locales; requiere cuenta técnica |
| Menor | El cliente Open-Meteo rechaza al instante una tercera consulta simultánea (no espera turno) | Sin cambio; riesgo bajo con caché de 30 min |
| Menor | Chunk JS principal de 514 kB | Aviso conocido, no bloqueante |
| Mejora futura | GeoJSON analítico de NDVI/SMAP (hoy solo imágenes GIBS) | No implementado; se informa con 503 |
| Mejora futura | Validación agronómica local del catálogo y pruebas con agricultores | Fuera del alcance técnico |
