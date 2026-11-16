# Visor MODIS y SMAP — Prompt 15

> **Registro histórico de esta fase.** Se conservan sus fechas, versiones, cifras y resultados; las menciones a publicación pendiente o a repositorio privado describen ese momento. Para la versión vigente, las instrucciones actuales y las evidencias verificadas el 15-11-2026, consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los comandos de publicación, migración o reversión de este registro no son instrucciones para la auditoría documental actual.

Fecha: 8 de noviembre de 2026. Rama `feat/capas-satelitales`, desde `f96ffe823a52d83cba3dcb6e3fb3692f4297983b`. Se revisaron documentos rectores e informes de primera entrega, rotaciones, despliegue y escenarios. Git estaba limpio. Se mantienen intactas `main`, `release/publicacion`, la etiqueta de primera entrega, PROYECTO.md, AGENTS.md, el modelo y las migraciones. Sin push, despliegue o acceso a la base de producción.

## Alcance entregado y autorización

Se implementa **un visor de imágenes oficiales NASA GIBS**, integrado en los mapas existentes. No se declara entregado el GeoJSON analítico ni el procesamiento mensual de los datos originales.

Se comprobó AppEEARS antes de elegir la alternativa: productos/bandas públicos disponibles, pero tareas sin credenciales responden 403; no existe acceso Earthdata configurado localmente. El usuario indicó: «Prioriza la integración de datos NASA reales disponibles públicamente y las visualizaciones oficiales MODIS/SMAP mediante GIBS», documentando los límites y manteniendo la versión pública anterior.

ORNL DAAC también se evaluó: ofrece MOD13Q1 numérico para Latacunga, pero el servicio de fechas SPL3SMP_E respondió «No SPL3SMP_E data available for -0.93 -78.62 location». No se utilizaron datos de otra ubicación para ocultarlo, ni imágenes de terceros. Sin los dos productos/QA originales disponibles no se fabricó una agregación mensual conjunta.

## Productos, unidades y calidad

| Producto de referencia | Datos originales verificados | Qué muestra esta fase |
| --- | --- | --- |
| MOD13Q1.061, Terra MODIS | NDVI adimensional, 250 m nominales, 16 días, proyección sinusoidal; factor 0,0001, relleno −3000 y bandas QA en catálogo oficial | `MODIS_Terra_L3_NDVI_16Day`, imagen coloreada GIBS de la composición seleccionada |
| SPL3SMP_E.006, SMAP | Humedad superficial, aproximadamente 0–5 cm, m³/m³; malla EASE-Grid 2.0 de 9 km, composición diaria; relleno −9999 y flags de calidad | `SMAP_L3_Passive_Enhanced_Day_Soil_Moisture`, imagen diaria diurna GIBS |

La malla SMAP de 9 km no implica mediciones independientes del tamaño de una parcela: su guía describe un dominio de contribución de aproximadamente 33 km. Para análisis numérico, el manual recomienda retrieval_qual_flag 0 u 8. **Esos controles de QA no se reaplican localmente a los PNG**. La visualización utiliza la representación del proveedor y puede omitir áreas por máscara, adquisición o paleta.

Los valores de escala/relleno son documentación de los productos originales; no se aplican a bytes RGB. No se infiere NDVI o humedad a partir de colores. Se verificaron las referencias de leyenda contra los XML oficiales archivados; se muestran seis muestras con valores/colores oficiales, y enlace a la paleta completa. No se inventan umbrales agronómicos «seco», «sano» o «productivo».

La versión 061/006 es la del catálogo de referencia contrastado; la imagen procede del alias `best` de GIBS. No se afirma haber auditado la versión de cada granulo utilizado internamente por el proveedor.

## URLs y comprobaciones reales

- [AppEEARS, productos](https://appeears.earthdatacloud.nasa.gov/api/product), [bandas MOD13Q1.061](https://appeears.earthdatacloud.nasa.gov/api/product/MOD13Q1.061), [bandas SPL3SMP_E.006](https://appeears.earthdatacloud.nasa.gov/api/product/SPL3SMP_E.006): HTTP 200; tarea sin autenticación: HTTP 403.
- [Servicio ORNL DAAC](https://modis.ornl.gov/data/modis_webservice.html): catálogo/bandas/fechas MODIS y subconjunto real HTTP 200; fechas SMAP de Latacunga HTTP 400 con ausencia explícita.
- [GIBS WMS](https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0) y [WMTS](https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml): HTTP 200 y capas/fechas publicadas.
- [Paleta NDVI](https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_L3_NDVI.xml) y [paleta SMAP](https://gibs.earthdata.nasa.gov/colormaps/v1.3/SMAP_Soil_Moisture.xml): HTTP 200; los colores de referencia se contrastan en tests.
- Referencias de producto: [MOD13Q1.061](https://doi.org/10.5067/MODIS/MOD13Q1.061), [SPL3SMP_E.006](https://doi.org/10.5067/M20OXIZHY3RJ), [guía SMAP v006](https://nsidc.org/sites/default/files/documents/user-guide/spl3smp_e-v006-userguide.pdf), [guía MOD13 Collection 6](https://lpdaac.usgs.gov/documents/103/MOD13_User_Guide_V6.pdf). La guía MOD13 describe Collection 6; la versión 061 se verificó en su catálogo actual.

Se ejecutó curl antes de integrar. El recorte inicial de la zona andina devolvió PNG SMAP transparentes en varias fechas; no se declararon imágenes con datos solo por recibir HTTP 200. El recorte regional ampliado incluye cobertura visible al oeste y amplias zonas sin píxeles en los Andes. La aplicación muestra ambas situaciones sin extrapolar valores hacia las parcelas.

Verificación independiente real, sin SQL:

```powershell
npm.cmd run capas:verificar --workspace backend
```

Terminó con código 0. Respuestas obtenidas el 8 de noviembre de 2026 a las 21:36 UTC aproximadamente:

| Tipo | Fecha original | Tamaño | SHA-256 | Visibilidad |
| --- | --- | ---: | --- | --- |
| NDVI | 2023-01-01 a 2023-01-16 | 315916 bytes | acba65f77d670d70333865727eacfc03555aab4601d7b4d0c1e98e5eff226635 | Píxeles visibles |
| SMAP | 2023-01-17 | 8885 bytes | d933a0c4203dbdb5cedb470711643b98dc4b32848ba3ac390d42f68312ce9b01 | Cobertura parcial visible |

Los dos PNG originales, sus URLs exactas/proyección/fecha/SHA y su uso como fixtures están en `backend/tests/fixtures/satelites/procedencia.json`. No se alteraron para producir esas evidencias. El script conserva su nueva comprobación en `.tmp/evidencias-capas/verificacion-real.json`, sin credenciales. No consulta producción.

## Geografía, tiempo y procesamiento realizado

Recorte rectangular WGS84 **[-79.45, -1.3, -78.3, -0.3]**, Cotopaxi y alrededores. No es el polígono administrativo de la provincia ni se calculan áreas de terreno. Se solicita WMS en EPSG:3857 y se coloca como ImageOverlay con los límites WGS84 correspondientes en Leaflet. Pruebas verifican la transformación de las cuatro esquinas. Los 920×800 píxeles de salida son tamaño de imagen, no nueva resolución científica.

Se ofrecen 2023/2024 y sus meses. MODIS utiliza fechas originales cada 16 días desde el inicio de cada año, con cierre en diciembre; SMAP usa días de su catálogo global. No se cambian días mediante zona horaria. Default: primera composición del mes en MODIS, día 17 en SMAP, fecha inicial verificada; cada usuario puede escoger otra fecha. Una fecha disponible globalmente no garantiza píxeles visibles en este recorte.

**No se recortaron/leyeron archivos HDF, GeoTIFF o NetCDF científicos, aplicaron QA locales, calcularon medias mensuales ni generaron GeoJSON.** La única inspección de píxeles examina alfa para distinguir imagen visible/transparente; no clasifica la calidad física del dato ni extrae valores de la paleta. El procesamiento analítico original sigue pendiente de los datos/QA y de un procedimiento validado/reproducible sobre esos originales.

## API y seguridad

| Ruta | Comportamiento |
| --- | --- |
| `GET /api/capas/:tipo?mes=1` | JWT, tipos ndvi/humedad_suelo y mes 1–12; 503 explícito por falta de GeoJSON analítico |
| `GET /api/capas-visuales/:tipo?anio=2023&mes=1&fecha=...` | JSON de visualización: producto, fecha/periodo, resolución, límites, unidades, paleta, fuente, estado visible/vacío, SHA, origen/consulta y advertencias |
| `GET /api/capas-visuales/:tipo/imagen?...` | PNG validado de la misma selección |

Las rutas visuales son una alternativa separada autorizada, no una respuesta de éxito del contrato GeoJSON. No se añade ni modifica su estructura original. Los errores conservan `{ error }`: 400 selección incorrecta, 401 sesión inválida/ausente, 503 indisponibilidad. Se rechazan parámetros repetidos, extraños, vacíos, fechas inexistentes/fuera del mes o no correspondientes a la composición. No se admiten paths, URLs, bbox o coordenadas del cliente.

Agricultores/técnicos pueden leer imágenes regionales públicas, sin información personal de propietarios. Los marcadores se obtienen por las rutas de terrenos existentes y conservan su aislamiento. No hay edición de datos, permisos de escritura nuevos ni consultas a PostgreSQL para las imágenes.

El backend llama exclusivamente al host/capas NASA fijos; no transmite el JWT a NASA. Timeout 8 s, cuerpo máximo 2 MiB, firma/IHDR/dimensiones/CRC PNG. Se rechazan PNG interlazados para mantener acotada la descompresión. `pngjs@7.0.0`, sin dependencias transitivas, y sus tipos son las únicas dependencias nuevas; se conserva Prisma 7.10.1 y el resto de versiones.

Caché de memoria: 24 h para imágenes históricas, máximo 32/16 MiB, deduplicación y dos descargas simultáneas; presupuestos 20/minuto y 120/hora/proceso. Tras fallo se espera 30 s, sin reemplazar fecha o producto por otro. No se usa ni modifica clima_cache.

El cliente valida metadatos/eco de selección y compara SHA-256 del PNG antes de mostrarlo. URLs blob locales se revocan al cambiar capa/cerrar/cambiar sesión. Query por usuario/capa/año/mes/fecha; no se usan resultados anteriores como placeholder. CSP agrega solo blob a img-src; CORS no se amplía. Los secretos siguen fuera de Git.

## Interfaz y pruebas

Visor en Mis terrenos y detalle; una sola instancia Leaflet por mapa y una capa a la vez. Controles nativos de capa/año/mes/fecha, opción de solo mapa base o sin cartografía debajo, leyenda, fuente/fecha/unidades y avisos. Conserva marcadores, popup y selección de coordenadas de los formularios anteriores. Zoom/centrado sin animaciones mantiene la corrección previa de desmontaje.

Se revisa escritorio 1440×1000 y celular emulado 390×844: ausencia de desbordamiento global, imagen PNG efectivamente cargada (`naturalWidth=920`), capas encendidas/apagadas, fechas, leyendas, errores/reintento, ausencia de píxeles y cierre de sesión. El uso móvil no es una certificación en teléfono físico ni WCAG completa.

La batería nueva controla el proveedor con imágenes archivadas y respuestas sintéticas identificadas; no depende de Internet para esos casos. PostgreSQL revierte transacciones y el navegador limpia únicamente cuentas/terrenos temporales. Geometría comprobada: límites/reproyección de la imagen; **integridad de geometrías GeoJSON no aplica porque no se generaron GeoJSON**. No se declara aprobada una prueba analítica inexistente.

Además se ejecutaron **dos E2E con GIBS real**, escritorio/celular, código 0: registro/cuenta/terreno temporales y servidor local real; imágenes exitosas sin interceptar HTTP, fuente gibs en escritorio y caché genuina en celular. Las capturas NDVI/SMAP de ese recorrido corresponden a datos NASA reales. Solo los casos posteriores de error/ausencia se simulan expresamente. Cero errores de página/consola, cero solicitudes directas GIBS del navegador y ninguna escritura HTTP durante el uso del visor.

`npm.cmd run check` terminó con **código 0**, después de completar todas las etapas y las cuatro suites de navegador:

| Comprobación | Resultado real |
| --- | --- |
| Lint | Código 0, sin advertencias |
| TypeScript | Código 0, herramientas/backend/frontend estrictos |
| Backend | 293 pruebas, 18 archivos |
| Frontend | 114 pruebas, doce archivos |
| PostgreSQL aislado | 130 pruebas, once archivos; migración original sin pendientes |
| Build | Ambos paquetes aprobados; Prisma Client 7.10.1 |
| Playwright habitual | 24 casos: 16 previos, cuatro integrales, dos escenarios y dos capas |
| Total check | **561 pruebas aprobadas**, conserva las 514 anteriores y añade 47 |
| GIBS independiente | Script de verificación código 0 y dos E2E reales adicionales aprobados |
| npm audit --omit=dev | Código 0, cero vulnerabilidades conocidas en la consulta |

Las 47 nuevas son 31 backend (productos, calendario de observaciones, reproyección/recorte, leyendas/procedencia, PNG/CRC/transparencia, fallos/caché/concurrencia), once frontend, tres PostgreSQL/HTTP y dos E2E habituales. Las dos ejecuciones reales adicionales no se suman artificialmente a las 561 de check.

Durante la construcción se corrigieron errores de tipado estricto en los tests y se adaptó Blob.arrayBuffer en jsdom para representar la API nativa del navegador; las ejecuciones finales pasan sin esa limitación de entorno. Se protegió también la recuperación ante un fallo síncrono del proveedor para no dejar una promesa pendiente permanentemente, con regresión específica. No se ocultaron fallos como pruebas aprobadas.

Bundle principal observado: 497,73 kB, 146,99 kB gzip; Leaflet y gráficas permanecen separados. No hubo advertencia de tamaño. El visor no descarga raster científicos completos ni ejecuta GIS pesado en el navegador.

Consulta de cierre de bases locales, READ ONLY: desarrollo conserva cero usuarios/terrenos/siembras, diez cultivos, ocho plantillas y caché vacía; la base aislada conserva las seis tablas sin filas. Ambas tienen aplicada `20261107000100_esquema_inicial`. No hay bases nuevas, migraciones nuevas, cambios de contraseñas ni registros de pruebas residuales.

## Evidencias y archivos

Evidencias reales: `.tmp/evidencias-capas-reales/`, carpetas de escritorio/celular, con ndvi.png, humedad_suelo.png, evidencia-capas.json. Las capturas de indisponibilidad/sin píxeles de esas carpetas son casos controlados. La comprobación independiente deja PNG/JSON en `.tmp/evidencias-capas/`. `test-results/capas/` contiene el recorrido habitual controlado. Todas esas evidencias de ejecución están ignoradas por Git.

Copias destacadas conservadas fuera de las carpetas que Playwright limpia: NDVI escritorio (`../.tmp/evidencias-capas/escritorio-ndvi.png`, artefacto local no versionado), SMAP escritorio (`../.tmp/evidencias-capas/escritorio-humedad_suelo.png`, artefacto local no versionado), NDVI celular (`../.tmp/evidencias-capas/celular-ndvi.png`, artefacto local no versionado), SMAP celular (`../.tmp/evidencias-capas/celular-humedad_suelo.png`, artefacto local no versionado). En las cuatro capturas se revisaron visualmente las imágenes reales, la cobertura parcial, marcadores, leyendas y advertencias. Los terrenos/cuentas de contexto son sintéticos y ya fueron eliminados; las imágenes exitosas proceden de GIBS real.

Código: `backend/src/data/catalogoCapas.ts`, `services/capasSatelitales.ts`, `routes/capas.ts`, integración en aplicacion.ts y script verificarCapasSatelitales.ts. Frontend: VisorCapas.tsx, ampliación opcional de MapaTerrenos.tsx, cliente/tipos e integración en Terrenos/DetalleTerreno. Pruebas unitarias, SQL y E2E, fixtures públicas con procedencia/paletas, nueva configuración Playwright y scripts. Documentación: README, DECISIONES y este informe; CSP/lockfile registran los cambios necesarios.

No se implementan tendencias, panel técnico avanzado, PDF ni otros módulos. La versión pública anterior y las bases de producción no se modifican. El compromiso de esta fase es el visor GIBS autorizado, con su limitación analítica explícita.
