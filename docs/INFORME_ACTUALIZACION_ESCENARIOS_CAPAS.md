# Publicación de escenarios y capas satelitales

Fecha: 8 de noviembre de 2026. Prompt 16. **Publicación autorizada y verificada en Internet**, revisión `012d6be4ebd2df22dfb3062b8645dfe1c95ec017`. La batería local y el recorrido público real se documentan por separado.

## Resultado de producción

El usuario aprobó expresamente «Autorizar push y despliegue» del commit exacto y los 42 archivos revisados. Se actualizó `release/publicacion` por fast-forward y se confirmó el mismo hash en GitHub. La carga salió de una exportación limpia de los 202 archivos versionados; se comprobó contenido equivalente a Git (conversión CRLF de Windows solo en texto) y binarios idénticos, sin entornos privados, dependencias ni resultados. El manifiesto Vercel se inspeccionó con `--dry` antes de enviar.

| Recurso publicado y verificado | Resultado |
| --- | --- |
| Frontend público | https://rotaandes.vercel.app, HTTP 200, código nuevo y rutas SPA |
| Backend público | https://backend-production-954a9.up.railway.app/api/health, HTTP 200 y `{ "ok": true }` |
| Código de aplicación aprobado en GitHub | `Logic563c/rotaandes`, `release/publicacion`, `012d6be4ebd2df22dfb3062b8645dfe1c95ec017` |
| Railway backend | `022133e1-d1e1-4d86-9c40-595f8e300cd8`, SUCCESS; fuente del servicio satelital idéntica al artefacto aprobado |
| Vercel frontend | `dpl_4PLbbQ3ZQoNbYJrixBBSbYq4ws5q`, READY, metadato de revisión aprobado contrastado por API |
| URL técnica Vercel | https://rotaandes-g6el37zgb-logic563.vercel.app, protegida; para compartir usar el dominio público |
| Entorno backend | Node 24.20.0, Prisma 7.10.1, pngjs 7.0.0; `rotaandes_app` sobre PostgreSQL privado |

Se verificaron backend, código y Prisma antes de promover frontend. No hubo migraciones nuevas: el predeploy existente terminó y Prisma informó esquema actualizado. No se aplicó IaC, crearon recursos, alteraron credenciales de aplicación ni contrataron planes. Se mantuvieron raíz del monorepo, comandos, variables y una réplica. Crédito Trial observado antes de desplegar: aproximadamente 4,9777 USD; cifra variable, sin garantía de duración.

### Recorrido público real terminado

Un script Playwright separado terminó con **código 0** en Edge, escritorio 1440×1000 y celular emulado 390×844. No interceptó HTTP ni utilizó fixtures meteorológicas o satelitales. Registró una cuenta aleatoria, cerró/inició sesión, guardó prioridad de agua, creó un terreno en −0,93/−78,62 con altitud Open-Meteo real de 2775 m, registró papa/haba y comprobó persistencia al ingresar desde otro contexto. Las personas/terrenos de las capturas son exclusivamente temporales de prueba.

NASA POWER devolvió doce meses desde su caché real, periodo 2001–2025, consulta original `2026-11-08T17:02:35.528Z`, temperatura C y precipitación original mm/day. No se atribuye esa caché a una nueva descarga en cada clic. El pronóstico Open-Meteo mostró siete días vigentes, °C/mm y cero alertas en la respuesta observada; se contrastó la regla ≤2 °C sin fabricar una helada. Se consultaron 120 celdas y tres posiciones de rotación; una sugerencia quedó no determinada al no existir otra alternativa justificable para esas condiciones.

| Escenario sobre ese terreno temporal | Resultado real, en ambos tamaños |
| --- | --- |
| Lluvia −30 %, temperatura +2 °C | Cinco de 120 celdas cambian; total actual 65,45 → 68,06 y papa-vicia-papa 63,39 → 66,07 |
| Lluvia +30 %, temperatura −2 °C | Siete celdas cambian; indicadores que dejaron de ser evaluables se conservan nulos, sin fabricar puntajes |
| Restauración | Ambos controles vuelven a cero y se recupera el original |
| Repetición de cálculo | Celdas y estrategias repetidas son idénticas para los mismos parámetros |

Se contrastaron los motivos mostrados con el JSON del servidor. Los resultados anteriores describen esa combinación de datos y prioridades, no una garantía ni una predicción de cosecha. Durante simulación/capas hubo **cero POST/PUT/DELETE**; terreno, siembras y dato climático original quedaron idénticos. El contexto de demostración no altera los registros del agricultor real.

Se cargaron imágenes oficiales desde el backend Railway y se comprobó el SHA-256 del PNG por HTTP, imagen dibujada (`naturalWidth=920`), leyendas, fechas y controles:

| Capa real | Fecha/resolución/unidad | SHA-256 |
| --- | --- | --- |
| MODIS NDVI | 2023-01-01 a 2023-01-16, 250 m nominales, adimensional | acba65f77d670d70333865727eacfc03555aab4601d7b4d0c1e98e5eff226635 |
| SMAP superficial | 2023-01-17, malla de 9 km, m³/m³ | d933a0c4203dbdb5cedb470711643b98dc4b32848ba3ac390d42f68312ce9b01 |

SMAP se obtuvo de GIBS en escritorio y de caché genuina en celular; NDVI reutilizó la caché genuina obtenida durante los intentos del mismo despliegue. La selección de 2024/febrero respondió `sin_pixeles_visibles`, sin rellenar con cero ni otra ubicación. Se comprobaron activación/desactivación, base cartográfica y ausencia de desbordamiento global. `/api/capas/:tipo?mes=1` devolvió 503 explícito para ambos tipos: imágenes GIBS no se presentan como GeoJSON analítico, medias mensuales o mediciones de parcelas.

La segunda cuenta obtuvo 404 al consultar el terreno ajeno, siembras, clima, pronóstico, calendario y rotaciones, y al intentar editarlo. Tras cambiar de sesión la interfaz no mostró el simulador anterior. JWT ausente produjo 401, parámetros inválidos 400 y origen CORS ajeno 403. Cero errores de página/consola y respuestas HTTP inesperadas en el recorrido final. Se registraron dos `ERR_ABORTED` de consultas canceladas al navegar/cerrar sesión; no son fallos de un proveedor ni datos mostrados después del cierre.

### Integridad, incidencias y cierre

La comprobación privada final, en solo lectura, conservó **una cuenta y dos terrenos preexistentes**, cero siembras, diez cultivos, ocho plantillas y cuatro entradas meteorológicas genuinas. Hashes agregados de usuarios, terrenos, siembras, cultivos y plantillas coincidieron antes/después, sin volcar datos personales. Se eliminaron únicamente las cuentas temporales por UUID/correo exactos y sus cascadas; quedaron cero usuarios temporales. No se borraron bases ni datos ajenos.

Persisten las seis tablas originales, cuatro CHECK, tres relaciones y la única migración `20261107000100_esquema_inicial`; checksum sin cambios. El rol no tiene SUPERUSER, CREATEDB, CREATEROLE, REPLICATION ni BYPASSRLS. PostgreSQL sigue sin proxy TCP público. El contenedor no contiene `.env` local ni resultados del equipo.

Se conservaron cinco intentos incompletos, sin declararlos aprobados: una espera del verificador confundía GET con POST; un aviso de vigencia del pronóstico requirió esperar/volver a comprobar los siete días; la lectura CDP del cuerpo PNG fue vacía; un fetch del verificador a blob provocó un bloqueo CSP; y una lectura SSH privada sufrió un timeout de red. Se corrigieron las esperas y verificaciones del script efímero, con reintentos acotados de operaciones privadas idempotentes. No se relajó la CSP, modificaron fechas/clima ni cambió código de aplicación para acomodar la prueba. La causa exacta del aviso transitorio de vigencia no quedó aislada; se mantiene la protección del cliente y su opción de reintentar. El recorrido completo posterior sí mostró los siete días vigentes.

El registro adicional esperó la ventana anunciada por el servidor; no se ampliaron cuotas ni reinició el backend para eludirlas. La clave SSH creada para verificaciones/limpieza fue revocada y su archivo privado eliminado. También se revocó, sin reemplazo, el token de comprobación generado por `vercel curl`; la protección del proyecto permanece. Las contraseñas y el JWT de aplicación no cambiaron.

No se detectaron defectos críticos que exigieran revertir. Permanece el límite científico de imágenes regionales, cobertura SMAP parcial, climatología histórica, heurística referencial y móvil emulado, sin validación agronómica ni certificación completa de accesibilidad. El resultado público no incorpora GeoJSON analítico ni otros módulos pendientes.

Las 27 capturas y JSON sanitizados están en `.tmp/evidencias-produccion-prompt16/`, ignorados por Git: `recorrido-real.json`, `cierre-produccion.json`, `acceso-retirado.json`, capturas escritorio/celular de escenarios, explicación, calendario y MODIS/SMAP. Se revisaron visualmente los controles, leyendas, raster real, atribuciones y diseño móvil. El cierre documental se registra en un commit separado del código; los despliegues permanecen exactamente en `012d6be`. El envío de ese cierre requiere autorización específica y no activa otro despliegue.

## Registro de preparación anterior al envío

## Revisión y contenido

Se leyeron PROYECTO.md, AGENTS.md y los informes de despliegue, escenarios y capas. La rama `feat/integracion-escenarios-capas` se creó desde `f368ce50295b21620cf95458e5c7d1172240cae2`, con Git limpio. Contiene el simulador `f96ffe823a52d83cba3dcb6e3fb3692f4297983b` y desciende linealmente de la publicación anterior `749c67280f3b9f015b8bf8eef834e15b0001a2cb`, comprobada entonces localmente y en GitHub. No hizo falta resolver conflictos, repetir implementaciones ni sobrescribir configuración de producción; el avance fast-forward propuesto se autorizó y ejecutó según el cierre anterior.

Repositorio existente: `Logic563c/rotaandes`, privado. No se crea otro repositorio, rama remota de desarrollo ni servicio. `main` permanece en `ee4f8c8542744ddecf64a5f2ab58d6993e6e3431`; la etiqueta anotada de primera entrega conserva el objeto `9d5f716dcf9c4cd357066404879bf5e767409dd3` y el commit `92a7d2f53ede7fe524cd45e5bd7f8d4e454dd3e9`, contrastados con el remoto. PROYECTO.md, AGENTS.md, Prisma y migraciones permanecen intactos.

Los cambios funcionales son los dos commits anteriores; la integración añade documentación del procedimiento y resultados. La lista completa puede revisarse con `git diff --name-status 749c672 HEAD`.

- Simulador en detalle del terreno: lluvia −30…+30 %, temperatura −2…+2 °C, original/restauración, calendario de 120 celdas, motivos y comparación por ID de las tres posiciones de rotación. Reutiliza los GET existentes, validación, permisos y motores; no guarda escenarios en terrenos/siembras.
- Visor NASA GIBS en Mis terrenos y detalle: MODIS NDVI y SMAP, años 2023/2024, mes/fecha, leyendas oficiales, fuentes, avisos, imagen validada, límites de memoria/solicitudes y caché histórica. Solicitudes NASA exclusivamente desde backend; el navegador recibe el PNG con Bearer y verifica su SHA-256.
- `/api/capas-visuales/:tipo` y `/api/capas-visuales/:tipo/imagen` son la alternativa visual. `/api/capas/:tipo?mes=` conserva indisponibilidad explícita 503: **no se implementó GeoJSON analítico ni agregación mensual**. SMAP tiene cobertura parcial regional y no representa humedad puntual de cada parcela.
- Se añade exclusivamente `blob:` a `img-src` de la CSP de Vercel; no se cambian CORS, destinos HTTPS, políticas de autenticación ni permisos. Dependencias nuevas: `pngjs@7.0.0` y `@types/pngjs@6.0.5`; el resto de versiones se conserva.

## Producción anterior comprobada antes de actualizar

Antes de preparar el envío se consultaron los servicios existentes y las URLs, sin crear cuentas ni cambiar datos de producción:

| Recurso | Estado observado |
| --- | --- |
| Frontend | https://rotaandes.vercel.app, HTTP 200 |
| Salud backend | https://backend-production-954a9.up.railway.app/api/health, HTTP 200 y `{ "ok": true }` |
| Railway backend | `def38930-c4b9-4d4f-afb3-13c6e6e9a430`, despliegue `b791e7dd-15db-4e17-ba46-92bb12b68b55`, SUCCESS |
| PostgreSQL Railway | `4dee926d-e026-4a17-a4cc-b16074f1f6c7`, SUCCESS; volumen existente de 500 MB READY |
| Vercel | `prj_nfVORQuty8Uj0Psw0B9YUQJj26Hv`, despliegue `dpl_B6CtJ2XpbRpoVb5pY5MkEuSWrahW`, Ready |
| Código de aplicación anterior | `ec413cacf8c9e99ad60dbafe7365244e8f2dfd94`; cierre documental remoto `749c672` |

Esta tabla conserva la referencia previa para reversión. La comprobación privada y el recorrido nuevo se completaron después, según el cierre de producción al inicio del informe.

## Validación local ejecutada

`npm.cmd run check` terminó con código 0 en la rama de integración. Incluyó lint sin advertencias, TypeScript estricto, pruebas, PostgreSQL aislado, generación de Prisma Client 7.10.1, build de ambos paquetes y las cuatro suites Playwright.

| Batería | Resultado |
| --- | ---: |
| Backend | 293 aprobadas |
| Frontend | 114 aprobadas |
| PostgreSQL aislado | 130 aprobadas; migración original sin pendientes |
| Navegador | 24 aprobadas, escritorio y celular emulado |
| Total | **561 aprobadas; código 0** |

Los recorridos conservan registro/login/perfil, terrenos/siembras, NASA POWER, pronóstico, calendario y rotaciones. El simulador usa cálculos HTTP reales y PostgreSQL aislado con clima controlado: verifica extremos, cambios de recomendaciones/puntajes, restauración, explicaciones, aislamiento y ausencia de escrituras en registros agrícolas. Las capas habituales usan PNG NASA archivados con procedencia y errores controlados. No son pruebas de la nueva producción ni se presentan las respuestas controladas como consultas científicas nuevas. Los dos E2E con GIBS real de la fase anterior están documentados aparte en INFORME_CAPAS_SATELITALES.md.

La compilación adicional `npm.cmd run build:publicacion --workspace frontend`, con `VITE_API_URL` HTTPS real, terminó con código 0: principal 498,18 kB / 147,17 kB gzip, Leaflet y gráficas separados. Las capturas locales están en `.tmp/evidencias-integracion-escenarios-capas/`, ignoradas por Git. Las evidencias de producción de esta actualización se guardarán separadas después de autorizarla.

El perfil productivo local comprobó socket `0.0.0.0`, puerto asignado, health/CORS y rechazo del arranque ante PostgreSQL inaccesible sin exponer conexiones. Vercel conserva raíz `.`, Node 24.x y los comandos del monorepo. `npm.cmd audit --omit=dev` terminó con código 0 y cero vulnerabilidades conocidas. Revisión de los 202 archivos candidatos: sin coincidencias de secretos, URLs privadas pendientes ni cambios de versiones existentes; únicamente las dos dependencias PNG documentadas.

Consulta de cierre local en solo lectura: `rotaandes_dev` conserva cero usuarios/terrenos/siembras, diez cultivos y ocho plantillas; `rotaandes_pruebas_36cbc85c` conserva las seis tablas sin filas. Ambas tienen aplicada la migración original y no se crearon bases nuevas. No se consultó el contenido de PostgreSQL productivo en esta preparación.

## Publicación propuesta y guardas

1. Obtener autorización identificando repositorio privado, rama destino `release/publicacion`, hash exacto y cambios revisados. No enviar la rama temporal ni etiquetas nuevas. Comprobar inmediatamente antes que el remoto siga en `749c672`; si cambió, volver a comparar. Actualizar exclusivamente por fast-forward, sin force push ni reescritura.
2. Exportar únicamente el commit aprobado desde Git, sin `.env`, claves, resultados, bases, dependencias ni temporales. Revisar el manifiesto de carga. Los ejemplos versionados siguen sin secretos. Mantener `.railwayignore`, `.vercelignore` y los metadatos privados fuera del artefacto.
3. Reutilizar el proyecto Railway `948127e6-92fc-487f-a974-7315f6a3c1cd` y sus dos servicios actuales. No aplicar IaC que cree o destruya recursos; no cambiar credenciales ni planes. Mantener Node 24.20.0, una réplica y las referencias privadas existentes.
4. Raíz del monorepo; instalación `npm ci --include=dev`, build `npm run build --workspace backend`, predeploy existente `npm run produccion:preparar --workspace backend`, inicio `npm run start --workspace backend`. Ese predeploy utiliza `prisma migrate deploy` e idempotencia del catálogo: no hay migraciones nuevas ni cambio de modelo. Nunca reset, db push o migrate dev en producción.
5. Comprobar backend saludable y rutas nuevas antes de promover frontend. Vercel mantiene raíz del monorepo, `npm run build:publicacion --workspace frontend`, salida `frontend/dist`, URL backend HTTPS, SPA y autodeploy Git desactivado. No crear otro proyecto, dominio o servicio pagado. No publicar automáticamente futuras ramas.
6. Registrar IDs de despliegue y hash aprobado; verificar las URLs reales y el recorrido siguiente. Si una plataforma requiere pago o un cambio ajeno al alcance, detener esa operación.

## Recorrido de producción planificado y posteriormente ejecutado

Con cuentas temporales aleatorias, sin contraseñas conocidas, fixtures ni interceptación de los datos científicos: registrar/iniciar sesión, guardar prioridades, crear terreno con altitud real, guardar dos siembras, consultar clima/pronóstico/calendario/rotaciones, abrir simulador y contrastar original/escenario con el JSON real; comprobar que el terreno y siembras siguen idénticos. Cambios cero también son posibles según condiciones reales: no inventar variaciones para la demostración. Probar MODIS/SMAP y PNG cargados, leyenda/fecha, fechas con falta de cobertura y 503 explícito del GeoJSON. No interpretar colores como valores analíticos.

Repetir escritorio/celular, cierre/nuevo login, SPA y aislamiento con otro agricultor; registrar consola/red, CORS y autorizaciones. Verificar esquema/migraciones en privado sin mostrar conexión ni secretos. Preparar y comprobar la vía de limpieza antes de crear cuentas; eliminar exclusivamente los UUID/correos temporales del recorrido y confirmar ausencia de residuales. No borrar cuentas ni siembras preexistentes. No añadir endpoints administrativos para facilitar las pruebas.

## Reversión

Conservar como referencia de código funcional `ec413ca`, el cierre `749c672` y los IDs de despliegue anteriores de la tabla. Si aparecen errores críticos, volver a seleccionar el despliegue Railway anterior y restaurar el alias Vercel a `dpl_B6CtJ2XpbRpoVb5pY5MkEuSWrahW`, verificando salud, CORS y un recorrido sin tocar el esquema ni borrar datos. También puede prepararse un revert Git nuevo y revisado; nunca force push ni reset de la historia compartida. No se ejecutó una reversión en esta preparación.

## Pendientes explícitos

Autorización, envío, despliegues, comprobación privada y recorrido público terminaron. El procesamiento analítico mensual GeoJSON, tendencias, panel técnico avanzado, PDF y landing definitiva quedan fuera de esta actualización. La documentación final registra el resultado de `012d6be` y no cambia el código público; los commits documentales no se despliegan automáticamente.

## Lista exacta de archivos propuestos

42 archivos respecto a `749c672`; incluye las dos fases y la documentación de integración. Los PNG/XML de pruebas son fuentes públicas NASA archivadas con procedencia, no datos privados ni resultados temporales.

```text
README.md
backend/package.json
backend/scripts/verificarCapasSatelitales.ts
backend/src/aplicacion.ts
backend/src/data/catalogoCapas.ts
backend/src/routes/capas.ts
backend/src/services/capasSatelitales.ts
backend/tests/base-datos/capas.integration.test.ts
backend/tests/base-datos/escenarios.integration.test.ts
backend/tests/capasSatelitales.test.ts
backend/tests/fixtures/satelites/humedad_suelo-2023-01-17.png
backend/tests/fixtures/satelites/ndvi-2023-01-01.png
backend/tests/fixtures/satelites/paleta-humedad_suelo.xml
backend/tests/fixtures/satelites/paleta-ndvi.xml
backend/tests/fixtures/satelites/procedencia.json
docs/DECISIONES.md
docs/INFORME_ACTUALIZACION_ESCENARIOS_CAPAS.md
docs/INFORME_CAPAS_SATELITALES.md
docs/INFORME_ESCENARIOS.md
frontend/src/components/ComparadorRotaciones.tsx
frontend/src/components/MapaTerrenos.tsx
frontend/src/components/SiembrasTerreno.tsx
frontend/src/components/SimuladorEscenarios.test.tsx
frontend/src/components/SimuladorEscenarios.tsx
frontend/src/components/VisorCapas.test.tsx
frontend/src/components/VisorCapas.tsx
frontend/src/lib/api.ts
frontend/src/lib/compararEscenarios.test.ts
frontend/src/lib/compararEscenarios.ts
frontend/src/pages/DetalleTerreno.tsx
frontend/src/pages/Terrenos.tsx
frontend/src/tests/capasPruebas.ts
frontend/src/tests/escenariosPruebas.ts
frontend/src/types/api.ts
package-lock.json
package.json
playwright.capas.config.ts
playwright.config.ts
playwright.escenarios.config.ts
tests/navegador/capas.spec.ts
tests/navegador/escenarios.spec.ts
vercel.json
```
