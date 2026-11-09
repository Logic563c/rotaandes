# Diagnóstico NASA POWER y recuperación — 9 de noviembre de 2026

Rama `fix/estabilizacion-final`, creada desde `d589f6364e3f6b6c9bbfa0114e388f90e952cbb1`. Todas las comprobaciones se hicieron con solicitudes HTTP reales, sin mocks, salvo donde se indica «prueba automatizada».

## 1. Síntomas observados

| Problema | Pantalla | Respuesta real del backend público |
| --- | --- | --- |
| A | Climatología: «No se pudo completar la solicitud…» y «no está disponible» | `GET /api/terrenos/:id/clima` → **500** (10 de 10 en los logs HTTP de Railway, 3 días) |
| B | Calendario sin recomendaciones | `GET /api/terrenos/:id/calendario` → **500** (16 de 16) |
| C | Simulador: error al consultar resultados | El simulador llama a calendario + rotaciones; el calendario devuelve 500 |
| D | Rotaciones: «NASA no disponible… no se determina el ranking» | `GET /api/terrenos/:id/rotaciones` → 200 con `clima: null` (degradación honesta prevista) |

En los mismos logs: `OPTIONS` (CORS) → 204, `/api/auth/yo` → 200, `/pronostico` → 200, `/capas-visuales/*` → 200. **No hubo** 401, 403, 404, 408, 429, 502, 503 ni 504 en estas rutas.

Duraciones de los 500: la primera solicitud por terreno tardó ~540 ms y las siguientes 9–60 ms. Un timeout habría tardado ≥6 s. La forma corresponde a «NASA respondió → la respuesta se rechazó → enfriamiento local de 60 s sin volver a consultar».

## 2. Causa raíz (comprobada)

NASA POWER **API v2.10.1** devuelve en `geometry.coordinates` el punto solicitado **redondeado a tres decimales**:

| Solicitado (lat, lon) | Devuelto por NASA (lon, lat) |
| --- | --- |
| -0.934512, -78.615873 | -78.616, -0.935 |
| -1.0456, -78.5912 | -78.591, -1.046 |
| -0.8812, -78.5531 | -78.553, -0.881 |
| -0.93, -78.62 | -78.62, -0.93 |

`coincideCoordenadaNasa` solo aceptaba el valor idéntico o un redondeo a **centésimas** (comportamiento observado el 7 de noviembre). Un terreno marcado en el mapa tiene 6 decimales, así que toda respuesta NASA válida se rechazaba como «otra ubicación» → `ErrorClima` → HTTP 500. El respaldo solo existía para cinco coordenadas exactas, por lo que no cubría terrenos reales.

Reproducción local con el cliente de producción, sin base de datos:

```
CLIM OK     -0.93     -78.62      4139 ms
CLIM FALLA  -0.934512 -78.615873   718 ms  No hay climatología fiable…
HIST FALLA  -0.934512 -78.615873           No hay series históricas fiables…
```

El mismo defecto estaba en el código desplegado (`012d6be`, comprobación en línea equivalente) y en la candidata `d589f63` (función `coincideCoordenadaNasa`, que también usan las tendencias). **No era un backend antiguo, ni CORS, ni JWT, ni caché, ni Railway.**

Factores agravantes encontrados en la misma cadena:

1. El frontend sustituía cualquier 5xx por el texto genérico «No se pudo completar la solicitud».
2. El frontend esperaba 8 s; NASA tardó 4,1–4,9 s en consultas en frío y el backend cortaba a 6 s sin reintento.
3. Con dos consultas NASA activas, la tercera fallaba al instante en lugar de esperar turno.
4. La indisponibilidad del proveedor se devolvía como 500 («error interno») en lugar de 503.

## 3. Verificación de NASA POWER en vivo

Endpoints comprobados con HTTP 200 y `application/json`:

- Climatología: `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,GWETTOP,GWETROOT,ALLSKY_SFC_SW_DWN&community=AG&latitude=…&longitude=…&format=JSON`
- Mensual por años: `…/temporal/monthly/point?parameters=PRECTOTCORR,T2M_MIN,GWETTOP&…&start=2005&end=2024`
- Diaria: `…/temporal/daily/point?parameters=T2M_MIN&…&start=20050101&end=20241231&time-standard=LST` → 7.305 días.

Metadatos reales: POWER API v2.10.1; fuentes SYN1DEG, MERRA2, POWER; `fill_value` −999; estándar LST; climatología declarada «January 2001 – December 2025». Unidades: T2M/T2M_MIN/T2M_MAX `C`, PRECTOTCORR `mm/day`, RH2M `%`, GWETTOP/GWETROOT `1`, ALLSKY_SFC_SW_DWN `MJ/m^2/day`. Todos los parámetros tuvieron 12 meses válidos en los puntos de Cotopaxi probados.

Tiempos observados: 0,6–4,9 s (la primera consulta en frío es la más lenta).

### Cuadrícula nativa (base del respaldo)

NASA POWER devuelve el valor de la **celda nativa**, sin interpolar:

- Meteorología MERRA-2: celdas de 0,5° lat × 0,625° lon. Bordes observados: lat −0,75 (−0,749 y −0,751 dan valores distintos) y lon −78,4375 (−78,434 y −78,441 distintos).
- Radiación SYN1DEG: celdas de 1° × 1°. Borde observado en lon −79 (−78,999 y −79,001 solo difieren en ALLSKY_SFC_SW_DWN).
- Latacunga (−0,93, −78,62), Pujilí (−0,957, −78,696), (−0,80, −78,75), (−0,8812, −78,5531) y (−1,02, −78,70) devolvieron valores meteorológicos idénticos; (−1,02, −78,70) difiere solo en radiación (otra celda solar).

**Verificación del respaldo por celda:** `npm run clima:respaldos:verificar --workspace backend` consultó NASA en vivo con **48 puntos aleatorios de 6 decimales** (3 por celda) y comparó los 8 parámetros × 12 meses con el archivo archivado: **48/48 idénticos, 0 diferencias** (2026-11-09T23:00:44Z). Para las series mensuales y diarias 2005–2024, tres puntos de la misma celda MERRA-2 devolvieron series idénticas.

## 4. Correcciones

| Archivo | Cambio |
| --- | --- |
| `backend/src/services/nasaPower.ts` | Acepta redondeo a 2 o 3 decimales con tolerancia de media unidad del último decimal; sigue rechazando otra ubicación. Cliente: 10 s por intento, 1 reintento con espera solo ante red/timeout/429/5xx, verificación de `Content-Type`, cola de concurrencia (2 activas, 8 en espera), motivo clasificado y registro sin coordenadas ni datos personales. |
| `backend/src/services/cuadriculaNasa.ts` (nuevo) | Cálculo de celdas meteorológica y solar; devuelve `null` sobre un borde (no se presupone la asignación de NASA). |
| `backend/src/data/respaldosClima.ts` | Respaldo exacto (5 puntos originales) y, si no hay, respaldo de la **misma pareja de celdas** con advertencia explícita. |
| `backend/src/data/clima/celdas/` (nuevo) | 16 respuestas NASA oficiales (4 tramos de latitud × 4 de longitud de Cotopaxi), `procedencia.json` con URL, fecha, celda y SHA-256. |
| `backend/src/data/respaldosTendencia.ts`, `backend/src/data/tendencia/` (nuevos) | 9 celdas MERRA-2 × series mensual y diaria 2005–2024 con procedencia y SHA-256. |
| `backend/src/services/tendencia.ts` | Tras caché y dato anterior, usa el respaldo de la misma celda con estado `respaldo`; nunca lo escribe en caché. |
| `backend/src/routes/{clima,calendario,tendencia,pronostico}.ts` | Proveedor no disponible → **503**. Catálogo incompleto sigue siendo 500. |
| `frontend/src/lib/api.ts` | Muestra el mensaje del servidor en 503; 500 sigue genérico; distingue timeout (408 local) de falta de conexión; 25 s para clima/calendario/rotaciones/tendencia; tolera cuerpos no JSON de un proxy. |
| `frontend/src/components/ClimaTerreno.tsx`, `TendenciaTerreno.tsx` | Etiqueta exacta del estado `respaldo`. |
| `backend/scripts/descargarRespaldosCeldas.ts`, `verificarRespaldosCeldas.ts`, `descargarRespaldosTendencia.ts` | Descarga reproducible y verificación en vivo. |

## 5. Orden de recuperación climática

1. Caché PostgreSQL válida (<30 días) de la misma coordenada → `cache`.
2. NASA POWER en vivo (2 intentos) → `nasa`, se guarda en caché.
3. Dato previo válido de la misma coordenada, vencido → `desactualizado`, conserva su fecha.
4. Respuesta NASA archivada del mismo punto exacto o de la misma celda NASA → `respaldo`, con advertencia que identifica punto de referencia, celda y fecha de descarga. No se guarda en caché.
5. Nada fiable → **503** con explicación; la interfaz no dibuja cifras.

Nunca se usa otra celda, el punto más cercano, un promedio regional ni valores inventados.

Cobertura del respaldo de climatología: latitud −0,25° a −1,75°, longitud −79,6875° a −77,8125° (todo Cotopaxi agrícola), excepto puntos exactamente sobre un borde de celda.

## 6. Resultado local de extremo a extremo (NASA y Open-Meteo reales)

Backend local + PostgreSQL de desarrollo, terreno en Latacunga −0,934512, −78,615873 (altitud Open-Meteo 2.773 m), historial papa 2024 y papa 2025:

| Consulta | Resultado |
| --- | --- |
| Clima | 200 en 4,1 s, `estado_datos: nasa`, periodo 2001–2025; enero mín. 3,97 °C, lluvia 124 mm; julio mín. 2,39 °C, 65,1 mm |
| Calendario | 200, 120 celdas, 10 cultivos: 11 recomendado, 7 posible con cuidado, 102 no recomendado |
| Rotaciones | 200: actual 58,59; Papa → Vicia + avena → Papa 62,15; segunda sugerida no determinada (sin inventar puntaje) |
| Escenarios | −20 %: 0 celdas cambian; −30 %/+2 °C: 5; +30 %/−2 °C: 7. `lluvia_pct=31` → 400 |
| Tendencia | 200 en 1,4 s, mensual y diaria `nasa`, 20 años, 0 días ≤0 °C modelados en la celda |
| Pronóstico | 200, 7 días Open-Meteo, 0 alertas |
| PDF | 200, 75.820 bytes, `%PDF-` |
| Otra cuenta | 404 en terreno, clima, calendario, rotaciones, tendencia, pronóstico, PDF y siembras |
| Sin token | 401 |

Con +30 %/−2 °C las tres rotaciones quedan sin total: la mínima regional baja de 2 °C, el calendario excluye la papa (tolerancia a helada 2) en todos los meses y el motor no fabrica un ranking. Es el comportamiento previsto por las reglas 7.1–7.3.

## 7. Limitaciones científicas que se mantienen

- Datos regionales de ~50–70 km (meteorología) y ~110 km (radiación); no son mediciones del lote.
- T2M_MIN de la climatología es el producto mensual de NASA, no un conteo de heladas; las heladas se cuentan solo con la serie diaria (≤0 °C), distinta del umbral preventivo ≤2 °C del pronóstico.
- El respaldo archivado describe el mismo periodo que NASA declaraba al descargarlo; si NASA actualiza su climatología, el respaldo queda como «desactualizado» tras 30 días y debe volver a descargarse con `clima:respaldos:descargar`.
- Puntos exactamente sobre un borde de celda no tienen respaldo.

## 8. Recuperación operativa

- Volver a descargar respaldos: `npm run clima:respaldos:descargar --workspace backend` y `npm run tendencia:respaldos:descargar --workspace backend`; después ejecutar `clima:respaldos:verificar` y las pruebas.
- Revertir el backend: redeploy en Railway del despliegue `022133e1-d1e1-4d86-9c40-595f8e300cd8` (no revierte datos; no hay cambios de esquema en esta rama).
