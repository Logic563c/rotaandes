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

- PostgreSQL de producción: en línea; **no se ha leído ni escrito** en esta auditoría. Logs y despliegues de Railway consultados solo en lectura.
- **Respaldo manual: no realizado.** El túnel `railway connect postgres --tunnel-only` agota el tiempo porque la clave `~/.ssh/id_ed25519` (registrada en Railway como «Laptop RotaAndes», huella `SHA256:xZMm…Z7k`) está protegida con frase de paso y el servicio `ssh-agent` de Windows está **deshabilitado**. En modo no interactivo `ssh` no puede desbloquear la clave y Railway responde `no_ssh_key`. Resolverlo exige que el propietario introduzca la frase de paso (o autorice otra clave). No se expuso PostgreSQL, no se cambiaron credenciales ni se registraron claves nuevas.
- Esta rama no contiene migraciones nuevas ni cambios de esquema o catálogo. El pre-deploy solo ejecutaría `migrate deploy` (sin pendientes) y el upsert idempotente de 10 cultivos y 8 plantillas.

## 5. Publicación

- GitHub: `release/publicacion` = `d589f63`. Los commits de esta rama son locales y se incorporan por fast-forward. **No se ha hecho push.**
- Railway: sigue en el despliegue `022133e1-d1e1-4d86-9c40-595f8e300cd8` (código `012d6be`), con el defecto de coordenadas. **No se ha desplegado.**
- Vercel: sin cambios. **No se ha desplegado.**
- El despliegue queda pendiente de autorización expresa (ver la solicitud entregada al propietario).

## 6. Incidencias pendientes

| Severidad | Incidencia | Estado |
| --- | --- | --- |
| Crítica | Producción sigue devolviendo 500 en clima/calendario y rotaciones sin ranking | Corregido en la rama; **requiere desplegar** |
| Importante | Sin respaldo manual verificable de PostgreSQL de producción | Bloqueado por la frase de paso de la clave SSH; requiere decisión del propietario |
| Importante | Recorrido real en las URL públicas tras el despliegue | Pendiente del despliegue |
| Menor | El cliente Open-Meteo rechaza al instante una tercera consulta simultánea (no espera turno) | Sin cambio; riesgo bajo con caché de 30 min |
| Menor | Chunk JS principal de 514 kB | Aviso conocido, no bloqueante |
| Mejora futura | GeoJSON analítico de NDVI/SMAP (hoy solo imágenes GIBS) | No implementado; se informa con 503 |
| Mejora futura | Validación agronómica local del catálogo y pruebas con agricultores | Fuera del alcance técnico |
