# Informe de pronóstico y alertas preventivas de heladas — Prompt 09

## Alcance y continuidad

Implementación sobre `2fb472ee187ac19ccc9c6f6b9b98e56f18a4113d`, en `feat/base-datos-autenticacion`. La auditoría inicial confirmó Git limpio y la rama indicada. Se leyeron `PROYECTO.md`, `AGENTS.md` y los informes previos de persistencia, autenticación, terrenos/siembras y clima NASA.

Se añade exclusivamente pronóstico de siete días con alertas preventivas al detalle existente del terreno. Se mantienen climatología NASA, registro, login, perfil, catálogo, terrenos, siembras, mapas y persistencia. No se modifican los documentos protegidos, las seis tablas, el esquema Prisma o las migraciones aprobadas. No se instalan dependencias ni se cambian versiones o credenciales. Calendario, tendencias, rotaciones, simuladores, capas y PDF quedan pendientes.

## Endpoint y autorización

**GET `/api/terrenos/:id/pronostico`**.

- JWT validado, usuario y rol actuales de PostgreSQL.
- Agricultor: únicamente terrenos propios. Técnico: lectura de todos, sin nuevos permisos de escritura.
- Las coordenadas proceden del terreno en PostgreSQL; no se aceptan coordenadas, umbral, fechas ni otros parámetros de consulta enviados por el navegador.
- UUID inválido/consulta adicional: 400. Sin sesión válida: 401. Recurso ajeno o inexistente: mismo 404. Sin pronóstico fiable: 500 controlado. Exceso de consultas: 429 y Retry-After.
- Errores `{ "error": "mensaje" }`, sin trazas, SQL, datos de otro agricultor ni secretos. Se conserva CORS local y las respuestas privadas sin almacenamiento HTTP del navegador.

La serie se publica como `dias: [{ fecha, t_max, t_min, precipitacion_mm }]`, con siete elementos. Se conserva `alertas: [{ fecha, tipo, mensaje }]` del contrato original. El nombre del envoltorio diario y de los valores meteorológicos no estaba especificado; esta decisión técnica menor se documenta sin cambiar el contrato existente. Se añaden `fuente`, `actualizado_en`, `vigente_hasta`, `estado_datos`, `zona_horaria`, `coordenadas`, `cuadricula`, `unidades`, `umbral_helada_c`, `advertencias` y `aviso`.

## Integración oficial y evidencia real

Se consultaron [la documentación oficial](https://open-meteo.com/en/docs), [licencia](https://open-meteo.com/en/licence) y [condiciones](https://open-meteo.com/en/terms). Antes de programar la integración se ejecutó curl contra el endpoint exacto y se obtuvo **HTTP 200**:

```text
https://api.open-meteo.com/v1/forecast
  ?latitude=-0.93&longitude=-78.62
  &daily=temperature_2m_max,temperature_2m_min,precipitation_sum
  &timezone=America%2FGuayaquil&forecast_days=7
```

Unidades verificadas directamente en `daily_units`: `time=iso8601`, temperaturas **°C**, precipitación **mm**. La respuesta declara `timezone=America/Guayaquil`, `utc_offset_seconds=-18000`, cuadrícula **(-0.9490334, -78.59952)** y elevación de proveedor **2775 m**. La coordenada de cuadrícula puede diferir unos kilómetros de la solicitada; no se presenta como la ubicación exacta del lote ni se reemplazan las coordenadas guardadas.

También se ejecutó con código 0 el cliente de producción por separado:

```powershell
npm.cmd run pronostico:verificar --workspace backend
```

Consulta real finalizada el **2026-11-08T04:38:56.589Z**, equivalente al 7 de noviembre, 23:38 en Ecuador. No accede a ninguna base de datos. Resultado para el punto (-0.93, -78.62):

| Fecha local | Máxima °C | Mínima °C | Precipitación mm |
| --- | ---: | ---: | ---: |
| 2026-11-07 | 19.8 | 10.2 | 8.6 |
| 2026-11-08 | 20.3 | 9.1 | 2.1 |
| 2026-11-09 | 20.1 | 10.5 | 0.3 |
| 2026-11-10 | 19.6 | 9.4 | 0.5 |
| 2026-11-11 | 20.6 | 8.6 | 0.9 |
| 2026-11-12 | 20.0 | 8.1 | 2.1 |
| 2026-11-13 | 20.5 | 8.1 | 2.7 |

Esa respuesta real no genera alertas al umbral de 2 °C. La tabla documenta una comprobación pasada: **no es un pronóstico actual permanente ni un respaldo servido por la aplicación**. Las respuestas sintéticas de pruebas sí incluyen temperaturas que activan alertas y no se confunden con esta verificación.

## Validación, fechas y metodología

- `openMeteo.ts` es independiente de Express, recibe fetch/reloj inyectables y utiliza exclusivamente la URL HTTPS oficial con parámetros fijos y coordenadas numéricas válidas.
- Se valida JSON, estructura, zona/offset y unidades, siete valores por arreglo, fechas civiles reales consecutivas y correspondencia del primer día con el día de consulta en Ecuador continental. Los siete días incluyen hoy y los seis siguientes, conforme al comportamiento del endpoint.
- Se preservan las fechas `AAAA-MM-DD`; el formato visual usa explícitamente `America/Guayaquil`. Las pruebas incluyen medianoche 05:00 UTC, cambio de año y febrero bisiesto. La zona del servidor o del navegador no desplaza el día mostrado.
- Se admiten null explícitos con advertencias. Temperaturas deben ser números finitos entre -100 y 70 °C, y la mínima no puede superar la máxima. Precipitación entre 0 y 2000 mm/día como validación física conservadora. Un dato inválido, relleno como -999, cadena o arreglo incompleto rechaza la respuesta; no se convierte en un número aparentemente válido. Sin ninguna medición utilizable se informa indisponibilidad.
- Los mm son **precipitación diaria prevista**, que incluye lluvia, chubascos y nieve según la definición de Open-Meteo. No se multiplican por días del mes ni se mezclan con PRECTOTCORR de NASA.
- No se añade una corrección de altitud propia, ni se utiliza la regla de incremento de riesgo histórico de NASA. Open-Meteo puede efectuar su ajuste estadístico habitual por elevación; se mantienen los parámetros originales, sin forzar elevación o modelo. No se atribuye a la respuesta un modelo específico, resolución exacta, hora de emisión o probabilidad que no declare.

## Alertas

Regla predeterminada: **mínima prevista ≤2 °C**, comparada antes de dar formato al número. Cada día afectado tiene `{ fecha, tipo: 'helada', mensaje }`. El mensaje menciona el día, la mínima y revisión de condiciones locales/medidas de protección. Sin mínima válida no se produce una falsa conclusión de ausencia de riesgo.

El umbral es configurable mediante la variable opcional del servidor **`UMBRAL_HELADA_C`**, entre -10 y 10 °C con hasta dos decimales y punto decimal. Por defecto 2; el ejemplo público contiene ese valor. Una configuración inválida produce un error claro al construir la aplicación y detiene su arranque. No se modifica el `.env` privado ni se requiere configuración manual para el valor original.

Las alertas se calculan después de recuperar los datos base de la caché: un cambio autorizado de configuración al reiniciar no conserva alertas calculadas con otro umbral. Son indicadores preventivos de RotaAndes, **no avisos oficiales, observaciones ni confirmación de helada**. La ausencia de alertas tampoco garantiza ausencia de heladas locales.

## Caché corta y disponibilidad

Se reutiliza `clima_cache` sin migraciones. Clave `open_meteo_forecast_v1_<latitud>_<longitud>`, con las coordenadas exactas, distinta de las claves NASA. JSONB contiene versión, ubicación solicitada, cuadrícula, zona, fecha original y siete días normalizados; no guarda alertas dependientes del umbral.

Vigencia máxima de **30 minutos**, limitada por la próxima medianoche de Ecuador continental. Se valida estructura, valor, ubicación, antigüedad no negativa y coincidencia del instante SQL/JSON; el reloj UTC de las conexiones Prisma aprobado en la fase anterior se conserva. Se comprueba de nuevo la vigencia antes de responder. Al vencer se consulta el proveedor: **nunca se sirve pronóstico vencido ni respaldo estático**. Fallo sin caché vigente devuelve error controlado con opción de reintento; la entrada previa no se destruye ni se rejuvenece.

Estados `open_meteo` y `cache`. La fecha mostrada corresponde a la consulta, sin afirmar que sea la emisión del modelo. Las solicitudes simultáneas al mismo punto comparten una consulta/persistencia. Errores externos activan un minuto de enfriamiento por punto (hasta 500 claves); errores de base de datos se propagan al manejo central de fallos y no se disfrazan de fallo meteorológico.

Límites por proceso: máximo dos llamadas externas concurrentes, veinte/minuto, doscientas/hora y dos mil/día. Lecturas de la ruta: treinta/minuto/usuario. Timeout de seis segundos incluyendo lectura, cuerpo máximo 64 KiB, rechazo de redirecciones, HTTP no exitoso y JSON inválido. Los límites no se comparten entre réplicas; la cuota del proveedor comprende IP/aplicación y las otras integraciones, por lo que el despliegue requerirá revisar esa coordinación.

## Interfaz y sesión

Se añade `PronosticoTerreno` al detalle, sin reconstruir la página ni el panel NASA. Se abre a petición y muestra siete tarjetas con día/fecha, mínima, máxima, precipitación, iconos/etiquetas, alertas con texto y colores complementarios, actualización, fuente y licencia. Mantiene verde/tierra, tipografía y controles de la aplicación.

Incluye carga, indisponibilidad/reintento, datos incompletos, actualización y ausencia de alertas con sus límites. Los null aparecen como **Sin dato**; mínima ausente significa riesgo no evaluable. Las respuestas vacías/inválidas no producen tarjetas o cifras de reemplazo.

Mientras está abierto se consulta cada minuto al backend, que respeta sus treinta minutos de caché. **Comprobar actualización** no evade esa caché ni fuerza llamadas externas ilimitadas. Un temporizador retira los datos cuando vence `vigente_hasta`; también se revisa el reloj periódicamente y al recuperar foco. No se conserva un pronóstico vencido como actual tras error de red.

Las llamadas y la validación de respuesta se centralizan en `frontend/src/lib/api.ts`. TanStack Query separa claves por usuario, terreno y coordenadas. Se conservan cancelación y comprobación de sesión activa; hay pruebas específicas de respuesta tardía al cerrar y al cambiar de cuenta. El frontend valida asimismo fechas, siete días, unidades y correspondencia entre alertas y umbral.

## Pruebas y evidencia visual

Validación completa ejecutada con código de salida **0** mediante `npm.cmd run check`, incluyendo:

| Comprobación | Resultado |
| --- | --- |
| `npm.cmd run lint` | 0 errores, 0 advertencias |
| `npm.cmd run typecheck` | Aprobado, herramientas y ambos paquetes estrictos |
| `npm.cmd run test` | Backend **162/162** y frontend **54/54** |
| `npm.cmd run test:db` | PostgreSQL **103/103**, cinco suites |
| `npm.cmd run build` | Backend y frontend compilados, Prisma 7.10.1 |
| Playwright / Edge | **14/14**, siete recorridos × escritorio/celular |
| **Total de check** | **333 aprobadas, ninguna fallida** |
| `pronostico:verificar` | Código 0, Open-Meteo real, sin conexión SQL |

La suite preserva las 282 pruebas anteriores y añade 51: 34 unitarias de backend, 10 de frontend, 5 de integración SQL/HTTP y 2 ejecuciones E2E. Comprueba respuestas válidas, números/unidades, umbral inclusivo y configurable, ausencia de alertas, fechas/zona, nulos/incompletos/inválidos, red/HTTP/timeout, concurrencia y límites, vigencia/expiración/medianoche, separación de claves, autorización horizontal, técnico, falta de JWT, consulta manipulada, JSONB y limpieza. Frontend comprueba estados, rechazo de falsos datos, reintento, retirada por vencimiento y cambio de sesión.

Las pruebas normales de pronóstico no consultan Internet. Usan datos **sintéticos** con valores/fechas controlados exclusivamente en tests. Las E2E sí ejecutan frontend, backend y PostgreSQL reales, con usuario aleatorio y una entrada de caché temporal sintética; el fallo HTTP se simula expresamente. Se comprueban siete tarjetas, tres alertas, mínima desconocida, fuente/licencia, actualización y ausencia de tarjetas tras error, además de documento sin desbordamiento horizontal. La prueba espera la carga diferida del mapa antes de capturar el panel. Las otras E2E conservan las integraciones externas previas de mapa/elevación.

Capturas locales generadas y revisadas, excluidas de Git. **Ilustran datos de pruebas, no la respuesta meteorológica real de la tabla anterior**:

- [Pronóstico en escritorio](../test-results/pronostico-pronóstico-y-al-29087-ilidad-sin-datos-inventados-escritorio/pronostico.png).
- [Pronóstico en celular](../test-results/pronostico-pronóstico-y-al-29087-ilidad-sin-datos-inventados-celular/pronostico.png).
- [Fallo en escritorio](../test-results/pronostico-pronóstico-y-al-29087-ilidad-sin-datos-inventados-escritorio/pronostico-no-disponible.png).
- [Fallo en celular](../test-results/pronostico-pronóstico-y-al-29087-ilidad-sin-datos-inventados-celular/pronostico-no-disponible.png).

## Atribución y limitaciones

Cada vista con los datos enlaza [Open-Meteo](https://open-meteo.com/) y [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), e indica que RotaAndes calcula las alertas. No implica respaldo del proveedor al proyecto. La licencia de los datos permite reutilización con atribución; el servicio gratuito se reserva para uso no comercial según [sus condiciones](https://open-meteo.com/en/terms). Sus cuotas verificadas son inferiores a 600/minuto, 5000/hora y 10000/día. Este alcance local no comercial no configura un servicio de pago ni un despliegue.

Limitaciones: incertidumbre del pronóstico, relieve y microclimas locales, temperatura del aire a 2 m distinta de la temperatura del cultivo/suelo, datos eventualmente incompletos, cambios de modelo/cuadrícula, disponibilidad externa sin garantía y límites por proceso. Un umbral simple no estima probabilidad ni reemplaza asesoramiento agrícola o medidas locales. La actualización consultada no prueba una nueva emisión del modelo. Las limitaciones previas de sesión JWT y despliegue continúan documentadas en las fases correspondientes.

## Base de datos, seguridad y Git

No se crea, borra o recrea ninguna base ni se altera una migración. Las pruebas SQL hacen rollback en la base aislada; E2E elimina exclusivamente su usuario aleatorio y restaura la entrada previa de caché, si existía. No se generan datos productivos de prueba, cuentas demo ni contraseñas predeterminadas.

La comprobación posterior de solo lectura confirmó:

| Base | Usuarios | Terrenos | Cultivos | Siembras | Plantillas | Clima/caché |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `rotaandes_dev` | 0 | 0 | 10 | 0 | 0 | 0 |
| `rotaandes_pruebas_36cbc85c` | 0 | 0 | 0 | 0 | 0 | 0 |

`prisma migrate status` informa **ambas bases actualizadas, sin migraciones pendientes**. Se conserva únicamente `20261107000100_esquema_inicial`, aplicada; no quedan fixtures ni bases de prueba adicionales.

Se revisan contenido de archivos, secretos y artefactos antes de registrar el commit. `.env`, pgpass, claves privadas, dependencias, dist, cliente generado, capturas, resultados y temporales siguen excluidos. No se modifica el lockfile ni se instala ninguna dependencia. Los hashes originales de `PROYECTO.md` y `AGENTS.md` se conservan y `main` permanece en `ee4f8c8542744ddecf64a5f2ab58d6993e6e3431`.

La fase se registra únicamente después de aprobar las comprobaciones y revisar el índice, con `Implementar pronostico y alertas de heladas`. El hash y estado limpio final se comunican en la entrega para evitar autorreferencia dentro del commit. No hay push, merge o despliegue.

## Archivos de la fase

Nuevos (12):

- `backend/src/services/openMeteo.ts`, `backend/src/services/pronostico.ts` y `backend/src/routes/pronostico.ts`.
- `backend/scripts/verificarPronostico.ts`.
- `backend/tests/openMeteo.test.ts`, `backend/tests/pronostico.test.ts`, `backend/tests/fixtures/pronosticoPruebas.ts` y `backend/tests/base-datos/pronostico.integration.test.ts`.
- `frontend/src/components/PronosticoTerreno.tsx` y `frontend/src/components/PronosticoTerreno.test.tsx`.
- `tests/navegador/pronostico.spec.ts`.
- `docs/INFORME_PRONOSTICO_HELADAS.md`.

Modificados (8):

- `backend/src/aplicacion.ts`, `backend/package.json` y `backend/.env.example`.
- `frontend/src/lib/api.ts`, `frontend/src/types/api.ts` y `frontend/src/pages/DetalleTerreno.tsx`.
- `README.md` y `docs/DECISIONES.md`.

Esta fase finaliza con el pronóstico y las alertas para revisión; no inicia el calendario agrícola.
