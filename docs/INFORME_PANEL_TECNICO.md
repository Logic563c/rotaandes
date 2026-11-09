# Panel de técnicos agrícolas — Prompt 18

Fecha de trabajo: 8 de noviembre de 2026, Ecuador continental (UTC−5). Rama `feat/panel-tecnico`, creada desde `32ccaccb6cbde3f3ebd5388034541cecc04cc6f0` con Git limpio. Conserva simulador, imágenes GIBS, tendencias y los módulos anteriores. La publicación continúa en `012d6be`; esta fase es exclusivamente local.

## Endpoint, autorización y privacidad

```http
GET /api/tecnico/terrenos?parroquia=Pujil%C3%AD&cultivo=papa&pagina=1
Authorization: Bearer <sesión privada>
```

JWT obligatorio y rol `tecnico` comprobado por middleware antes de consultar terrenos. Sin token o con token inválido: 401; agricultor: 403. El rol procede de PostgreSQL, no de un claim o del navegador, y se vuelve a comprobar en cada petición. Un token emitido cuando la cuenta era técnica no evita el rechazo si el rol ya cambió. Entradas inválidas: 400; exceso: 429, 30/minuto/usuario; errores inesperados: 500. Se conserva `{ "error": "mensaje" }`, CORS y manejo centralizado sin trazas/secretos públicos.

Datos publicados por terreno: ID/nombre, coordenadas, altitud estimada, área, riego, suelo, `parroquia_perfil`, `ultima_siembra` y `helada`. La última siembra contiene únicamente ID, cultivo ID/nombre y fechas. El panel no necesita ni selecciona nombre, correo, teléfono, ID, prioridades o hash del propietario, tokens ni notas del historial. El técnico conserva la lectura autorizada del detalle existente.

El éxito usa `terrenos`, `paginacion`, `parroquias`, `consultado_en`, `metodologia` y `aviso`. El documento original definía ruta y propósito sin JSON detallado. `pagina` es una extensión opcional compatible para evitar cargar todos los marcadores/cachés de una vez, sin cambiar los dos filtros originales ni consumidores anteriores. Predeterminado 1, entero 1–99999; tamaño fijo 50. El total es filtrado y global; mapa, filas y conteos de alertas son de la página visible. Todas las páginas están disponibles y no se truncan silenciosamente los registros. Orden estable nombre ascendente, ID ascendente.

## Filtros y última siembra

| Criterio | Decisión comprobable |
| --- | --- |
| Parroquia | Relación terreno → usuario.parroquia; coincidencia exacta ignorando mayúsculas. Etiqueta «Parroquia del perfil». No se calcula desde coordenadas ni se afirma que sea la parroquia del lote. |
| Cultivo | Debe existir en el catálogo PostgreSQL; busca cualquier siembra del historial. El último cultivo puede ser distinto y se muestra igualmente. No existe una marca de «cultivo actual observado». |
| Última siembra | Mayor fecha_siembra; desempate por creado_en descendente con NULL al final, luego UUID descendente. Puede ser una siembra futura registrada. Sin historial: null y texto explícito. |
| Vacíos | Parroquia/cultivo vacíos u omitidos equivalen a todos. Una parroquia válida sin coincidencias devuelve lista vacía. Cultivo no registrado devuelve 400. |
| Entradas | Límites de longitud, controles, sintaxis de ID, página, duplicados/arrays y claves no autorizadas validados. Prisma parametriza consultas; no se concatena SQL de entradas. |

Las opciones de parroquia proceden solo de perfiles con terrenos registrados y no exponen sus demás campos. Los agricultores siguen viendo solo sus terrenos en las rutas existentes; el nuevo panel no concede permisos adicionales a su rol.

## Alertas y disponibilidad

Se reutilizan `obtenerClavePronostico`, `validarPronosticoVigente`, `calcularVigenciaPronostico`, `generarAlertas` y el umbral configurado del módulo Open-Meteo. No se duplica la transformación del proveedor ni se mezcla con riesgo NASA o conteos históricos ≤0 °C. Umbral preventivo predeterminado **mínima prevista ≤2 °C**; configurable mediante UMBRAL_HELADA_C existente.

| Estado | Condición |
| --- | --- |
| Posible helada | Al menos una mínima válida está dentro del umbral. Se publican fecha, temperatura, tipo y mensaje por día. También se indica cobertura si faltan otras mínimas. |
| Sin alertas previstas | Las siete mínimas son válidas y ninguna entra en el umbral. No significa ausencia garantizada de heladas locales. |
| Desconocido | Caché ausente, inválida, vencida, futura, de otro punto, con fecha SQL incoherente, o mínimas incompletas sin una alerta positiva verificable. Nunca se convierte en «sin riesgo». |

Caché máxima de 30 minutos, limitada además por medianoche en Ecuador. Se conserva la fecha de consulta original, distinta de la emisión del modelo. El cliente retira las alertas al vencer y al recuperar foco; consulta el resumen cada minuto con aislamiento de sesión. Cambiar el reloj de presentación no recentra el mapa.

El panel hace **una lectura SQL de hasta 50 claves distintas**, sin llamadas externas por terreno, sin upserts y sin reconstruir el pronóstico. Por tanto no multiplica concurrencia ni cuotas, y una caída de Open-Meteo no impide listar registros disponibles en SQL. Para obtener un dato ausente o actualizar uno vencido, se abre el detalle y su pronóstico: allí actúan el servicio, caché, deduplicación, enfriamiento y límites existentes. «Revisar datos guardados» vuelve a consultar SQL; no obliga a NASA/Open-Meteo a actualizarse.

La interfaz atribuye [Open-Meteo](https://open-meteo.com/) y [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), e identifica las alertas como elaboración preventiva de RotaAndes. No se consultó un proveedor nuevo ni se afirma haber obtenido en esta fase una nueva respuesta meteorológica real. Las verificaciones reales históricas permanecen en el informe de pronóstico; las pruebas del panel usan datos controlados.

## Interfaz, mapa y seguridad de sesión

Página `/tecnico`, disponible desde navegación solo para ese rol. Un agricultor que escriba la URL recibe vista de acceso restringido sin consulta al endpoint; el servidor verifica igualmente 403. Incluye resumen, mapa Leaflet/OSM, filtros, lista responsive, última siembra, estados de helada con texto/símbolos, fechas/fuentes, paginación, carga, vacío, errores y reintentos. El mapa usa datos mínimos, marcadores numerados, ventanas y enlaces; fuente OSM y alternativa de coordenadas/listado ante falta de teselas.

Se reutiliza el detalle autorizado sin controles de escritura y con regreso al panel. No se crean nuevas pantallas agrícolas ni se alteran módulos existentes. Panel y Leaflet se cargan de forma diferida. Cachés TanStack por usuario, filtros y página; API centralizada y respuesta validada, rechazo de datos privados inesperados, cancelación y guardas contra respuestas de sesiones anteriores.

El técnico no puede crear, modificar ni eliminar terrenos o siembras, cambiar roles o modificar perfiles de agricultores. Las pruebas lo comprueban por HTTP, no solo ocultando controles. Puede mantener sus propios datos de perfil conforme al contrato previo; eso no concede edición de agricultores. El listado no modifica datos agrícolas ni caché; la consulta individual de pronóstico conserva su escritura de caché meteorológica ya existente.

## Aprovisionamiento seguro

Procedimiento local Windows preparado, sin cuenta permanente creada:

```powershell
npm.cmd run tecnico:crear
```

El asistente solicita correo nuevo, nombre y contraseña **con entrada oculta**. No hay contraseña predeterminada, archivo de credenciales nuevo ni SQL manual. Transfiere JSON mediante stdin privado a Node; los argumentos solo contienen el script y, cuando corresponde, el modificador de pruebas. PowerShell escribe bytes UTF-8 y Node decodifica el flujo sin romper caracteres entre fragmentos. Se libera el BSTR, se limpia el buffer de bytes y se descartan referencias a los textos; no se promete borrado físico de todas las copias de strings administradas.

Node valida los mismos requisitos del registro: contraseña de al menos 15 caracteres y máximo 72 bytes UTF-8 sin NUL, nombre/correo válidos y claves no autorizadas rechazadas. bcrypt coste 12; rol fijado en el procedimiento, nunca elegido por registro público. Un correo existente se rechaza sin promocionar su cuenta ni cambiar rol/contraseña. Una carrera por correo único falla, sin upsert ni reemplazo. La salida no publica hash, contraseña, token o URL de conexión.

Destino predeterminado: `rotaandes_dev`, 127.0.0.1:5432, rotaandes_app. `-BasePruebas` selecciona explícitamente TEST_DATABASE_URL y exige la base local aislada con nombre validado. NODE_ENV=production se rechaza antes de conectar, aunque existan pines de Railway. **Este procedimiento no aprovisiona producción**: una cuenta permanente allí requiere autorización expresa y un procedimiento separado para ese destino. No se modifican usuarios reales para llenar el panel.

Las pruebas crean técnicos temporales en transacciones revertidas y mediante el asistente completo en la base aislada, verifican contraseña Unicode con bcrypt y login, y eliminan por correo aleatorio exacto. Los E2E utilizan otra cuenta temporal del mismo servicio administrativo y agricultores registrados normalmente; todos se limpian al terminar. La prueba del rechazo de producción no conecta a SQL.

## Pruebas y evidencias

La ejecución final de **`npm.cmd run check` terminó con código 0**. Ejecutó lint, TypeScript estricto, pruebas unitarias, integración PostgreSQL, compilación de ambos paquetes y los seis grupos Playwright. También se ejecutaron lint, typecheck, test y el recorrido técnico/build por separado; después del ajuste final de decodificación del asistente se repitieron lint y tipos backend con código 0.

| Grupo | Aprobadas |
| --- | ---: |
| Backend, 22 archivos | 352 |
| Frontend, 16 archivos | 144 |
| PostgreSQL/HTTP/proceso real, 14 archivos | 143 |
| E2E generales anteriores | 16 |
| E2E integral y rotaciones | 4 |
| E2E escenarios | 2 |
| E2E capas | 2 |
| E2E tendencias | 2 |
| E2E panel técnico, escritorio/celular | 2 |
| **Total** | **667** |

Se preservan las 621 anteriores y se añaden **46**: 21 backend, 14 frontend, 9 PostgreSQL/proceso y 2 E2E. La prueba Windows del asistente se ejecutó, no quedó omitida. Además se ejecutó por separado `tests/scripts/crearTecnicoLocal.test.ps1`, con sintaxis válida, entrada oculta de prueba y rechazo de producción antes de SQL. La primera prueba completa del asistente falló por la incompatibilidad descrita; la repetición específica y el check final pasaron tras corregirla.

Las nuevas pruebas cubren JWT/roles y revocación de permiso por cambio SQL, filtros, vacíos, orden determinista, 51 terrenos/paginación, última siembra, campos privados excluidos, umbral inclusivo/configurable, caché ausente/vencida/futura/ajena/incoherente, datos incompletos, cero consultas externas y ausencia de mutaciones, aprovisionamiento sin promoción de cuentas, bcrypt/Unicode/login, validación de respuesta, errores/reintento, vencimiento en pantalla y cierre/cambio de sesión con respuesta tardía.

El recorrido E2E crea un técnico mediante el servicio administrativo y dos agricultores mediante registro, con claves aleatorias. Persiste tres terrenos y dos siembras, usa dos pronósticos controlados, comprueba mapa real Leaflet con marcadores/ventana, filtros combinados, el último cultivo distinto al filtrado histórico, tres estados de alerta, teclado, detalle sin edición, error y reintento, cambio de sesión, 403 técnico al escribir, 403 agricultor en panel y 404 de terreno ajeno. Compara terreno/siembras/caché antes y después, con **cero mutaciones de consulta y cero errores JavaScript/consola inesperados**. Se comprobó ausencia de desbordamiento global en escritorio y móvil emulado.

Compilación aprobada: panel diferido de **8,61 kB** (3,14 kB gzip) y bundle principal aproximado **512,04 kB** (150,42 kB gzip). Permanece un aviso no bloqueante por superar 500 kB; no se oculta ni se amplía el límite del compilador. Sin dependencias nuevas ni cambios de lockfile.

Se conservaron **10 capturas** locales en `.tmp/evidencias-panel-tecnico/`, subcarpetas `escritorio` y `celular`, fuera de Git: panel, filtros, mapa, detalle de solo lectura y error, además de JSON de evidencia/procedencia. Se inspeccionaron visualmente ambas vistas y el centrado de los marcadores corregidos. Son registros/cuentas temporales y pronósticos sintéticos expresamente controlados; **no son datos meteorológicos actuales ni una demostración en producción**. Las teselas OSM se bloquean en estos E2E para no depender de Internet, verificando marcadores reales, atribución y alternativa ante error de mapa.

La inspección posterior en transacciones de solo lectura confirmó ambas bases mediante `rotaandes_app`: desarrollo conserva cero usuarios/terrenos/siembras/caché, diez cultivos y ocho plantillas; la base aislada tiene **cero registros en las seis tablas**, incluidas las cuentas técnicas temporales. Ambas conservan `20261107000100_esquema_inicial` aplicada y vigente; Prisma informó sin migraciones pendientes. No se creó ni borró ninguna base ni se modificaron credenciales.

La auditoría de los 244 archivos versionables actuales no detectó secretos o URLs privadas; 632 dependencias resueltas conservan integridad/origen y ninguna cambió de versión. Las comprobaciones Git de los documentos protegidos, esquema, migración, main, rama publicada y etiqueta coinciden con sus referencias iniciales. El índice preparado se revisa antes del commit solicitado.

Consulta de producción **solo en lectura**, 2026-11-09T04:37:18.408Z (8 de noviembre, Ecuador): Railway conserva backend `022133e1-d1e1-4d86-9c40-595f8e300cd8` y PostgreSQL `b0ed8114-97a2-4e90-b54b-0d7b8d14e158`, ambos SUCCESS; Vercel conserva `dpl_4PLbbQ3ZQoNbYJrixBBSbYq4ws5q`, READY. Frontend y salud backend devolvieron HTTP 200. No se consultó ni modificó la base de producción ni se creó una cuenta técnica allí.

## Incidencias corregidas y límites

- El asistente inicial usaba una propiedad no disponible en Windows PowerShell 5. La prueba de creación completa reprodujo el fallo; se sustituyó por escritura UTF-8 directa y se repitió con nombre/contraseña Unicode, login y limpieza aprobados.
- La revisión visual encontró números descentrados en marcadores por la precedencia del CSS de Leaflet sobre display. Se añadió un contenedor interior centrado y una comprobación de navegador; no se oculta ningún error de mapa ni se reactivan animaciones de desmontaje.
- Se corrigieron importación del catálogo y tipos del doble de pruebas Prisma durante typecheck, sin relajar strict ni usar any para ocultarlos.
- La página no efectúa actualización meteorológica masiva: un terreno sin caché muestra desconocido hasta consultar su pronóstico individual. Los conteos de alerta no representan todos los terrenos a la vez, sino la página visible. Conteo/listado y opciones no son un snapshot transaccional global frente a cambios concurrentes de agricultores; pueden requerir volver a consultar.
- Parroquia declarada en perfil y última fecha registrada no certifican ubicación/cultivo actual. Pronóstico regional no es medición exacta ni garantía de helada. Persisten límites documentados de JWT, cuotas por proceso, datos agronómicos referenciales y revisión móvil emulada, sin certificación WCAG o dispositivo físico.

## Archivos y protección

Backend: `routes/tecnico.ts`, `services/panelTecnico.ts`, `services/aprovisionarTecnico.ts`, `scripts/aprovisionarTecnico.ts`, integración en `aplicacion.ts` y pruebas unitarias/SQL. Asistente Windows y auxiliares de prueba en `scripts/` y `tests/scripts/`. Frontend: `pages/PanelTecnico.tsx`, tipos/validación de panel, API central, rutas/navegación/regreso del detalle, adaptación mínima de datos del mapa y centrado de marcadores, fixtures/tests. Navegador: `panelTecnico.spec.ts`, nueva configuración y sexto grupo añadido a scripts/check. Documentación: README, DECISIONES y este informe.

Sin migraciones, dependencias nuevas, secretos, datos privados o artefactos versionados. PROYECTO.md, AGENTS.md, main, release/publicacion y etiqueta original se conservan. No se modifica PostgreSQL de producción, crean servicios, publican cambios ni inicia PDF/landing/glosario. El hash del commit local y el estado final de Git se entregan al concluir, evitando autorreferencia en el propio commit.
