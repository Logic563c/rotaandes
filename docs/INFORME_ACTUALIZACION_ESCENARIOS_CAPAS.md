# Preparación de publicación de escenarios y capas satelitales

Fecha: 8 de noviembre de 2026. Prompt 16. **Actualización preparada localmente; pendiente de autorización para push y despliegue.** Las comprobaciones locales de esta actualización no equivalen a pruebas de la nueva versión en Internet.

## Revisión y contenido

Se leyeron PROYECTO.md, AGENTS.md y los informes de despliegue, escenarios y capas. La rama `feat/integracion-escenarios-capas` se creó desde `f368ce50295b21620cf95458e5c7d1172240cae2`, con Git limpio. Contiene el simulador `f96ffe823a52d83cba3dcb6e3fb3692f4297983b` y desciende linealmente de `release/publicacion`, actualmente `749c67280f3b9f015b8bf8eef834e15b0001a2cb` tanto localmente como en GitHub. No hace falta resolver conflictos, repetir implementaciones ni sobrescribir configuración de producción: se propone un avance fast-forward de la rama publicada al commit revisado de integración, después de su aprobación.

Repositorio existente: `Logic563c/rotaandes`, privado. No se crea otro repositorio, rama remota de desarrollo ni servicio. `main` permanece en `ee4f8c8542744ddecf64a5f2ab58d6993e6e3431`; la etiqueta anotada de primera entrega conserva el objeto `9d5f716dcf9c4cd357066404879bf5e767409dd3` y el commit `92a7d2f53ede7fe524cd45e5bd7f8d4e454dd3e9`, contrastados con el remoto. PROYECTO.md, AGENTS.md, Prisma y migraciones permanecen intactos.

Los cambios funcionales son los dos commits anteriores; la integración añade documentación del procedimiento y resultados. La lista completa puede revisarse con `git diff --name-status 749c672 HEAD`.

- Simulador en detalle del terreno: lluvia −30…+30 %, temperatura −2…+2 °C, original/restauración, calendario de 120 celdas, motivos y comparación por ID de las tres posiciones de rotación. Reutiliza los GET existentes, validación, permisos y motores; no guarda escenarios en terrenos/siembras.
- Visor NASA GIBS en Mis terrenos y detalle: MODIS NDVI y SMAP, años 2023/2024, mes/fecha, leyendas oficiales, fuentes, avisos, imagen validada, límites de memoria/solicitudes y caché histórica. Solicitudes NASA exclusivamente desde backend; el navegador recibe el PNG con Bearer y verifica su SHA-256.
- `/api/capas-visuales/:tipo` y `/api/capas-visuales/:tipo/imagen` son la alternativa visual. `/api/capas/:tipo?mes=` conserva indisponibilidad explícita 503: **no se implementó GeoJSON analítico ni agregación mensual**. SMAP tiene cobertura parcial regional y no representa humedad puntual de cada parcela.
- Se añade exclusivamente `blob:` a `img-src` de la CSP de Vercel; no se cambian CORS, destinos HTTPS, políticas de autenticación ni permisos. Dependencias nuevas: `pngjs@7.0.0` y `@types/pngjs@6.0.5`; el resto de versiones se conserva.

## Producción anterior comprobada, todavía vigente

Antes de preparar el envío se consultaron los servicios existentes y las URLs, sin crear cuentas ni cambiar datos de producción:

| Recurso | Estado observado |
| --- | --- |
| Frontend | https://rotaandes.vercel.app, HTTP 200 |
| Salud backend | https://backend-production-954a9.up.railway.app/api/health, HTTP 200 y `{ "ok": true }` |
| Railway backend | `def38930-c4b9-4d4f-afb3-13c6e6e9a430`, despliegue `b791e7dd-15db-4e17-ba46-92bb12b68b55`, SUCCESS |
| PostgreSQL Railway | `4dee926d-e026-4a17-a4cc-b16074f1f6c7`, SUCCESS; volumen existente de 500 MB READY |
| Vercel | `prj_nfVORQuty8Uj0Psw0B9YUQJj26Hv`, despliegue `dpl_B6CtJ2XpbRpoVb5pY5MkEuSWrahW`, Ready |
| Código de aplicación anterior | `ec413cacf8c9e99ad60dbafe7365244e8f2dfd94`; cierre documental remoto `749c672` |

El estado de plataforma no sustituye la comprobación privada del esquema ni el recorrido de producción de esta nueva actualización. No se declara todavía que los escenarios o las capas estén disponibles públicamente.

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

## Recorrido de producción pendiente de autorización

Con cuentas temporales aleatorias, sin contraseñas conocidas, fixtures ni interceptación de los datos científicos: registrar/iniciar sesión, guardar prioridades, crear terreno con altitud real, guardar dos siembras, consultar clima/pronóstico/calendario/rotaciones, abrir simulador y contrastar original/escenario con el JSON real; comprobar que el terreno y siembras siguen idénticos. Cambios cero también son posibles según condiciones reales: no inventar variaciones para la demostración. Probar MODIS/SMAP y PNG cargados, leyenda/fecha, fechas con falta de cobertura y 503 explícito del GeoJSON. No interpretar colores como valores analíticos.

Repetir escritorio/celular, cierre/nuevo login, SPA y aislamiento con otro agricultor; registrar consola/red, CORS y autorizaciones. Verificar esquema/migraciones en privado sin mostrar conexión ni secretos. Preparar y comprobar la vía de limpieza antes de crear cuentas; eliminar exclusivamente los UUID/correos temporales del recorrido y confirmar ausencia de residuales. No borrar cuentas ni siembras preexistentes. No añadir endpoints administrativos para facilitar las pruebas.

## Reversión

Conservar como referencia de código funcional `ec413ca`, el cierre `749c672` y los IDs de despliegue anteriores de la tabla. Si aparecen errores críticos, volver a seleccionar el despliegue Railway anterior y restaurar el alias Vercel a `dpl_B6CtJ2XpbRpoVb5pY5MkEuSWrahW`, verificando salud, CORS y un recorrido sin tocar el esquema ni borrar datos. También puede prepararse un revert Git nuevo y revisado; nunca force push ni reset de la historia compartida. No se ejecutó una reversión en esta preparación.

## Pendientes explícitos

Autorización de envío y activación, despliegues nuevos, comprobación privada de PostgreSQL productivo y recorrido real público de esta actualización. Hasta completarlos sigue vigente la versión pública anterior. El procesamiento analítico mensual GeoJSON, tendencias, panel técnico avanzado, PDF y landing definitiva quedan fuera de esta actualización.

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
