# Informe de climatología histórica NASA POWER — Prompt 08

> **Registro histórico de esta fase.** Se conservan sus fechas, versiones, cifras y resultados; las menciones a publicación pendiente o a repositorio privado describen ese momento. Para la versión vigente, las instrucciones actuales y las evidencias verificadas el 15-11-2026, consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los comandos de publicación, migración o reversión de este registro no son instrucciones para la auditoría documental actual.

## Alcance y estado

Implementación sobre `209f70d36b47a1d173729ec7c49d65c7841c0f58`, en `feat/base-datos-autenticacion`. Se incorpora climatología histórica al detalle del terreno existente, con autenticación, autorización, validación científica, caché PostgreSQL y gráficas responsive. Se conservan registro, acceso, perfil, terrenos, siembras, mapa y catálogo.

No se modifican `PROYECTO.md`, `AGENTS.md`, el esquema Prisma ni la migración aplicada. No se implementan pronósticos, tendencias, calendario, rotaciones, simuladores, SMAP, MODIS ni PDF. No se cambian credenciales, se eliminan bases, se hace push, merge o despliegue.

## Endpoints y verificación real

- Aplicación: **GET `/api/terrenos/:id/clima`**, Bearer obligatorio. Agricultor: únicamente terrenos propios; técnico: lectura de todos. UUID ajenos e inexistentes comparten 404. UUID inválido o parámetros de consulta: 400; sin autenticación: 401; sin fuente fiable: 500 controlado; exceso de consultas: 429. Se conserva `{ "error": "mensaje" }` y CORS local.
- Proveedor: **GET `https://power.larc.nasa.gov/api/temporal/climatology/point`**, `community=AG`, `format=JSON`, ocho parámetros, coordenadas obtenidas exclusivamente de PostgreSQL. No hay claves NASA ni solicitudes científicas directas del navegador.

La solicitud inicial se verificó con curl y respondió HTTP 200 para (-0.93, -78.62), Cotopaxi. Se obtuvieron además cuatro respuestas HTTP 200 de los puntos de referencia indicados abajo. Todos los parámetros solicitados estuvieron disponibles con doce valores mensuales válidos en los archivos archivados. No fue necesario omitir ni reemplazar parámetros.

Comprobación real adicional ejecutada con código 0:

```powershell
npm.cmd run clima:verificar --workspace backend
```

Este comando usa el cliente de producción sin acceder a PostgreSQL. La consulta de comprobación terminó el **2026-11-08T04:04:02.938Z** (7 de noviembre, hora de Ecuador). Los archivos de respaldo conservan sus propias fechas anteriores, sin sustituirlas por la de esa comprobación.

Metadatos reales: POWER API **2.10.1**, fuentes **SYN1DEG, MERRA2, POWER**, relleno **-999**, estándar temporal **LST**, periodo declarado **enero de 2001 a diciembre de 2025**. La respuesta usa `header.range`; no se inventan años si falta un periodo interpretable.

| Parámetro | Unidad real declarada | Tratamiento |
| --- | --- | --- |
| T2M | `C` | `t_med`, °C a 2 m |
| T2M_MIN | `C` | `t_min`, mínima del producto climatológico |
| T2M_MAX | `C` | `t_max`, máxima del producto climatológico |
| PRECTOTCORR | `mm/day` | Conversión a lluvia mensual estimada |
| RH2M | `%` | Conservado en parámetros/metadatos; no es humedad del suelo |
| GWETTOP | `1` | Índice superficial 0–1 conservado; no sustituye GWETROOT |
| GWETROOT | `1` | `humedad_suelo`, índice de zona de raíces 0–1 |
| ALLSKY_SFC_SW_DWN | `MJ/m^2/day` | Conservado con su unidad real, sin asumir kWh |

Ejemplo comprobable de **enero** en el JSON real de Latacunga: mínima **3,97 °C**, media **11,86 °C**, máxima **21,03 °C**, PRECTOTCORR **4 mm/día**, GWETROOT **0,68**. La conversión implementada devuelve **124 mm**. El riesgo heurístico sería medio por temperatura y alto si la altitud guardada del terreno fuera ≥3400 m. El componente de elevación Z de la geometría NASA no sustituye `altitud_m` del terreno.

La salida pública incluye `mensual` con doce objetos `{ mes, t_min, t_max, t_med, lluvia_mm, humedad_suelo, riesgo_helada }`, `fuente`, `resolucion`, `periodo`, `actualizado_en`, `estado_datos`, `desactualizado`, `coordenadas`, `parametros`, `advertencias` y `metodologia`. El envoltorio mensual y los metadatos técnicos no estaban definidos en el documento original; se documentó la decisión sin cambiar los campos originales.

## Método y limitaciones científicas

1. Se extraen JAN–DEC en orden 1–12. ANN no se añade como un mes adicional.
2. Cada parámetro se utiliza únicamente si su unidad coincide con la verificada. Datos ausentes, null, códigos de relleno, cadenas, valores no finitos o fuera de límites físicos conservan null y generan advertencias. No se interpola ni se reemplaza un dato ausente por cero. Cero auténtico de precipitación sí se conserva.
3. Temperaturas incoherentes (mínima mayor que máxima, o media fuera de ambas) se anulan para ese mes. Si no queda ninguna medición principal utilizable, se informa indisponibilidad.
4. Lluvia mensual estimada = PRECTOTCORR en mm/día × días medios del mes en el periodo declarado. Se emplea el calendario gregoriano y se incluyen ambos años extremos. En 2001–2025 hay seis febreros bisiestos: **28 + 6/25 = 28,24 días**; **4,99 × 28,24 = 140,92 mm** para febrero. Se redondea la lluvia derivada a dos decimales; las temperaturas conservan su precisión original. Esta aproximación no equivale a acumular observaciones diarias de un año ni reconstruye la covariación entre lluvia y años bisiestos.
5. Riesgo de helada según la regla original: mínima ≤2 °C alto; >2 y ≤5 medio; >5 bajo. Altitud ≥3400 m eleva un nivel, limitado a alto. Se clasifica antes de redondear, fuera del dato base compartido en caché. Sin mínima, riesgo null; sin altitud se informa que no se aplicó el ajuste.
6. T2M_MIN/MAX son los productos solicitados, distintos de los parámetros MIN_AVG/MAX_AVG descritos por NASA. No se reinterpretan como medias de extremos diarios ni permiten contar días de helada. El indicador es **heurístico**, sin probabilidad calibrada ni validación agronómica local.
7. GWETROOT es un índice adimensional de humedad, sin equivalencia automática a contenido volumétrico o porcentaje de agua aprovechable.
8. La cuadrícula meteorológica de origen es **0,5° × 0,625°** (aproximadamente 50–70 km cerca de Cotopaxi), y la solar **1° × 1°**. Los valores representan la zona, con limitaciones especialmente relevantes en relieve andino. La altitud solo ajusta la categoría heurística, sin corregir las temperaturas ni la lluvia regional.
9. El periodo climatológico y la fecha de consulta son conceptos distintos. Una respuesta consultada hoy sigue describiendo 2001–2025; no es tiempo actual ni pronóstico. La disponibilidad, unidades o periodo de NASA pueden cambiar y requieren revalidación.

## Caché, respaldo y protección del proveedor

Se reutiliza `clima_cache` sin nuevas tablas, columnas, restricciones ni migraciones. Clave estable: `power_clim_v1_<latitud>_<longitud>`, sin redondear ubicaciones distintas. JSONB contiene versión, ubicación exacta, periodo, fecha original, ocho series/unidades y advertencias. Se comprueban tipos, rango, coherencia, ubicación, fecha no futura y coincidencia del instante SQL/JSON.

Vigencia: **30 días** desde la consulta original; al cumplirse exactamente ese plazo se intenta renovar. Una lectura no actualiza la fecha. Peticiones simultáneas al mismo punto comparten consulta y persistencia, y el riesgo se calcula después con la altitud de cada terreno.

Estados explícitos:

- `nasa`: solicitud externa reciente validada y persistida.
- `cache`: dato previo válido con menos de 30 días, sin llamada NASA.
- `desactualizado`: NASA falló y se reutilizó el dato previo válido de esa misma ubicación, conservando su fecha.
- `respaldo`: respuesta real archivada coincidente exactamente con el punto. El indicador `desactualizado` comunica también si este archivo tiene al menos 30 días.

Ante fallo se prefiere un dato previo válido si es igual o más reciente que el respaldo. No se inserta el respaldo como si acabara de consultarse. No se utiliza el punto regional más cercano. Sin coincidencia y sin información previa fiable, se devuelve un error controlado y la interfaz no representa cifras.

Archivos públicos de respaldo en `backend/src/data/clima/`, obtenidos directamente de NASA:

| Referencia | Latitud | Longitud | Recuperación UTC |
| --- | --- | --- | --- |
| Latacunga | -0.93 | -78.62 | 2026-11-08T03:53:14.301Z |
| Pujilí | -0.957 | -78.696 | 2026-11-08T03:56:41.425Z |
| Saquisilí | -0.84 | -78.667 | 2026-11-08T03:56:42.151Z |
| Salcedo | -1.045 | -78.591 | 2026-11-08T03:56:42.925Z |
| Páramo | -0.75 | -78.55 | 2026-11-08T03:56:43.527Z |

Son puntos de referencia seleccionados, sin atribuirles condición de centroides oficiales ni de parcelas medidas. `procedencia.json` conserva URL completa, archivo, coordenadas, fecha y SHA-256 de los bytes originales. Las pruebas verifican los cinco hashes y la coincidencia geográfica. Los JSON archivados son datos reales; no son fixtures sintéticas de producción.

Cliente HTTP: espera máxima **6 segundos**, respuesta máxima **256 KiB**, redirecciones rechazadas, validación estricta y error público estático sin trazas. Máximo dos consultas concurrentes y veinte/minuto por proceso. La ruta permite treinta solicitudes/minuto por usuario. Tras fallo se espera un minuto antes de volver a consultar ese punto; el registro de enfriamiento se acota a 500 claves. Estos límites y la deduplicación son locales al proceso, sin coordinación entre réplicas. No se silencian errores internos de PostgreSQL.

## Interfaz y accesibilidad

El detalle existente incorpora un panel cerrado inicialmente. Abrirlo carga la climatología con TanStack Query y, de forma diferida, Recharts **3.10.1**. Incluye barras de lluvia, tres líneas de temperatura diferenciadas por color y trazo, leyendas, tooltips, doce meses en español y unidades. Los nulos mantienen huecos; si una gráfica carece de datos se informa explícitamente.

La tabla tiene caption, encabezados semánticos y desplazamiento horizontal por teclado dentro de su contenedor. Los riesgos incluyen texto Alto/Medio/Bajo/Sin dato; no dependen solo del color. Se muestran fuente, periodo, fecha, resolución, origen, antigüedad, advertencias y método, además de carga, error y reintento. Se conserva la identidad verde/tierra y no aparece desbordamiento horizontal del documento en el recorrido móvil.

Las llamadas siguen centralizadas en `frontend/src/lib/api.ts` y se validan en ejecución. La clave privada incluye usuario, terreno, coordenadas y altitud. Se reutilizan cancelación, limpieza de caché y comprobación de sesión activa; una respuesta tardía de una sesión cerrada no se presenta.

## Problema real corregido

La primera E2E detectó que una caché recién escrita con pg no se reutilizaba. El adaptador Prisma 7.10.1 instalado interpretó `2026-11-08T04:13:17.858Z` como `2026-11-07T23:13:17.858Z`, cinco horas antes. La normalización del adaptador reemplazaba el offset al leer TIMESTAMPTZ. La comparación de fechas SQL/JSON detectó la diferencia e impidió aceptar una fecha incorrecta.

Se fijó **UTC por conexión Prisma** mediante `options: '-c TimeZone=UTC'`, en la instancia de aplicación y las cuatro suites de integración. No se modifican la configuración global de PostgreSQL, contraseñas, esquema, versiones ni datos ajenos. Una regresión comprueba SQL→Prisma con ISO y Prisma→SQL con EXTRACT(EPOCH), incluida precisión de milisegundos. Después del cambio pasaron la regresión y ambas E2E. [Incidencia documentada por Prisma](https://github.com/prisma/orm/issues/28629).

## Resultados ejecutados

Validación completa final ejecutada el **7 de noviembre de 2026**, hora de Ecuador:

| Comprobación | Resultado real |
| --- | --- |
| `npm.cmd run lint` (incluido en check) | Código 0, cero advertencias ESLint |
| `npm.cmd run typecheck` (incluido en check) | Código 0, herramientas y ambos paquetes |
| `npm.cmd run test` (incluido en check) | Código 0: backend 128/128; frontend 44/44 |
| `npm.cmd run test:db` | Código 0: 98/98, cuatro archivos de integración |
| `npm.cmd run build` (incluido en test:e2e/check) | Código 0, Prisma generado y ambos paquetes compilados |
| Playwright, Edge real | 12/12, seis recorridos × escritorio/celular |
| `npm.cmd run check` | **Código de salida 0**; lint → tipos → unitarias → PostgreSQL → build/E2E |
| `clima:verificar` | Código 0, respuesta NASA real independiente de las pruebas |
| `db:status` y estado Prisma de pruebas | Ambas bases al día, ninguna migración pendiente |

Total de la validación completa: **282 pruebas aprobadas**. Se ejecutaron las pruebas previas de registro/login/perfil, salud, CORS, terrenos, mapa, catálogo, siembras y persistencia.

Cobertura nueva: ocho unidades/meses/procedencia, parámetros ausentes, null/relleno/-999, valores no finitos, rangos y temperaturas incoherentes, lluvia/febrero/bisiestos/redondeos, umbrales/altitud/riesgo nulo, timeout real de señal con fetch controlado, HTTP 400/422/429/500, JSON inválido, red y límite de tamaño; deduplicación, fecha/caché válida/vencida/corrupta, respaldo exacto y ausencia de dato fiable; acceso horizontal, falta de JWT, técnico, cambio de ubicación y persistencia JSONB/UTC. Frontend: carga, nulos, fallo/reintento, respaldo/desactualizado, contrato inválido y respuesta tardía.

Las E2E climáticas usan backend y PostgreSQL reales, usuario efímero y caché temporal **simulada**, basada en el archivo real y marcada con una advertencia visible. No realizan llamadas NASA. Verifican periodo, trece filas incluyendo encabezado, dos gráficas Recharts y tres curvas, riesgo ajustado por altitud, tabla accesible y documento sin desbordamiento. Después se simula un HTTP 500 para comprobar ausencia de tabla y gráficas. Las pruebas SQL validan también el fallo del proveedor del lado del servidor. Otras E2E existentes de mapa/elevación conservan sus integraciones anteriores.

Capturas producidas por Playwright y revisadas visualmente (ignoradas por Git):

- Climatología en escritorio (`../test-results/clima-climatología-con-cac-b5814-onibilidad-sin-datos-falsos-escritorio/climatologia.png`, artefacto local no versionado).
- Climatología en celular (`../test-results/clima-climatología-con-cac-b5814-onibilidad-sin-datos-falsos-celular/climatologia.png`, artefacto local no versionado).
- Indisponibilidad en escritorio (`../test-results/clima-climatología-con-cac-b5814-onibilidad-sin-datos-falsos-escritorio/clima-no-disponible.png`, artefacto local no versionado).
- Indisponibilidad en celular (`../test-results/clima-climatología-con-cac-b5814-onibilidad-sin-datos-falsos-celular/clima-no-disponible.png`, artefacto local no versionado).

Las capturas ilustran la fixture E2E identificada, no una consulta NASA en vivo. Se regeneran al ejecutar la suite y no quedan almacenadas en el commit.

## PostgreSQL, seguridad y Git

Se comprobó en modo de solo lectura:

- `rotaandes_dev`: usuarios 0, terrenos 0, cultivos **10** autorizados, siembras 0, plantillas 0 y clima_cache 0.
- `rotaandes_pruebas_36cbc85c`: las seis tablas con **0** registros después de las pruebas; sin acumulación de fixtures ni nuevas bases.
- Ambas conservan aplicada `20261107000100_esquema_inicial`. No se crean ni ejecutan migraciones nuevas, resets o cambios destructivos.

La revisión de contenido, valores privados locales y patrones de credenciales no encontró secretos en archivos a registrar. `.env`, pgpass, claves/certificados privados, node_modules, dist, cliente generado, capturas, resultados y temporales permanecen ignorados. `git ls-files backend/.env` devuelve vacío. Se comprobaron registros públicos/integridad del lockfile; solo se añade Recharts con sus dependencias, sin cambiar versiones anteriores ni añadir nuevos scripts de instalación. Prisma se conserva en 7.10.1.

Se verificaron los hashes originales de `AGENTS.md` y `PROYECTO.md`, y ausencia de diferencias en `backend/prisma/`. `main` conserva `ee4f8c8542744ddecf64a5f2ab58d6993e6e3431`. El commit de esta fase se prepara únicamente tras superar las comprobaciones y la revisión del índice. Su hash y estado final de Git se entregan en el informe de cierre de la conversación, evitando una referencia circular dentro del propio commit.

## Archivos de esta entrega

Nuevos (20):

- `backend/scripts/verificarNasa.ts`.
- `backend/src/data/clima/latacunga.json`, `paramo.json`, `pujili.json`, `salcedo.json`, `saquisili.json` y `procedencia.json`.
- `backend/src/data/respaldosClima.ts`.
- `backend/src/routes/clima.ts`.
- `backend/src/services/nasaPower.ts` y `clima.ts`.
- `backend/tests/nasaPower.test.ts`, `clima.test.ts`, `fixtures/nasaPruebas.ts` y `base-datos/clima.integration.test.ts`.
- `frontend/src/components/ClimaTerreno.tsx`, `GraficasClima.tsx` y `ClimaTerreno.test.tsx`.
- `tests/navegador/clima.spec.ts`.
- `docs/INFORME_CLIMA_NASA.md`.

Modificados (14):

- `backend/package.json`, `backend/tsconfig.json`, `backend/src/aplicacion.ts` y `backend/src/lib/prisma.ts`.
- `backend/tests/base-datos/persistencia.integration.test.ts`, `autenticacion.integration.test.ts` y `terrenosSiembras.integration.test.ts` (misma configuración UTC de aplicación).
- `frontend/package.json`, `frontend/src/lib/api.ts`, `frontend/src/types/api.ts` y `frontend/src/pages/DetalleTerreno.tsx`.
- `package-lock.json`, `README.md` y `docs/DECISIONES.md`.

## Referencias primarias

- [Documentación NASA POWER](https://power.larc.nasa.gov/docs/).
- [API de climatología](https://power.larc.nasa.gov/docs/services/api/temporal/climatology/).
- [Procesamiento y definiciones de extremos](https://power.larc.nasa.gov/docs/methodology/data/processing/).
- [Fuentes y cuadrícula meteorológica](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/).
- [Servicios NASA POWER](https://power.larc.nasa.gov/docs/services/).

No quedan errores críticos ni pruebas fallidas conocidos en esta fase. Persisten las limitaciones científicas y de disponibilidad señaladas; los módulos futuros requieren una fase independiente.
