# Tendencias climáticas históricas 2005–2024

> **Registro histórico de esta fase.** Se conservan sus fechas, versiones, cifras y resultados; las menciones a publicación pendiente o a repositorio privado describen ese momento. Para la versión vigente, las instrucciones actuales y las evidencias verificadas el 15-11-2026, consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los comandos de publicación, migración o reversión de este registro no son instrucciones para la auditoría documental actual.

Fecha: 8 de noviembre de 2026, America/Guayaquil (UTC−5). Rama local: `feat/tendencias-climaticas`, creada desde `c2d4252ecc60fc4a669b0075792b3a967e2c8431`. Publicación conservada: aplicación `012d6be`, sin push ni despliegue de esta fase.

## Implementación y contrato

`GET /api/terrenos/:id/tendencia`, JWT obligatorio. Agricultor: solo terreno propio; técnico: lectura conforme a los permisos existentes. UUID válido y ningún parámetro de consulta. Coordenadas leídas de PostgreSQL; accesos ajenos e inexistentes comparten 404. Se mantienen errores `{ "error": "mensaje" }`, con 400/401/404/429/500 según el caso. La ruta no modifica terrenos, siembras, prioridades ni datos climáticos originales.

El éxito contiene `anual` con veinte filas de 2005 a 2024, `fuente`, `periodo`, `coordenadas`, `resolucion`, `unidades`, `fuentes.mensual`, `fuentes.diario`, `cobertura_diaria`, `tendencias`, `metodologia`, `advertencias` y `aviso`. Cada fila conserva `anio`, `lluvia_mm`, `t_min`, `humedad_suelo`, `dias_helada` y conteos de cobertura. Null significa que falta cobertura completa, nunca cero. Los campos de metadatos completan el contrato original, que definía la ruta y las variables sin especificar un JSON de éxito.

Ejemplo **real de la verificación de Latacunga**, no de una parcela registrada:

```json
{
  "anio": 2005,
  "lluvia_mm": 622.18,
  "t_min": 3.86,
  "humedad_suelo": 0.559178,
  "dias_helada": 0,
  "cobertura": {
    "meses_lluvia": 12,
    "meses_temperatura": 12,
    "meses_humedad": 12,
    "dias_temperatura": 365,
    "dias_esperados": 365
  }
}
```

## NASA comprobada realmente

Se consultaron la [documentación oficial](https://power.larc.nasa.gov/docs/), los servicios [mensual](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/) y [diario](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) y la descripción de [procesamiento](https://power.larc.nasa.gov/docs/methodology/data/processing/). Se ejecutó curl contra ambos endpoints antes de integrarlos. Posteriormente `npm.cmd run tendencia:verificar --workspace backend` ejecutó el cliente implementado contra NASA con código 0, sin conectar PostgreSQL.

Punto público de referencia: latitud −0,93, longitud −78,62. Consulta del servicio: mensual **2026-11-09T02:10:21.495Z**, diaria **2026-11-09T02:10:21.729Z** (8 de noviembre, Ecuador). NASA devolvió 240 meses, 7.305 días válidos, veinte años completos y GWETTOP disponible. Versiones observadas: Monthly v2.10.0 y Daily v2.10.3; fuentes MERRA2/POWER, relleno −999 y estándar LST. Se solicitaron:

```text
https://power.larc.nasa.gov/api/temporal/monthly/point
  ?parameters=PRECTOTCORR,T2M_MIN,GWETTOP&community=AG
  &latitude=-0.93&longitude=-78.62&start=2005&end=2024&format=JSON

https://power.larc.nasa.gov/api/temporal/daily/point
  ?parameters=T2M_MIN&community=AG&latitude=-0.93&longitude=-78.62
  &start=20050101&end=20241231&format=JSON&time-standard=LST
```

| Variable | Unidad original verificada | Tratamiento |
| --- | --- | --- |
| PRECTOTCORR mensual | mm/day | Tasa, no total mensual; multiplicar por días reales y sumar doce meses completos. |
| T2M_MIN mensual | C | Menor extremo mensual del año; no media de mínimas diarias. |
| GWETTOP mensual | 1 | Índice 0–1 superficial; media ponderada por días. No porcentaje de humedad relativa ni humedad volumétrica SMAP. |
| T2M_MIN diaria | C | Contar días modelados ≤0 °C solo con año completo en LST. |

La documentación indica que T2M_MIN preserva extremos; se contrastó el menor extremo mensual con el menor valor diario por separado en cada uno de los veinte años: coincidieron. No se interpreta la mínima de un modelo regional como medición absoluta del terreno. El ejemplo diario del documento original parte de 2015; se comprobó que el periodo completo solicitado por esta tarea, 2005–2024, sí está disponible.

Resultados de referencia: lluvia 2005 = **622,18 mm**, 2024 = **1.321,94 mm**, diferencia = **699,76 mm**. Menor mínima mensual: **3,86 °C** y **4,07 °C**, diferencia **0,21 °C**. Los veinte recuentos de heladas son cero en este punto modelado; eso **no descarta heladas locales**. El conteo no es la alerta preventiva de pronóstico a ≤2 °C.

Las respuestas originales de curl están archivadas en `backend/tests/fixtures/tendencias/` junto con `procedencia.json`: URL, fecha, tamaño y SHA-256. Mensual: `e990ea4134ab3784cf6918655571f437508b5d024dbed6cd1618326db549b8d5`; diaria: `d3a6a8e2a3674ad8e51931821a3970b7b48e66244f4bd73ebacbbb80731343b3`. Las pruebas comprueban ambos hashes. No son descargas nuevas cada vez ni respaldos de ejecución del backend.

## Fórmulas y suficiencia

- `lluvia_anual = Σ(tasa_mm_dia_mes × dias_reales_mes)`. Febrero usa 28/29 días según calendario Gregoriano. Se ignoran claves de mes 13. Sin doce meses completos, null.
- `t_min_anual = min(T2M_MIN de los doce meses válidos)`. No se promedian los extremos ni se deducen heladas desde ellos.
- `humedad_anual = Σ(GWETTOP_mes × dias_mes) / dias_año`, solo con doce índices válidos.
- `dias_helada = cantidad(T2M_MIN_diaria ≤0 °C)`, solo con 365/366 registros válidos; se conservan fechas LST sin conversiones de zona. Cobertura parcial: recuento anual null, junto con días disponibles y esperados.
- OLS: `b = Σ((año−media_años)(valor−media_valores)) / Σ((año−media_años)²)`. Se requieren al menos 15 años completos por variable; es una regla de cobertura técnica del 75 %, no un criterio de significancia. Pendiente anual `b`, por década `10b`, redondeadas independientemente a seis decimales. La pendiente de lluvia describe cambios del total anual en mm por año de avance o por década. Diferencia = `valor_2024−valor_2005` solo con ambos extremos válidos. Se informan años usados/excluidos y dirección de la pendiente anual publicada.

No se extrapolan años, imputan datos, calculan p-valores ni atribuyen causas. La dirección OLS puede diferir de la comparación de dos extremos. Para la serie de referencia, la precipitación aumenta aproximadamente **316,1425 mm de total anual por década** en el ajuste y la menor mínima mensual aumenta aproximadamente **0,0547 °C/década**; son descripciones del modelo, sin afirmación de significancia.

## Caché, errores y seguridad

Se reutiliza `clima_cache` sin migraciones: claves distintas versionadas por coordenadas exactas, parámetros, tipo y periodo; series normalizadas, no agregados inventados. Vigencia 30 días por fuente. Se validan esquema, dominios físicos, unidades, periodo y coherencia de fecha JSON/SQL. Una coordenada distinta no comparte respaldo. Si NASA falla se puede devolver la serie anterior válida del mismo punto, conservando fecha y aviso de desactualización. Si solo responde una fuente, la otra permanece nula y señalada; si ambas faltan, error controlado.

Solicitudes duplicadas comparten promesa; límite 16 pendientes por tipo, dos peticiones activas a NASA, 12/minuto y 120/hora por proceso, pausa de un minuto tras fallo y 30 consultas de ruta/minuto por usuario. Timeout de proveedor 15 s y respuesta limitada a 1 MiB. Host/paths fijos, sin redirecciones, JWT ni secretos enviados a NASA. Fallos SQL inesperados no se presentan como caída del proveedor. CORS, autenticación y autorización existentes se conservan.

El frontend centraliza HTTP y valida estructura, año, cobertura, unidades y coordenadas devueltas. Espera 25 s únicamente para esta consulta; las demás conservan ocho segundos. La caché de vista incluye usuario, terreno, coordenadas y periodo; hay cancelación y guardas contra respuestas tardías. La tabla anterior se oculta mientras se actualiza o hay error.

## Interfaz y evidencias

Sección bajo demanda «¿Cómo ha cambiado el clima?» en el detalle existente. Tres gráficas Recharts, indicadores descriptivos, fechas por fuente, advertencias, metodología y tabla accesible con veinte años y desplazamiento horizontal contenido. Barras desde cero; líneas sin unir datos ausentes. Diseño verde/tierra, teclado, estados de carga, error y reintento; uso en celular y escritorio.

Se conservaron **10 capturas** locales en `.tmp/evidencias-tendencias/`, fuera de Git: `escritorio/` y `celular/` con pantalla, sección completa, lluvia anual, tabla y error, más JSON de evidencias y procedencia. Se inspeccionaron visualmente capturas de ambas vistas, incluido el eje cero de precipitación. Corresponden al recorrido automatizado sobre PostgreSQL real aislado. Se usan respuestas NASA archivadas con fecha modificada para controlar vigencia y un día retirado deliberadamente para comprobar año incompleto; están etiquetadas, **no son una comprobación de Internet ni de producción**. La consulta real independiente anterior es la evidencia separada de NASA.

## Validaciones

`npm.cmd run lint`, `npm.cmd run typecheck` y `npm.cmd run test` se ejecutaron por separado. `npm.cmd run test:tendencias` ejecutó build y el recorrido nuevo en ambos tamaños. La ejecución final de **`npm.cmd run check` terminó con código 0**, incluyendo lint, tipos, unitarias, PostgreSQL, build de ambos paquetes y los cinco grupos E2E:

| Grupo | Aprobadas |
| --- | ---: |
| Backend, 20 archivos de tests | 331 |
| Frontend, 14 archivos de tests | 130 |
| Integración PostgreSQL, 12 archivos | 134 |
| E2E anteriores generales | 16 |
| E2E integral y rotaciones | 4 |
| E2E escenarios | 2 |
| E2E capas GIBS | 2 |
| E2E tendencias, escritorio y celular | 2 |
| **Total** | **621** |

Se conservaron las 561 pruebas anteriores y se añadieron 60. Las nuevas cubren lluvia/bisiestos, extremos de temperatura, conteos diarios ≤0 °C, ausencia diaria, datos inválidos y relleno, unidades/periodos/coordenadas, determinismo, OLS y redondeo independiente, HTTP/red/MIME/tamaño/timeout/presupuesto, caché vigente/vencida/desactualizada y deduplicación, errores internos, autorización e integridad SQL, contrato de respuesta, sesión cerrada/cambiada y respuesta tardía. Los recorridos E2E comparan las veinte filas realmente devueltas por HTTP con el cálculo esperado, comprueban tres gráficas, tabla, teclado, cobertura parcial, error/reintento, nuevo login y persistencia, usuario ajeno, ausencia de escrituras agrícolas y desbordamiento contenido. Cero errores JavaScript/consola inesperados en el recorrido nuevo. El E2E general conserva el resto de módulos.

Una primera ejecución completa se interrumpió por el puerto de un servidor temporal de una ejecución anterior cuyo cierre estaba retenido por el entorno restringido de Windows. Se identificaron y cerraron exclusivamente esos dos procesos temporales, y el check completo se repitió fuera de esa restricción con código 0. No se modificó la configuración del producto para ocultar la incidencia. El primer control de tipos también detectó una inferencia demasiado estrecha en un test, corregida con su tipo explícito. La revisión visual ajustó el origen cero de las barras de lluvia. El build conserva un aviso no bloqueante: bundle principal **509,52 kB** (149,82 kB gzip); gráficos históricos en fragmento diferido de **2,31 kB**, con Recharts compartido. No hay dependencias nuevas; optimizar más la carga queda como mejora, sin ampliar esta fase.

Inspección SQL posterior de solo lectura: conexión mediante `rotaandes_app` en ambas bases. Desarrollo: cero usuarios/terrenos/siembras/cachés, diez cultivos y ocho plantillas. Base aislada: **las seis tablas sin registros residuales**, incluidas cuentas y cachés de pruebas. Ambas conservan aplicada y vigente la única migración `20261107000100_esquema_inicial`; Prisma informó **sin migraciones pendientes**. No se crearon ni borraron bases, modificaron credenciales o tocaron datos de producción.

Auditoría de contenido de archivos actuales: sin coincidencias de secretos o URLs privadas, dependencias sin cambios y sin archivos generados candidatos. Documentos rectores, migración, main, rama publicada y etiqueta conservan sus hashes iniciales. Las capturas, logs, `.env`, cliente generado, node_modules y dist están excluidos. La revisión del índice preparado y el cierre Git se realizan antes de registrar el commit local solicitado.

## Archivos de la fase

| Grupo | Archivos |
| --- | --- |
| Backend | `src/services/nasaHistorico.ts`, `analisisTendencia.ts`, `tendencia.ts`, `src/routes/tendencia.ts`, integración en `aplicacion.ts` y extracción sin cambio de comportamiento del validador compartido en `nasaPower.ts`. |
| Comprobación real | `backend/scripts/verificarTendencias.ts` y script en `backend/package.json`. |
| Frontend | `TendenciaTerreno.tsx`, `GraficasTendencia.tsx`, `types/tendencia.ts`, `lib/validarTendencia.ts`, `lib/api.ts` y `pages/DetalleTerreno.tsx`. |
| Tests | Backend `tendenciasHistoricas.test.ts`, `tendencia.test.ts`, `base-datos/tendencia.integration.test.ts`, fixtures/ayudantes; frontend `TendenciaTerreno.test.tsx`, `lib/tendencia.test.ts`, fixture controlada; navegador `tendencias.spec.ts`. |
| Configuración | `playwright.tendencias.config.ts`, exclusión en configuración general y scripts raíz que incorporan el quinto grupo E2E al check. |
| Documentación | `README.md`, `docs/DECISIONES.md` y este informe. |

## Limitaciones y estado de publicación

Resolución meteorológica MERRA-2 **0,5° × 0,625°**, aproximadamente 50–70 km en esta zona, con topografía que no representa el lote. Reanálisis/modelo, no estación de parcela ni dato observado por el agricultor. Solo 20 años y análisis descriptivo; no es una normal climática de 30 años ni demuestra cambio significativo, causas, daños, rendimiento o rentabilidad. El extremo T2M_MIN y el índice GWETTOP no deben sustituir mediciones de campo. No se aplican correcciones arbitrarias por altitud ni se mezclan simulaciones con la serie original.

La actualización es local. No se modifica PostgreSQL de producción, migraciones, claves, main, release/publicacion, etiqueta de primera entrega, PROYECTO.md ni AGENTS.md. No se publica, crea infraestructura o inicia panel técnico/PDF/otro módulo. Los despliegues consultados solo en lectura permanecen Railway `022133e1-d1e1-4d86-9c40-595f8e300cd8` y Vercel `dpl_4PLbbQ3ZQoNbYJrixBBSbYq4ws5q`, con ambas URLs públicas HTTP 200.
