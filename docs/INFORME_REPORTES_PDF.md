# Informes PDF de terrenos — RotaAndes

Fecha de cierre: 9 de noviembre de 2026, Ecuador continental. Implementación local en `feat/reportes-pdf`, desde `109355f0059ddb28238b0105a8c0e858f66e6d59`. No se ha enviado ni desplegado esta actualización.

## Resultado y contrato

Implementado **`GET /api/terrenos/:id/reporte.pdf`**. Requiere Bearer JWT validado y utiliza los permisos y el rol vigente obtenidos de PostgreSQL. El agricultor solo descarga sus terrenos; un recurso ajeno responde 404, igual que uno inexistente. El técnico puede leer, sin permisos de escritura adicionales. Las coordenadas proceden exclusivamente del terreno guardado.

El éxito devuelve un PDF completo, `Content-Type: application/pdf`, longitud conocida y `Content-Disposition: attachment; filename="rotaandes-<UUID>.pdf"`. El nombre no utiliza texto suministrado por el usuario. No admite parámetros de consulta: siempre representa el escenario original, lluvia 0 % y temperatura 0 °C. No exporta la selección temporal de los controles del simulador.

| Situación | Resultado |
| --- | --- |
| Propietario o técnico autorizado | 200, PDF binario |
| JWT ausente o inválido | 401, contrato JSON de errores existente |
| UUID inválido, parámetros adicionales o más de 200 siembras | 400, sin PDF parcial ocultamente truncado |
| Terreno inexistente o de otro agricultor | 404, sin revelar su existencia |
| Exceso de frecuencia o generación ocupada | 429, mensaje para reintentar |
| Fallo interno, composición inválida o plazo excedido | 500, sin trazas ni documento aparentemente correcto |
| Proveedor temporalmente indisponible | PDF parcial explícito, si los datos del terreno permiten un informe útil |

Los errores conservan `{ "error": "mensaje" }`. El documento no se envía mientras se compone; primero debe completarse y superar sus límites.

## Arquitectura y dependencias

1. `routes/reportes.ts`: autenticación, UUID, limitador y transporte binario.
2. `services/reportes.ts`: lectura mínima de PostgreSQL, composición de datos, permisos, concurrencia, tratamiento de proveedores y motores existentes.
3. `services/pdfTerreno.ts`: compositor PDFKit independiente de Express, con tablas, gráficos vectoriales, fuentes y advertencias.
4. `frontend/src/lib/api.ts`: solicitud autenticada, lectura binaria limitada y validación de MIME/firma.
5. `DescargarReporte.tsx`: interacción, cancelación, sesión y limpieza de URL temporal.

PDFKit **0.20.2** es dependencia de ejecución del backend; `@types/pdfkit` **0.17.7** es de desarrollo. PDF.js **6.5.438**, en la raíz como dependencia de desarrollo, valida los documentos con un parser real. Su canvas opcional se utiliza para las capturas locales del PDF, sin importarlo en el servidor ni en React. Node **24.20.0**, Prisma **7.10.1**, ESM y TypeScript estricto se conservan. No requiere Chromium, procesos de navegador, fuentes del sistema, servicios adicionales ni rutas de Windows durante la generación.

La elección se contrastó con [PDFKit](https://pdfkit.org/docs/getting_started.html) y los [ejemplos oficiales de PDF.js](https://mozilla.github.io/pdf.js/examples/). El único lockfile registra versiones, origen npm e integridad. No se actualizaron versiones de paquetes preexistentes.

La aplicación comparte las instancias existentes de climatología, pronóstico y tendencias con las rutas previas y el informe. Solo consulta climatología una vez por informe y la reutiliza en calendario y rotaciones. Las tres consultas climáticas son concurrentes y mantienen validación, deduplicación, cachés y tiempos de espera propios. El cálculo del inicio común de rotación se extrajo a `obtenerInicioRotacion`, conservando la regla original: primer día del mes posterior al máximo entre fecha actual ecuatoriana y fechas registradas.

## Contenido y procedencia

| Apartado | Datos y alcance |
| --- | --- |
| Portada | Nombre, identificador, fecha de generación en Ecuador, escenario original y avisos de apoyo a decisiones |
| Lote | Coordenadas, altitud estimada, área declarada, riego y tipo de suelo de PostgreSQL; altitud atribuida a Open-Meteo/Copernicus DEM GLO-90, no medida exacta |
| Historial | Cultivo, fecha de siembra y cosecha registrada; sin convertir DATE por la zona horaria de presentación; sin notas privadas |
| Climatología | NASA POWER, periodo real del servicio, consulta, origen de caché, antigüedad, resolución, doce meses, temperaturas, lluvia mensual, GWETROOT y riesgo heurístico; barras de lluvia y tabla |
| Pronóstico | Open-Meteo, siete días, mínimas/máximas, precipitación, umbral configurado y alertas preventivas; consulta, vencimiento, zona horaria, atribución CC BY 4.0 y valores ausentes |
| Calendario | Matriz de diez cultivos por doce meses, leyenda R/C/N/? y todos los motivos calculados para las 120 celdas |
| Rotaciones | Tres posiciones del comparador existente, secuencias, planificación, índices, prioridades/peso climático, motivos, evidencia, beneficios potenciales, riesgos y vacíos de información |
| Tendencias | Series 2005–2024 válidas, precipitación anual, menor mínima mensual, días de helada modelados y cobertura; pendientes descriptivas, diferencias, años excluidos y metodología |
| Fuentes y límites | PostgreSQL, NASA POWER/MERRA-2, Open-Meteo y motores referenciales; enlaces oficiales y advertencias de interpretación |

No añade reglas, cultivos, rendimientos, ingresos monetarios ni correcciones por altitud. Los indicadores 0–100 del comparador siguen siendo heurísticos, no ahorros o mejoras observados. El escenario original no cambia el historial ni los registros reales. Un proveedor puede actualizar su caché mediante el servicio ya existente; esto no constituye una modificación de datos agrícolas.

NASA conserva sus unidades y conversiones verificadas por módulos anteriores. PRECTOTCORR original en mm/día se convierte en precipitación mensual según el servicio; las tendencias usan días reales, incluidos bisiestos. El documento reproduce la metodología del producto, sin presentar extremos de T2M_MIN/MAX climatológicos como medias de mínimas diarias. El índice GWETROOT no es porcentaje volumétrico, GWETTOP no es humedad relativa ni SMAP. El conteo histórico exige datos diarios modelados a ≤0 °C; es distinto de las alertas preventivas del pronóstico a ≤2 °C por defecto. No se atribuyen causas ni significancia estadística.

No se hizo una nueva consulta en vivo a NASA/Open-Meteo durante esta fase: se reutilizaron sus clientes previamente verificados. Las evidencias nuevas utilizan cachés controladas, claramente identificadas; no son mediciones de una finca ni acreditan un pronóstico vigente real.

## Datos incompletos y errores

Los errores tipados de disponibilidad de NASA, Open-Meteo y tendencias dejan la sección explícitamente indisponible. Las demás secciones verificables continúan. La ausencia de pronóstico es estado desconocido, nunca «sin riesgo». Un pronóstico vencido se excluye. La antigüedad de climatología o tendencias de respaldo del mismo punto se conserva visiblemente según el servicio original; no se utiliza otra localidad.

El calendario conserva estados no determinados y restricciones conocidas cuando falta clima. Un catálogo incompleto o inválido impide presentar ese calendario. Las rotaciones mantienen las limitaciones de su motor; si no se pueden evaluar, no se fabrican tres alternativas para rellenar el documento. Un error interno no tipado no se transforma en simple indisponibilidad del proveedor: devuelve 500.

## Diseño, accesibilidad y límites operativos

A4 vertical, márgenes, paleta verde/tierra, encabezados, número y total de páginas. Las tablas repiten encabezados al cambiar de página. Los gráficos son vectoriales y tienen tablas numéricas complementarias; los faltantes aparecen como «Sin dato» o ND, sin barras falsas en cero. El calendario usa letras con leyenda además de colores. La descarga tiene nombre, estados de preparación/éxito/error y botón accesible por teclado. El texto es extraíble; el PDF no está certificado como PDF/UA ni incorpora una estructura completa de etiquetas para lectores de pantalla.

Helvetica estándar representa español y acentos. Se normaliza NFC, se convierten operadores a `<=`/`->` y caracteres no compatibles a `[símbolo]`, con advertencia. No se promete Unicode completo. Nombres largos se ajustan al ancho. Las 120 explicaciones se conservan completas: el informe puede ser largo; el ejemplo tiene 37 páginas.

| Protección | Límite / comportamiento |
| --- | --- |
| Frecuencia | Tres solicitudes/minuto por usuario autenticado |
| Concurrencia | Un informe por proceso, sin cola ilimitada |
| Historial | Hasta 200 siembras; lectura de 201 para detectar exceso, rechazo explícito |
| Preparación | 25 s después de autorizar y leer el terreno; la consulta inicial de autorización conserva los límites del acceso SQL existente |
| Composición | Presupuesto cooperativo de 4 s, revisado entre bloques |
| Documento | Hasta 80 páginas y 4 MiB; máximo 12000 caracteres por bloque |
| Navegador | Espera máxima 35 s y lectura binaria hasta 4 MiB |

El plazo no interrumpe una operación SQL o de proveedor que ya esté en curso. El cupo permanece ocupado hasta su terminación y se descarta la respuesta tardía antes de componer el PDF. Una operación subyacente que no termine bloquearía ese cupo; se evita abrir generaciones ilimitadas. Los límites en memoria son por proceso, adecuados a la réplica existente; varias réplicas necesitarían coordinación externa. El presupuesto de composición no es una interrupción forzosa de CPU.

El servidor no interpreta HTML ni carga imágenes, fuentes o rutas proporcionadas por el usuario. No crea archivos privados de informes en disco; compone en memoria y entrega el binario completo. La respuesta privada conserva las protecciones HTTP existentes. El frontend utiliza `credentials: omit`, Bearer y `cache: no-store`; no coloca tokens en URLs ni guarda el Blob en TanStack Query. Comprueba sesión antes de descargar, aborta al desmontar y revoca URLs temporales. Una descarga ya iniciada pertenece al navegador y no se puede retirar con logout.

## Pruebas ejecutadas

`npm.cmd run check` terminó con **código 0**. Incluyó lint, TypeScript, pruebas backend/frontend, migración y pruebas PostgreSQL, build y todos los grupos Playwright. Lint y typecheck se volvieron a ejecutar tras añadir el verificador local, también con código 0. `npm.cmd run test:pdf` compiló y ejecutó aparte la descarga de escritorio/celular, con código 0. `npm.cmd audit --json` informó **cero vulnerabilidades conocidas**, sin aplicar actualizaciones automáticas.

| Batería | Aprobadas |
| --- | ---: |
| Backend, 23 archivos | 358 |
| Frontend, 18 archivos | 158 |
| PostgreSQL, 15 archivos | 152 |
| Playwright, escritorio/celular y módulos previos | 30 |
| **Total** | **698** |

Son 31 pruebas nuevas sobre las 667 anteriores: seis del compositor, nueve SQL/HTTP, diez del transporte binario, cuatro del componente y dos E2E. Las pruebas normales no dependen de Internet. Las pequeñas respuestas del test de transporte son fixtures de bytes y no se presentan como documentos auténticos: compositor, SQL y E2E sí validan PDFKit real mediante PDF.js.

Cobertura nueva: autorización/JWT, aislamiento horizontal con 404, lectura técnica y prohibición de escritura existente, UUID y consultas inválidas, contenido desde SQL y motores, ausencia de contactos/hash/notas, fuentes/unidades, acentos y ñ, páginas A4, paginación y posiciones, texto extraíble, determinismo para iguales datos y fecha, secciones parciales, fallos internos, límites de historial/páginas/texto, concurrencia, vencimiento y descarte tardío, errores binarios/HTTP, cambio de sesión, abortado y revocación de URLs.

En ambos E2E se registra un agricultor temporal por la interfaz, se utiliza PostgreSQL aislado con terreno y siembras temporales, se preparan cachés controladas y se descarga un PDF real usando Bearer. Se verifica el contenido, se simula un error de API sin archivo falso, se prueba otro agricultor y un técnico temporal y se comparan terreno, historial y cachés antes/después. No hubo errores de página ni de consola inesperados, ni desbordamiento horizontal. Los tiles OSM se bloquean en estas pruebas para no depender de Internet; la integración cartográfica sigue cubierta por las pruebas previas.

El build terminó correctamente. Persiste la advertencia no bloqueante del chunk principal del frontend, aproximadamente **515,80 kB / 151,57 kB gzip**, superior a 500 kB. PDFKit y PDF.js no se incluyen en el bundle del navegador.

## Evidencias locales y verificación independiente

Artefactos ignorados en `.tmp/evidencias-reportes-pdf/`; no contienen datos de personas reales y no se versionan. Las fechas de consulta de los cachés de prueba identifican la ejecución controlada, no una nueva adquisición meteorológica.

- `informe-ejemplo-controlado.pdf`: **37 páginas, 78048 bytes**, SHA-256 `f8c68c340866d7da057a4c28025e6757a301432a58a689d6258cda3155564a2d`.
- `escritorio/` y `celular/`: PDF descargado, `descarga-pdf.png`, `error-pdf.png` y `evidencia-pdf.json`. En móvil: 37 páginas, 78028 bytes; los metadatos temporales/UUID propios de cada recorrido explican la diferencia de bytes.
- `pdf-portada.png`, `pdf-clima.png`, `pdf-pronostico.png`, `pdf-calendario.png`, `pdf-rotaciones.png` y `pdf-tendencias.png`: páginas renderizadas del PDF real, revisadas visualmente.
- `.tmp/check-reportes-pdf.log`: resultados de la batería completa.

Para verificar el ejemplo de esta computadora, sin imprimir su texto ni ruta privada:

```powershell
npm.cmd run pdf:verificar --workspace backend -- ../.tmp/evidencias-reportes-pdf/informe-ejemplo-controlado.pdf
```

Resultado ejecutado: PDF válido, A4, 37 páginas, 78048 bytes y 127829 caracteres extraíbles. Un clon no incluye `.tmp/`: puede generar otro documento con el botón o ejecutar `npm.cmd run test:pdf` y verificar su artefacto de `test-results/pdf/`. El verificador admite también una ruta absoluta. No se deben incorporar PDFs de agricultores reales al repositorio.

## PostgreSQL, Git y producción

Comprobación de solo lectura posterior a E2E: ambas bases conectan como `rotaandes_app` y conservan `20261107000100_esquema_inicial` aplicada. Sin migraciones nuevas ni pendientes.

| Base | Usuarios | Terrenos | Cultivos | Siembras | Plantillas | Caché |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `rotaandes_dev` | 0 | 0 | 10 | 0 | 8 | 0 |
| `rotaandes_pruebas_36cbc85c` | 0 | 0 | 0 | 0 | 0 | 0 |

Sin usuarios temporales PDF residuales. Las pruebas SQL revierten sus transacciones; E2E limpia únicamente sus correos exactos, semillas que haya añadido y cachés propias/restauradas. No se borraron ni recrearon bases, ni se alteraron credenciales o datos de terceros.

Revisión de archivos y lockfile: sin coincidencias de secretos privados configurados, tokens reconocibles, URLs privadas con credenciales pendientes ni archivos generados para versionar. Los 663 paquetes resueltos revisados tienen origen npm e integridad; no cambian versiones existentes. `.env` y evidencias están ignorados. Se revisa nuevamente el índice antes del commit local solicitado. `PROYECTO.md`, `AGENTS.md`, esquema/migración, main, rama publicada y etiqueta original se conservan.

Consulta de solo lectura del **9 de noviembre de 2026 a las 05:32 UTC**: Railway mantiene backend `022133e1-d1e1-4d86-9c40-595f8e300cd8` y PostgreSQL `b0ed8114-97a2-4e90-b54b-0d7b8d14e158`, ambos SUCCESS; Vercel mantiene `dpl_4PLbbQ3ZQoNbYJrixBBSbYq4ws5q`, READY. [Frontend](https://rotaandes.vercel.app) y [salud del backend](https://backend-production-954a9.up.railway.app/api/health) respondieron HTTP 200. La salud respondió `{ "ok": true }`. No se consultó ni modificó la base de producción. El código público permanece en `012d6be`, con cierre documental `c2d4252`; no incluye tendencias, panel técnico ni PDF locales.

## Archivos de esta fase

- Backend: `src/routes/reportes.ts`, `src/services/reportes.ts`, `src/services/pdfTerreno.ts`, `src/aplicacion.ts`, `src/routes/rotaciones.ts`, `src/services/motorRotacion.ts`, `scripts/verificarPdf.ts`, `package.json`.
- Pruebas backend: `tests/pdfTerreno.test.ts`, `tests/base-datos/reportes.integration.test.ts`, `tests/fixtures/leerPdf.ts`, `tests/fixtures/reportePruebas.ts`.
- Frontend: `src/components/DescargarReporte.tsx`, su prueba, `src/lib/api.ts`, `src/lib/reportePdf.test.ts`, `src/pages/DetalleTerreno.tsx`.
- Infraestructura local de pruebas: `playwright.pdf.config.ts`, `playwright.config.ts`, `tests/navegador/reportesPdf.spec.ts`, `package.json`, `package-lock.json`.
- Documentación: `README.md`, `docs/DECISIONES.md`, este informe.

## Limitaciones pendientes

Sin validación agronómica local, garantía de rendimientos, cobertura Unicode universal ni certificación PDF/UA. Informe estático: un pronóstico puede vencer después de descargarlo. No contiene cartografía satelital analítica ni exporta escenarios modificados. Historial superior a 200 registros o documento superior a los límites exige otro diseño de exportación; no se oculta información con truncamiento. La concurrencia y frecuencia son por proceso, y las consultas externas ya iniciadas no se cancelan al vencer el plazo del informe. No se detectaron errores críticos pendientes en esta fase. La publicación del módulo requiere una autorización posterior; no se inicia landing, glosario ni otro módulo.
