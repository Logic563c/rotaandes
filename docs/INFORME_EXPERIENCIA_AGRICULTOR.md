# Experiencia del agricultor, portada y páginas informativas

> **Registro histórico de esta fase.** Se conservan sus fechas, versiones, cifras y resultados; las menciones a publicación pendiente o a repositorio privado describen ese momento. Para la versión vigente, las instrucciones actuales y las evidencias verificadas el 15-11-2026, consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los comandos de publicación, migración o reversión de este registro no son instrucciones para la auditoría documental actual.

Fecha: 9 de noviembre de 2026, Ecuador continental. Rama local `feat/experiencia-agricultor`, creada desde `23995cc0d364d2ee3d03f068c84ac4e0f0cf18d4`, con Git inicialmente limpio.

Esta fase mejora la comprensión y la navegación del producto existente. No añade reglas agrícolas, altera contratos, cambia permisos ni reconstruye módulos. Conserva el informe PDF completo y la versión pública. No constituye la auditoría final del producto.

## Pantallas y navegación

| Página | Acceso | Contenido |
| --- | --- | --- |
| `/` | Público | Mensaje «Conoce tu terreno, comprende el clima y explora mejores opciones para sembrar», cuenta/acceso, tres pasos, fuentes y límites |
| `/glosario` | Público | Quince términos, definiciones, ejemplos y búsqueda sin distinguir tildes |
| `/fuentes` | Público | Acerca de, procedencia de información, atribuciones y límites científicos |
| `/acerca-de` | Público | Redirección a `/fuentes`, sin duplicar contenidos |
| Mi espacio | Sesión existente | Acceso principal a terrenos del agricultor o panel técnico según rol, conservando perfil/prioridades |
| Detalle del terreno | Permisos existentes | Accesos por preguntas a calendario, pronóstico, rotaciones, escenarios, historial e informe |
| Calendario | Permisos existentes | Resumen de un mes, matriz y motivos completos calculados por el backend |

Se reutilizan Marco, paleta verde/tierra, ilustración SVG andina, formularios, mapa Leaflet, gráficos Recharts, TanStack Query y autenticación existentes. No se incorporan imágenes externas nuevas, logos oficiales, testimonios, cifras de impacto, avales o promesas de rendimiento. Las páginas de glosario y fuentes se cargan de forma diferida, sin dependencias nuevas.

La portada presenta primero su propósito y los tres pasos: registrar el terreno, consultar clima/cultivos y comparar próximas siembras. La comprobación de conexión sigue disponible con reintento, en una sección secundaria. Un fallo del backend no bloquea glosario o fuentes, siempre que el frontend se haya cargado. No se implementa funcionamiento sin conexión ni se promete que esas páginas carguen desde cero sin Internet.

## Decisiones de usabilidad

El detalle ofrece «¿Qué puedo sembrar?», «¿Cómo estará el clima?», «¿Qué cultivo puedo sembrar después?», «¿Y si llueve menos?», «Mis siembras e historial» y «Descargar informe». Son anclas a módulos existentes; no realizan consultas anticipadas ni modifican sus botones, validaciones o cálculos.

El calendario ofrece «Para empezar: un mes a la vez». El agricultor elige un mes y ve cultivos agrupados por los cuatro estados de la respuesta existente. El mes inicial corresponde a Ecuador. No hay una clasificación agronómica nueva ni solicitudes adicionales: se muestran los valores ya calculados, con sus limitaciones, antigüedad y fuente. Los estados no determinados permanecen separados de «posible con cuidado». Si falta una celda en una entrada de presentación, se conserva la incertidumbre; el cliente HTTP mantiene su validación de respuestas completas.

El resumen no resume el PDF mediante texto inventado ni selecciona una rotación como ganadora. El comparador conserva sus tres posiciones, puntajes referenciales y explicaciones. El escenario original, la climatología y el pronóstico siguen diferenciados. Se indica que el PDF contiene todas las explicaciones y puede ser largo, invitando a leer primero el resumen del calendario. El ejemplo técnico previo de 37 páginas y el generador completo se conservan; no se modifica ningún dato para reducirlo.

La creación de terrenos explica cómo tocar otro punto para mover el marcador y cómo introducir coordenadas si el mapa falla o se usa teclado. No dibuja polígonos ni calcula superficie. El visor acompaña NDVI y SMAP con explicaciones sencillas, conservando fechas, leyendas y advertencias originales.

## Glosario y rigor de las fuentes

Términos incluidos: rotación, humedad del suelo, NDVI, evapotranspiración, helada, precipitación, sequía, fijación de nitrógeno, materia orgánica, erosión, cultivo de cobertura, climatología, pronóstico, resolución espacial e indicador referencial. Las definiciones son breves y propias, con ejemplos que no garantizan beneficios agrícolas. La búsqueda normaliza tildes y mayúsculas, limita la entrada y permite mostrar de nuevo la lista completa cuando no encuentra resultados.

Referencias oficiales contrastadas:

- [NASA POWER](https://power.larc.nasa.gov/docs/): climatología y series históricas regionales.
- [NASA MODIS](https://modis.gsfc.nasa.gov/data/dataprod/mod13.php) y [especificación MOD13Q1](https://ladsweb.modaps.eosdis.nasa.gov/filespec/MODIS/61/MOD13Q1): indicador de vegetación, 250 m y composición de 16 días.
- [NASA SMAP](https://smap.jpl.nasa.gov/mission/description/) y [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/): humedad superficial regional e imágenes oficiales.
- [Open-Meteo](https://open-meteo.com/en/docs) y [OpenStreetMap](https://www.openstreetmap.org/copyright): pronóstico/altitud y cartografía; se conservan atribución CC BY 4.0 y © OpenStreetMap contributors/ODbL, respectivamente.
- [FAO: evapotranspiración](https://www.fao.org/4/X0490E/x0490e04.htm), [cobertura](https://www.fao.org/conservation-agriculture/in-practice/soil-organic-cover/en) y [fijación biológica de nitrógeno](https://www.fao.org/4/x5546e/x5546e05.htm); [OMM: tiempo y clima](https://wmo.int/themes/weather).

La página de fuentes separa datos declarados por el agricultor, clima histórico modelado, pronósticos, imágenes satelitales y reglas heurísticas. Explica que GIBS no es GeoJSON analítico, que el procesamiento geoespacial original sigue pendiente y que el zoom no aumenta la resolución. La humedad SMAP no se confunde con humedad del aire ni con GWETTOP/GWETROOT. NDVI no es rendimiento. El catálogo de diez cultivos y ocho plantillas sigue siendo referencial, pendiente de validación local, sin atribuir sus reglas a NASA.

Se conserva la distinción entre conteo histórico modelado a ≤0 °C y alerta preventiva de pronóstico a ≤2 °C por defecto. No se diagnostica sequía, se atribuyen causas de cambios ni se declaran tendencias significativas. La consulta de documentación no equivale a una nueva consulta meteorológica en vivo; la batería usa datos controlados identificados.

## Accesibilidad y adaptación

| Aspecto | Verificación y alcance |
| --- | --- |
| Tamaños | Escritorio y emulación táctil de 320, 375 y 390 px |
| Navegación | Salto al contenido, destinos enfocados con teclado y acceso a módulos mediante anclas |
| Cambio de ruta | Foco al contenido y posición de lectura al abrir otra página, respetando anclas internas |
| Encabezados | Un h1 en páginas públicas cargadas y secuencia sin saltos en las páginas muestreadas |
| Formularios | Etiquetas en inputs/selectores/textarea comprobadas; instrucciones de mapa, alternativa manual y errores generales asociados al formulario en acceso/terreno/siembras |
| Foco | Outline visible para enlaces, botones, campos, selectores, textarea, desplegables y destinos enfocables |
| Objetivos táctiles | Botones principales de 48 px, navegación/ranges de al menos 44 px y zoom Leaflet ampliado a 44 px |
| Contraste | Texto principal 9,32:1, secundario 5,83:1 y botón primario 10,18:1; umbral muestreado 4,5:1, comprobado en los cuatro tamaños |
| Estados | Carga, error/reintento, vacío y resultados no determinados; símbolos/textos además de colores |
| Anchos | Sin desbordamiento del documento en las pantallas del recorrido; las tablas/matrices anchas conservan desplazamiento en su propio contenedor |

Las descripciones de error generales no se atribuyen artificialmente a un campo concreto cuando el contrato no proporciona esa información. La validación nativa de campos obligatorios/formato y las validaciones del backend continúan activas. No se cambian reglas por simplificar los mensajes.

No hay certificación WCAG/PDF-UA, prueba exhaustiva de todos los pares de color, lector de pantalla físico, Android físico ni evaluación con agricultores. La adaptación emulada y el muestreo automático complementan la revisión visual; no sustituyen esos estudios.

### Correcciones verificables durante la fase

- Se reprodujo con una prueba que «Mostrar todos los términos» eliminaba el botón enfocado y dejaba el foco en el documento. Ahora devuelve el foco al buscador; la misma prueba conserva la comprobación de regresión.
- La navegación entre páginas podía conservar una posición de lectura de la página anterior. El marco dirige el foco al contenido de la ruta nueva, sin interferir con las anclas del terreno.
- Faltaban reglas de foco explícitas para selectores, textarea y desplegables; se extendió el estilo existente y se ampliaron ranges/zoom para interacción táctil.
- Los recorridos anteriores de autenticación y primera entrega buscaban «Registrarme» como enlace de portada. Se actualiza a «Crear mi cuenta», conservando registro, perfil, login, persistencia y demás verificaciones. Era una expectativa anterior al cambio de diseño solicitado, no un cambio de autorización.

## Pruebas y evidencias

**`npm.cmd run check` terminó con código 0: 716 pruebas aprobadas.** Incluye todos los módulos anteriores y las comprobaciones nuevas. La prueba de regresión del foco del buscador pasó después de reproducir el fallo. No quedan pruebas fallidas en la ejecución de cierre.

| Batería | Aprobadas |
| --- | ---: |
| Backend, 23 archivos | 358 |
| Frontend, 20 archivos | 168 |
| PostgreSQL, 15 archivos | 152 |
| Playwright: 16 generales, 4 integrales/rotaciones, 2 escenarios, 2 capas, 2 tendencias, 2 panel, 2 PDF y 8 de experiencia | 38 |
| **Total** | **716** |

Se añaden diez pruebas frontend y ocho ejecuciones E2E sobre las 698 anteriores. El recorrido específico tiene dos casos en cuatro proyectos: escritorio 1280 × 720 y celulares emulados de 320 × 844, 375 × 844 y 390 × 844. Las evidencias no registraron errores de página/consola inesperados ni respuestas fallidas de la API en el recorrido integrado positivo. El caso negativo de conexión utiliza un 503 controlado expresamente.

Las comprobaciones ejecutan lint, TypeScript, pruebas unitarias, PostgreSQL, build y Playwright mediante `npm.cmd run check`. El comando específico es `npm.cmd run test:experiencia`. Se conservan las pruebas previas. Se actualizan únicamente expectativas de texto de portada que cambian por el diseño solicitado; no se eliminan comprobaciones de autenticación, permisos o persistencia.

Lint, TypeScript, `test` y build terminaron correctamente dentro de la validación completa. El build conserva la advertencia no bloqueante de un chunk principal superior a 500 kB: aproximadamente **514,20 kB / 150,41 kB gzip**. Glosario y fuentes se generan como chunks diferidos de aproximadamente 6,93 kB y 6,09 kB. No se ha ocultado la advertencia ni ampliado su umbral.

El recorrido nuevo utiliza frontend/backend reales y PostgreSQL aislado. Registra un agricultor, crea un terreno mediante formulario y alternativa manual del mapa, guarda una siembra, abre clima/calendario/rotaciones, compara el resumen con la respuesta real del motor, consulta glosario/fuentes, descarga y parsea un PDF auténtico, comprueba que los registros no cambiaron y cierra sesión. Luego inicia una cuenta técnica temporal para consultar panel y detalle sin botones de escritura. También comprueba lectura pública con backend indisponible y protección de rutas privadas sin sesión.

Los cachés meteorológicos son controlados y el mapa base se bloquea para esa batería. La elevación conserva su manejo real de indisponibilidad; no se afirma una medición de altitud ni una consulta NASA nueva. Las pruebas previas conservan la integración cartográfica y demás módulos. Cuentas, semillas temporales y cachés se limpian o restauran por identificadores exactos.

Evidencias finales conservadas en `.tmp/evidencias-experiencia/`, ignoradas por Git, con subcarpetas `escritorio`, `celular-320`, `celular-375` y `celular-390`: `landing.png`, `formulario-terreno.png`, `navegacion-terreno.png`, `resumen-calendario.png`, `detalle-terreno.png`, `glosario.png`, `fuentes.png`, `panel-tecnico.png`, `informe-controlado.pdf` y `evidencia-experiencia.json`. Son **32 capturas**, cuatro PDFs auténticos y metadatos de procedencia controlada, sin datos de personas reales. Se revisaron visualmente portada, resumen, formulario, glosario, fuentes y panel; las capturas de las pruebas previas permitieron revisar también perfil, pronóstico, calendario, gráficos, rotaciones y simulador. Las teselas bloqueadas de estas pruebas no acreditan una descarga cartográfica real nueva.

El log completo se guarda en `.tmp/check-experiencia-agricultor.log`. Las imágenes largas de celular se pueden abrir y ampliar; no son imágenes de dispositivos físicos. Los artefactos locales no se incluyen en un clon del repositorio. No se deben versionar informes o capturas de agricultores reales.

## Archivos de la fase

- Páginas: `Inicio.tsx`, `Glosario.tsx`, `Fuentes.tsx`, `EspacioPersonal.tsx`, `DetalleTerreno.tsx`, `EditarTerreno.tsx`, `Acceso.tsx` y rutas en `Aplicacion.tsx`.
- Componentes: `Marco.tsx`, `NavegacionTerreno.tsx`, `ResumenCalendario.tsx`, integración en `CalendarioSiembra.tsx`, mensajes asociados en `SiembrasTerreno.tsx` y explicación de `VisorCapas.tsx`.
- Contenido/estilos: `frontend/src/data/glosario.ts`, `frontend/src/estilos.css`.
- Pruebas: `InformacionPublica.test.tsx`, `ResumenCalendario.test.tsx`, ajuste de `Inicio.test.tsx`, `tests/navegador/experienciaAgricultor.spec.ts`, expectativas de portada en `inicio.spec.ts`, `autenticacion.spec.ts` y `primeraEntrega.spec.ts`.
- Ejecución: `playwright.experiencia.config.ts`, exclusión del grupo específico en `playwright.config.ts`, scripts en `package.json`.
- Documentación: `README.md`, `docs/DECISIONES.md` y este informe.

## Conservación y limitaciones

No se han instalado dependencias, modificado el backend, cambiado reglas agrícolas, alterado credenciales ni preparado migraciones. La revisión de archivos no encontró secretos configurados, tokens reconocibles ni URLs privadas pendientes. Las evidencias y `.env` siguen ignorados. Se verifica nuevamente el índice antes del commit.

La comprobación de solo lectura posterior a las pruebas conectó a ambas bases como `rotaandes_app`. La migración original `20261107000100_esquema_inicial` permanece aplicada y la ejecución de Prisma informó que no hay migraciones pendientes.

| Base local | Usuarios | Terrenos | Cultivos | Siembras | Plantillas | Caché |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `rotaandes_dev` | 0 | 0 | 10 | 0 | 8 | 0 |
| `rotaandes_pruebas_36cbc85c` | 0 | 0 | 0 | 0 | 0 | 0 |

Sin cuentas temporales residuales ni bases nuevas. No se conectó a PostgreSQL de producción. La auditoría local revisó 268 archivos y 663 paquetes resueltos con integridad; no hay paquetes añadidos ni cambios de versiones.

`main`, `release/publicacion`, etiqueta de primera entrega, `PROYECTO.md`, `AGENTS.md`, migraciones y lockfile permanecen intactos. No se ha enviado código, creado servicios ni desplegado. La aplicación publicada conserva su fase anterior; estas páginas y mejoras son locales y necesitarán autorización antes de publicarse.

El GeoJSON analítico sigue pendiente. El sistema continúa dependiendo de conectividad y disponibilidad de proveedores para información nueva. Las recomendaciones siguen sin validación agronómica local y no garantizan resultados. El informe completo puede ser extenso; el resumen no lo sustituye ni cambia sus cálculos. No se inicia automáticamente una auditoría final, publicación o módulo adicional.
