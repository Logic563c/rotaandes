# Auditoría integral de la primera entrega de RotaAndes

> **Registro histórico de esta fase.** Se conservan sus fechas, versiones, cifras y resultados; las menciones a publicación pendiente o a repositorio privado describen ese momento. Para la versión vigente, las instrucciones actuales y las evidencias verificadas el 15-11-2026, consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los comandos de publicación, migración o reversión de este registro no son instrucciones para la auditoría documental actual.

Fecha: **8 de noviembre de 2026**, Ecuador continental (UTC−5). Rama: `feat/base-datos-autenticacion`. Base de la auditoría: `8ac808f612f8df85bdf69d8b65ec4b5178f23b0c`.

**Resultado:** el núcleo de la sección 3, Fase 1, está comprobado para una demostración local, con las limitaciones indicadas aquí. Se corrigieron cuatro defectos reproducidos y se amplió la verificación integrada. La ejecución final de `npm.cmd run check` terminó con código **0** y **404 pruebas aprobadas**. No constituye aprobación del producto completo, validación agronómica ni certificación de seguridad. No se realizó ni se verificó un despliegue público funcional.

## 1. Alcance y método

Se revisaron `PROYECTO.md`, `AGENTS.md`, `README.md`, `docs/DECISIONES.md` y los informes de persistencia, autenticación, terrenos/siembras, NASA POWER, pronóstico y calendario. Se inspeccionaron rutas, servicios, validaciones, esquema Prisma/SQL, configuración, sesión, cachés, componentes y pruebas. Se preservaron las funcionalidades y dependencias existentes.

Git comenzó limpio en la rama indicada. `main` apuntaba a `ee4f8c8542744ddecf64a5f2ab58d6993e6e3431`. No se modifican los dos documentos principales ni la migración aprobada. No se instalan dependencias, cambian contraseñas, borran bases o implementan módulos posteriores.

La verificación combina revisión de código, regresiones de defectos reproducidos, HTTP/Prisma contra PostgreSQL aislado, navegador Edge real con escritorio y emulación táctil de celular, inspección visual de capturas y solicitudes externas reales separadas. Las pruebas de navegador interactúan con frontend/backend compilados, no con un servidor simulado.

## 2. Inventario y matriz de requisitos

| Requisito del núcleo (sección 3) | Implementación comprobada | Resultado y límites |
| --- | --- | --- |
| Registro, login y logout | Formularios, bcrypt, JWT, `/auth/yo`, rutas privadas | Verificado mediante HTTP, PostgreSQL y navegador. Registro siempre agricultor; el logout borra sesión local, sin revocar un JWT ya emitido. |
| Perfil del agricultor | Nombre, parroquia, teléfono opcional y tres prioridades | Verificado guardado y nuevo login. Las prioridades se almacenan; todavía no ponderan rotaciones. |
| CRUD de terrenos | Listado, mapa Leaflet/OSM, selección, coordenadas manuales, creación, detalle, edición y eliminación confirmada | Verificados permisos, persistencia, área, riego, suelo y altitud del servidor. Punto y área declarada, sin polígonos ni cálculo de superficie. |
| CRUD de siembras | Catálogo PostgreSQL, altas/edición/borrado e historial por terreno | Verificados fechas civiles, cosecha opcional, orden, relaciones y aislamiento. |
| Climatología NASA POWER | Backend, caché SQL, doce meses, lluvia/temperaturas, humedad, riesgo y Recharts | Verificado con respuesta real y pruebas controladas de fallos. Resolución regional; disponibilidad sin conexión limitada a dato válido del mismo punto o respaldo exacto. |
| Pronóstico de siete días y alertas | Open-Meteo desde backend, zona Ecuador, caché corta y alertas ≤2 °C | Verificado con datos reales y casos controlados de alertas/fallos. No muestra datos vencidos como actuales. |
| Calendario cultivo × mes y motivos | Motor puro, 120 celdas backend, matriz y explicación accesible | Verificados estados, ventanas, altitud, riego, lluvia, tres meses de riesgo y escenarios backend. Valores referenciales sin validación agronómica local. |

Otros requisitos del documento completo, sin confundirlos con estos siete módulos:

| Requisito | Estado |
| --- | --- |
| Portada pública | Implementación básica existente, con descripción actualizada, salud y acceso/registro. |
| Dashboard agregado de la sección 9 | **Parcial**: «Mi espacio» muestra bienvenida/perfil; mapa y alertas se consultan en terrenos/detalle, sin panel inicial agregado. No se rediseña en esta auditoría. |
| Onboarding como pantalla independiente | Prioridades editables en perfil; no hay un recorrido independiente dedicado. |
| Permisos del técnico | Lectura básica autorizada comprobada; no hay registro público de técnicos ni panel avanzado. |
| Funcionamiento universal sin NASA | **Parcial**: se conserva caché/respaldo de ubicación exacta; otro punto sin información válida presenta indisponibilidad controlada. No se atribuyen datos regionales de otro lugar al terreno. |
| Registro humano en menos de un minuto y Chrome Android físico | **Pendiente de validación con personas/dispositivos**. El flujo automatizado móvil pasa; no prueba ese tiempo con agricultores ni un teléfono físico. |
| Rotaciones, tendencias, escenarios visuales, MODIS/SMAP, panel técnico avanzado y PDF | Pendientes y excluidos de esta fase. No se incorporan pantallas, mocks o rutas anticipadas. |
| Glosario, Acerca de/Datos completos, publicación Vercel/Railway y cuentas demo públicas | Pendientes del producto completo. No se crea una contraseña conocida ni se despliega. |

## 3. Recorrido integral realmente ejecutado

La nueva suite `tests/navegador/primeraEntrega.spec.ts` comprueba, en escritorio y celular:

1. Portada y conexión HTTP.
2. Registro de una cuenta temporal con correo/clave aleatorios.
3. Cierre de sesión y login con esa cuenta.
4. Consulta y edición del perfil mediante la interfaz.
5. Prioridades guardadas: agua 5, suelo 2 e ingresos 4.
6. Creación de terreno tocando el mapa centrado en Latacunga, sin asignar coordenadas desde SQL.
7. Comprobación SQL de coordenadas y, en modo real, altitud numérica obtenida del proveedor.
8. Guardado del terreno con área inicial 1,25 ha, suelo franco y riego declarado.
9. Siembra temporal de papa, fecha 2025-10-01 y cosecha 2026-04-01.
10. Siembra temporal de haba, fecha 2026-10-01, sin cosecha.
11. Historial de ambas siembras.
12. Clima histórico, doce meses, unidades, tabla y dos gráficas.
13. Pronóstico de siete días y correspondencia exacta de alertas con las mínimas y el umbral.
14. Calendario de 120 celdas; doce encabezados mensuales más cultivo.
15. Explicaciones de papa/enero y haba/octubre abiertas por teclado y comparadas con el motivo calculado del backend.
16. Edición de la cosecha de papa a 2026-04-15 y de sus notas.
17. Edición del terreno a área 2,50 ha y nuevo nombre.
18. Nuevo logout/login y consulta persistente de terreno e historial.
19. Confirmación directa en SQL de prioridades, área y dos siembras.
20. Cierre y limpieza exclusiva de cuenta, relaciones y datos temporales creados.

Las parcelas, nombres, siembras, prioridades y área son **registros sintéticos de presentación/prueba**, no observaciones de una finca real. La persistencia y las peticiones HTTP sí son reales. La suite previa de terrenos/siembras conserva la cobertura de eliminación y cancelación de confirmaciones.

Hay dos modos diferenciados:

- **Habitual/controlado:** clima y pronóstico precargados temporalmente en la base aislada con fixtures identificadas; no prueba una consulta meteorológica en vivo. Elevación y cartografía pueden consultar servicios externos y tienen su alternativa de fallo. Forma parte de `check`.
- **Proveedores reales:** no precarga clima ni pronóstico. El backend consulta NASA/Open-Meteo usando las coordenadas persistidas. Se ejecutó por separado con `ROTAANDES_E2E_PROVEEDORES_REALES=1`: **2/2 aprobadas**, en 22,0 s. No se contaron como parte de las 404 de `check`.

El modo real obtuvo desde el mapa:

| Navegador | Latitud / longitud guardadas | Altitud Open-Meteo | NASA real consultada (UTC) | Pronóstico real consultado (UTC) |
| --- | --- | --- | --- | --- |
| Escritorio | -0.93002 / -78.620248 | 2770 m | 2026-11-08T05:45:12.600Z | 2026-11-08T05:45:13.353Z |
| Celular emulado | -0.93002 / -78.619881 | 2775 m | 2026-11-08T05:45:21.395Z | 2026-11-08T05:45:22.097Z |

Ambos obtuvieron climatología 2001–2025, siete días previstos y 120 celdas calculadas. En ese pronóstico real no hubo mínimas ≤2 °C y se devolvieron **cero alertas**; las alertas positivas se comprueban con respuestas controladas. No se fabricó una helada para la demostración.

## 4. Hallazgos y correcciones

| Severidad | Hallazgo reproducido | Corrección y verificación |
| --- | --- | --- |
| Alto | NASA respondió 200 al punto seleccionado con seis decimales, pero devolvió GeoJSON con centésimas. La igualdad exacta del backend causaba 500 e impedía clima/calendario. | Se admite igualdad o la menor precisión observada con margen limitado, conservando punto solicitado y aviso. Regresión positiva falló antes de corregir; pasan los casos positivos/negativos/de borde y los dos E2E externos. |
| Medio | PUT parciales de terreno/siembra podían restaurar campos omitidos desde una lectura anterior, y parejas de coordenadas/fechas podían validarse contra valores ya cambiados. | Escritura de campos presentes y comprobación optimista de los valores dependientes. Cuatro regresiones reprodujeron fallos antes de corregir; ahora pasan cinco, incluida conservación de todos los campos omitidos del terreno. |
| Medio | Una transición Leaflet pendiente accedía a `_leaflet_pos` después de navegar y desmontar el mapa. El flujo completaba acciones, pero producía errores de página. | Zoom y centrados sin animaciones pendientes. Los recorridos completos y las transiciones listado/creación/detalle/edición/logout terminan sin errores de la aplicación en ambos tamaños. Se mantienen controles de zoom. |
| Bajo | La portada anunciaba funciones de la entrega como si aún estuvieran por desarrollarse. | Texto alineado con terrenos, siembras, NASA, Open-Meteo y calendario existentes; comprobado en capturas y pruebas. |
| Medio (cobertura) | Las pruebas anteriores cubrían módulos individualmente, sin un único recorrido que enlazara todos con SQL y vigilancia de consola. | Nuevo recorrido integral, modo real separado y oráculo independiente de 120 celdas. Se conservan las suites anteriores. |

No se detectaron defectos críticos sin resolver en las comprobaciones realizadas. Esto no garantiza ausencia de defectos fuera del alcance o de vulnerabilidades todavía desconocidas.

### Límites de la concurrencia

- Los campos omitidos no se reescriben con datos de la lectura previa. Se verificó nombre frente a cambios intercalados de ubicación/altitud/área/riego/suelo, y notas frente a cambios de cultivo/fechas.
- Al modificar coordenadas, la escritura compara latitud, longitud y altitud anteriores; al modificar una fecha, compara ambas fechas anteriores. Una diferencia genera 400 y un mensaje de recarga si el recurso propio todavía existe. Los recursos ajenos/inexistentes siguen siendo 404.
- Las regresiones usan escrituras PostgreSQL reales intercaladas de forma determinista dentro de una transacción revertida. No son una prueba de carga con conexiones concurrentes independientes ni una garantía general de serialización.
- **No existe versionado general**: dos escrituras explícitas sobre el mismo nombre, área, riego, suelo, cultivo o notas pueden prevalecer por orden de escritura. Un formulario que envía todos los campos los está enviando explícitamente. La corrección no implementa ETags ni detección universal de formularios antiguos.

### Límites de la precisión NASA

La respuesta pública real para (-0.93002,-78.620248) incluyó geometría `[-78.62,-0.93,2958.26]`. El tercer valor no reemplaza la altitud Open-Meteo del terreno. Se acepta, por eje, coincidencia exacta o valor devuelto expresado en centésimas con diferencia ≤0,005° y epsilon numérico 1e-9. Ese margen corresponde a media centésima, hasta aproximadamente 0,56 km por eje cerca del ecuador, frente a una climatología regional de decenas de kilómetros.

Es una decisión técnica acotada a la precisión **observada**, no una especificación garantizada por NASA. Se rechazan otro punto, diferencia superior al límite o diferencia arbitraria sin centésimas. La URL solicitada, coordenadas PostgreSQL, clave de caché y selección de respaldo siguen exactas; no se solicita otro punto ni se busca un respaldo cercano. Se muestra una advertencia de menor precisión en clima/calendario. Si el proveedor cambia de formato, una respuesta no compatible puede seguir rechazándose de manera controlada.

## 5. APIs externas, unidades y caché

Se conservaron las consultas exclusivamente desde backend; el navegador no hizo JSON directo a NASA/Open-Meteo en los recorridos vigilados. Las imágenes públicas de OSM se cargan directamente como recurso cartográfico, con atribución y sin JWT.

| Fuente | Verificación real | Resultado |
| --- | --- | --- |
| [NASA POWER climatology point](https://power.larc.nasa.gov/docs/services/api/temporal/climatology/) | Script `clima:verificar`, curl del punto de mapa y dos recorridos integrales | HTTP válido; `community=AG`, `format=JSON`, ocho parámetros y doce meses, periodo declarado 2001–2025. La consulta independiente fue 2026-11-08T05:32:15.755Z. |
| [Open-Meteo forecast](https://open-meteo.com/en/docs) | `pronostico:verificar` y dos recorridos integrales | Siete fechas consecutivas 2026-11-08 a 2026-11-14, `America/Guayaquil`, °C/mm. Consulta independiente 2026-11-08T05:32:17.154Z. |
| [Open-Meteo elevation](https://open-meteo.com/en/docs/elevation-api) | Guardado desde mapa y curl de (-0.93002,-78.620248) | Respuesta real `{"elevation":[2770.0]}`; fuente Copernicus DEM GLO-90, resolución 90 m. |
| [OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/) | Mapa real e inspección visual; curl de tesela `/12/1153/2058.png` | HTTP 200, cartografía y atribución visibles. El navegador registró cancelaciones/fallos aislados de solicitudes de teselas durante navegación; no se equiparan a errores JSON locales. Hay aviso/reintento y alternativa manual probados. |

Parámetros NASA realmente devueltos:

| Parámetro | Unidad verificada | Tratamiento |
| --- | --- | --- |
| T2M, T2M_MIN, T2M_MAX | `C` | °C; coherencia mínima/media/máxima y valores finitos. |
| PRECTOTCORR | `mm/day` | mm/día × días medios mensuales del periodo; no son acumulados observados de un año particular. |
| RH2M | `%` | Humedad relativa informativa, no humedad de raíces. |
| GWETTOP, GWETROOT | `1` | Índices 0–1; el indicador de raíces usa GWETROOT. No es porcentaje volumétrico. |
| ALLSKY_SFC_SW_DWN | `MJ/m^2/day` | Se conservan metadatos y valores sin inventar conversión. |

Para el periodo 2001–2025 se cuentan seis años bisiestos: febrero tiene 28,24 días medios. La respuesta real de Latacunga da en enero T2M_MIN 3,97 °C, media 11,86 °C, máxima 21,03 °C y PRECTOTCORR 4 mm/día → **124 mm/mes**; febrero da **140,92 mm/mes** tras conversión/redondeo. Los rellenos como -999, datos ausentes e incompatibles se conservan nulos con avisos, nunca como cero. Las pruebas cubren esos casos, no requieren Internet para NASA/pronóstico y distinguen fixtures de procedencia real archivada.

El pronóstico real independiente devolvió mínimas de 9,1 a 7,3 °C en esos siete días; no cruzó el umbral. La cuadrícula del modelo puede diferir del punto solicitado y no representa una estación del lote. Las alertas son preventivas basadas en mínima prevista ≤2 °C; no confirman una helada ni aplican la corrección altitudinal del riesgo histórico.

| Dato | Caché, vigencia y fallo comprobados |
| --- | --- |
| NASA | `clima_cache`, clave por coordenadas exactas/tipo, 30 días. Deduplicación de solicitudes simultáneas y límites/timeout. Ante fallo, puede reutilizar dato anterior válido de ese punto, identificado como desactualizado; respaldo archivado únicamente con coincidencia exacta. Cinco respaldos reales tienen procedencia y SHA-256 comprobados. Sin dato fiable devuelve error controlado. |
| Pronóstico | Misma tabla con claves de tipo distinto; hasta 30 minutos y cambio de día Ecuador. Validación de unidades, fechas y vigencia. No usa los 30 días de NASA ni presenta caché vencida como actual; sin dato vigente indica indisponibilidad/reintento. |
| Altitud | Caché acotada de éxitos y fallos breves, deduplicación y timeout. Si falla, NULL explícito, sin altitudes inventadas. |
| Calendario | Reutiliza la misma instancia/caché NASA; no pide un clima nuevo por cada escenario reutilizable ni escribe terrenos/cultivos mediante GET. Fuente, periodo, fecha y antigüedad se mantienen visibles. |

## 6. Auditoría del calendario

Se verificaron las **120 celdas** mediante una matriz esperada independiente del motor, usando respuesta NASA archivada y un escenario de prueba explícito de 3000 m sin riego. Resultado esperado y obtenido: **25 recomendadas, 7 posibles con cuidado y 88 no recomendadas**. No representa todas las parcelas ni es una validación agronómica. Los estados no determinados se comprueban en pruebas específicas con datos esenciales faltantes.

Se conservan los diez IDs/valores originales, incluidas la mezcla `vicia_avena` y la condición de riego de brócoli. Se comprobaron extremos inclusivos de altitud, altitud nula, lluvia suficiente/insuficiente/nula, riego verdadero/falso/desconocido, riesgos bajo/medio/alto y sensibilidad referencial, ventanas que cruzan el año, diciembre/enero/febrero, repetibilidad y escenarios de lluvia -30/0/+30 % y temperatura -2/0/+2 °C. Parámetros inválidos no se convierten en cero.

La precedencia existente, sin nuevas fórmulas, sigue siendo:

| Orden | Condición | Estado |
| --- | --- | --- |
| 1 | Fuera de ventana/altitud; helada alta en alguno de los tres meses para tolerancia ≤2; brócoli sin riego confirmado falso | No recomendado |
| 2 | Sin exclusión conocida, pero altitud, agua o riesgo imprescindible desconocidos; riego de brócoli desconocido | No determinado |
| 3 | Condiciones esenciales conocidas y cumplimiento parcial: lluvia insuficiente sin riego o riesgo medio de cultivo sensible | Posible con cuidado |
| 4 | Ventana y altitud compatibles, agua satisfecha y riesgos bajos en tres meses cuando tolerancia ≤2 | Recomendado |

La API genera diez × doce; la interfaz muestra cultivos compatibles o evaluables y enumera los excluidos por altitud. Las explicaciones provienen de los valores calculados, separan climatología NASA de umbrales del catálogo y advierten incertidumbre. No hay verde por datos faltantes esenciales ni equivalencia entre riesgo histórico y pronóstico. El área es contexto, no una fórmula de riego.

## 7. Seguridad comprobada

| Control | Evidencia ejecutada |
| --- | --- |
| Registro/credenciales | HTTP/SQL: datos inválidos, duplicados, bcrypt, límites de contraseña, contraseña incorrecta, hash ausente en respuestas y registro sin rol técnico. |
| JWT | Firma HS256, expiración de 15 minutos, emisor/audiencia/sub UUID; pruebas de token ausente, alterado, expirado, algoritmo incorrecto y usuario inexistente. Rol consultado en SQL, sin confiar en claims manipulados. |
| Perfil | Solo campos editables del autenticado; rechazo de cambios de ID, rol y prioridades fuera de rango. |
| Aislamiento horizontal | Agricultor A no lee ni escribe terrenos/siembras ajenos; clima, pronóstico y calendario también filtran propietario. 404 sin revelar existencia/propietario. |
| Técnico | Lecturas de recursos agrícolas/climáticos/calendario autorizadas y escrituras agrícolas rechazadas con 403. No se creó un técnico permanente de demostración. |
| Sesión y caché frontend | Pruebas de cierre/cambio de usuario, respuestas tardías y 401 anterior que no cierra una cuenta nueva. Claves privadas por usuario; escenarios y ubicación forman parte de la identidad de consultas pertinentes. |
| Validaciones | UUID, coordenadas, área SQL, booleanos, catálogo, fechas reales/orden, notas, prioridades, consultas, cuerpos estrictos y límite JSON 16 KB. No se aceptan usuario_id/altitud del cliente como autoridad. |
| CORS y límites | Origen local exacto, sin comodín, Authorization/Content-Type y métodos necesarios; preflight y rutas privadas probados. Límites reales de autenticación conservados. Backend en loopback; no se habilita una exposición pública. |
| SQL y errores | ORM/consultas parametrizadas para valores. Errores `{ error }` sin SQL, trazas, tokens o claves. Las nuevas escrituras mantienen filtro de propietario. |
| Archivos/secretos | Inspección de contenido y comparación interna con valores privados, sin imprimirlos; sin coincidencias detectadas. `.env`, pgpass, claves/certificados privados, dependencias y artefactos ignorados; `git ls-files backend/.env` vacío. No cambian versiones del lockfile. |

Esto es una auditoría local de código y pruebas, no una prueba de penetración completa. Persisten límites conocidos: sessionStorage requiere prevención de XSS; un JWT emitido sigue válido hasta expirar; no hay revocación, refresh, recuperación de contraseña ni verificación de correo. Antes de publicar debe revisarse HTTPS, CSP, proxy, orígenes y límites compartidos entre procesos. No se halló una explotación XSS en esta revisión ni se afirma inmunidad.

## 8. UX/UI, consola y rendimiento

Se inspeccionaron capturas de portada, registro/acceso, espacio personal, perfil, listado vacío/con terrenos, creación, detalle/historial, clima, pronóstico, calendario y explicaciones en ambos tamaños. Se revisaron textos españoles, verde/tierra, etiquetas de campos, foco, formularios, vacíos, carga, errores/reintentos, confirmación de borrados, atribuciones y avisos científicos.

Las pruebas usan teclado para prioridades y celdas/diálogos, comprueban apertura/cierre con Enter/Escape y explicaciones del backend. Se comprueba ausencia de desbordamiento global en las capturas principales. Tablas/matriz tienen desplazamiento interno deliberado, necesario para doce meses en celular; no se afirma que las doce columnas quepan simultáneamente. Leyendas, símbolos y etiquetas acompañan los colores. Recharts conserva tabla de datos accesible y Leaflet dispone de coordenadas manuales.

Se calcularon contrastes de la paleta base: pino/crema 9,32:1; oliva/crema 5,83:1; arcilla/crema 5,22:1; blanco/pino 10,18:1; blanco/arcilla 5,70:1; oliva/arena 5,01:1. Esto comprueba esas combinaciones, **no certifica WCAG de todos los estados, mapas o gráficos**, ni sustituye una revisión con lectores de pantalla.

En los dos recorridos externos se registraron **cero errores de página/consola de la aplicación**, **cero respuestas HTTP locales ≥400** y **cero solicitudes JSON directas a proveedores desde el navegador**. Se conservaron avisos de teselas OSM canceladas/fallidas al navegar, separados de los errores locales. Las capturas muestran mapas cargados y la tesela independiente respondió 200. La suite anterior comprueba también la alternativa cuando se bloquean las teselas.

Build de producción verificado: JS principal **456,28 kB / 136,53 kB gzip**; mapa diferido **155,45 / 45,95 kB**; gráficas diferidas **390,11 / 111,25 kB**. CSS principal 25,29 kB y Leaflet 15,09 kB. Se mantienen las cargas diferidas del mapa y gráficas, sin añadir librerías. No hubo recursos locales ausentes en el recorrido vigilado. No se ejecutó Lighthouse ni un estudio de rendimiento con red móvil/Android físico; los tamaños son artefactos de compilación, no una garantía de tiempos para agricultores.

## 9. Resultados de validación

La ejecución final de `npm.cmd run check` volvió a ejecutar los pasos completos después de las regresiones de borde/concurrencia y terminó con código **0**:

| Comprobación | Resultado real |
| --- | --- |
| `npm.cmd run lint` | Aprobado, cero advertencias permitidas. |
| `npm.cmd run typecheck` | Aprobado en herramientas/backend/frontend; TypeScript estricto. |
| `npm.cmd run test` | **210 backend + 63 frontend** aprobadas. |
| `npm.cmd run test:db` | **113 PostgreSQL** aprobadas; siete archivos, incluidas cinco regresiones de concurrencia. |
| `npm.cmd run build` | Backend y frontend compilados; Prisma 7.10.1 generado. También ejecutado dentro de `check`. |
| `npm.cmd run test:e2e` | **16 E2E anteriores + 2 integrales**, todos aprobados en escritorio/celular. Servidores independientes entre suites para conservar cuotas de autenticación. |
| `npm.cmd run check` | **404 pruebas**, código 0; no hay pruebas omitidas o fallidas declaradas aprobadas. |
| PowerShell: `tests/scripts/configurarBaseLocal.test.ps1` | **14 comprobaciones** aprobadas sin conexiones ni credenciales reales. |
| E2E integral externo separado | **2 aprobadas**, NASA, elevación, pronóstico y calendario integrados con PostgreSQL aislado. |
| `npm.cmd audit` / `npm.cmd audit --omit=dev` | Ambas consultas terminaron con código 0 y **0 vulnerabilidades conocidas**. No se ejecutó `audit fix` ni se alteraron dependencias. |
| Estado Prisma de ambas bases / diferencia de esquema | Una migración aplicada, sin pendientes; `migrate diff --exit-code`: **No difference detected**, código 0. |
| Git | Diff sin errores de whitespace; secretos/artefactos revisados antes de preparar el commit. |

Los fallos iniciales de regresión no se ocultaron: hubo cuatro casos de escritura intercalada fallidos antes de corregir, errores Leaflet en ambos recorridos y rechazo NASA del punto real. Se corrigieron y se ejecutaron de nuevo las comprobaciones afectadas y la cadena completa. El aviso de actualización de Prisma a una candidata de versión mayor se dejó como aviso: se conserva 7.10.1.

## 10. Base de datos e integridad

PostgreSQL **18.4**, Prisma/Client/adapter **7.10.1**. Conexión y propietario **rotaandes_app**, UTF8; sin superusuario, CREATEDB ni CREATEROLE. Las bases existentes siguen siendo `rotaandes_dev` y `rotaandes_pruebas_36cbc85c`.

Se verificaron seis tablas de dominio (`usuarios`, `terrenos`, `cultivos`, `siembras`, `plantillas_rotacion`, `clima_cache`) más `_prisma_migrations`; tipos/nulabilidad, claves, relaciones, cuatro CHECK originales y restricciones mediante la suite SQL. Se mantiene la migración `20261107000100_esquema_inicial`, aplicada en ambas bases, sin nuevas migraciones ni diferencias. Se conserva `TimeZone=UTC` por conexión Prisma para TIMESTAMPTZ; DATE sigue siendo fecha civil.

Los conteos posteriores a las pruebas, leídos en transacción READ ONLY, fueron:

| Base | Usuarios | Terrenos | Cultivos | Siembras | Plantillas | Caché |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Desarrollo | 0 | 0 | 10 | 0 | 0 | 0 |
| Pruebas aislada | 0 | 0 | 0 | 0 | 0 | 0 |

No quedaron cuentas, terrenos, siembras ni cachés temporales. Se conservaron los diez cultivos originales de desarrollo. La suite SQL revierte sus transacciones; los E2E limpian correos/IDs propios y restauran caché anterior. No se borraron bases, cambiaron contraseñas o eliminaron datos preexistentes ajenos.

## 11. Evidencias de escritorio y celular

Capturas **locales, ignoradas por Git**, no entregadas como datos de producción ni disponibles automáticamente en un clon:

- Controladas: `test-results/integral/primeraEntrega-primera-ent-892a0-ersistente-de-un-agricultor-escritorio/` y la carpeta con sufijo `-celular/`.
- Proveedores reales: `.tmp/evidencias-reales/primeraEntrega-primera-ent-892a0-ersistente-de-un-agricultor-escritorio/` y la carpeta con sufijo `-celular/`.
- Las suites E2E anteriores conservan sus propias capturas en `test-results/`.

Cada recorrido integral genera `01-portada.png`, `02-registro.png`, `03-acceso.png`, `04-espacio-personal.png`, `05-perfil.png`, `06-terrenos-vacios.png`, `07-crear-terreno.png`, `08-detalle-e-historial.png`, `09-clima.png`, `10-pronostico.png`, `11-calendario.png`, `12-mis-terrenos.png`, `13-persistencia-tras-login.png`, `explicacion-papa.png`, `explicacion-haba.png` y `evidencia.json` sanitizada. El estado vacío puede capturarse durante la carga diferida del mapa; el resto del flujo verifica el mapa cargado.

Accesos locales destacados:

- Terreno desde mapa, escritorio; consulta real (`../.tmp/evidencias-reales/primeraEntrega-primera-ent-892a0-ersistente-de-un-agricultor-escritorio/07-crear-terreno.png`, artefacto local no versionado).
- Climatología real, escritorio (`../.tmp/evidencias-reales/primeraEntrega-primera-ent-892a0-ersistente-de-un-agricultor-escritorio/09-clima.png`, artefacto local no versionado).
- Pronóstico real, celular emulado (`../.tmp/evidencias-reales/primeraEntrega-primera-ent-892a0-ersistente-de-un-agricultor-celular/10-pronostico.png`, artefacto local no versionado).
- Calendario calculado con NASA real, celular emulado (`../.tmp/evidencias-reales/primeraEntrega-primera-ent-892a0-ersistente-de-un-agricultor-celular/11-calendario.png`, artefacto local no versionado).
- Motivo de haba con datos reales, celular emulado (`../.tmp/evidencias-reales/primeraEntrega-primera-ent-892a0-ersistente-de-un-agricultor-celular/explicacion-haba.png`, artefacto local no versionado).

Las capturas externas contienen meteorología real consultada, junto a una cuenta/terreno/historial sintéticos y temporales. Las controladas contienen clima/pronóstico de prueba. Ninguna constituye validación de una explotación agrícola real. Las trazas se deshabilitan para no registrar contraseñas ni Bearer; no se publican credenciales.

## 12. Archivos registrados y cierre de Git

Se modifican o crean **17 archivos** de esta fase:

| Archivos | Finalidad |
| --- | --- |
| `backend/src/routes/terrenos.ts`, `backend/src/routes/siembras.ts` | Campos presentes y protección de valores dependientes ante escrituras intercaladas. |
| `backend/src/services/nasaPower.ts`, `backend/tests/nasaPower.test.ts` | Compatibilidad de precisión observada y regresiones positivas/negativas/de borde. |
| `backend/tests/base-datos/concurrencia.integration.test.ts` | Cinco casos de integridad de actualizaciones parciales. |
| `backend/tests/auditoriaCalendario.test.ts` (conservada hoy como [auditoriaCalendarioV1.test.ts](../backend/tests/auditoriaCalendarioV1.test.ts)) | Matriz esperada independiente de las 120 celdas. |
| `frontend/src/components/MapaTerrenos.tsx`, `frontend/src/pages/Inicio.tsx` | Ciclo de vida del mapa y texto de portada. |
| `tests/navegador/primeraEntrega.spec.ts` | Recorrido integral, inspección SQL, consola/red y capturas. |
| `playwright.config.ts`, `playwright.integral.config.ts`, `package.json`, `tsconfig.herramientas.json` | Separación de suites y script integral, sin ampliar cuotas ni instalar dependencias. |
| `README.md`, `docs/DECISIONES.md`, `docs/DEMO_PRIMERA_ENTREGA.md`, `docs/INFORME_PRIMERA_ENTREGA.md` | Cierre, decisiones, guía de presentación e informe. |

El commit de cierre usa el mensaje `Auditar y validar primera entrega de RotaAndes`; su hash se obtiene con `git log -1 --format=%H` y se comunica en la entrega final. Se revisa el contenido preparado, `git diff --cached --check` y la ausencia de archivos privados/generados antes de crearlo. No se modifica `main`, no se hace push, merge o despliegue.

## 13. Riesgos pendientes y preparación

| Severidad | Límite pendiente | Implicación |
| --- | --- | --- |
| Medio | Validación agronómica local pendiente, datos climáticos regionales y altitud estimada | Presentar recomendaciones como apoyo referencial; no como garantía ni medición del lote. |
| Medio | Disponibilidad externa y respaldo limitado al mismo punto | Preparar conexión y explicar errores/antigüedad; no inventar datos ni afirmar disponibilidad universal sin NASA. |
| Medio | Límites de sesión/seguridad y configuración exclusivamente local | Revisión de despliegue, HTTPS, CSP, proxy y operación antes de exposición pública; no declarar producción aprobada. |
| Medio | Sin versionado general de todos los campos | Dos ediciones explícitas del mismo campo pueden sobrescribirse por orden; recargar antes de editar y respetar mensajes de conflicto. |
| Bajo | Revisión móvil con emulación, sin agricultor/Android físico/lector de pantalla | Validar con usuarios y equipos reales antes de afirmar aceptación móvil/accesibilidad completa. |
| Bajo | Dashboard agregado/onboarding independiente y páginas complementarias incompletos | La demo accede al mapa desde Mis terrenos y a alertas desde el detalle. No presentarlos como pantallas terminadas. |

**Primera entrega lista para demostración local del núcleo, con estas limitaciones explícitas.** La guía de presentación está en [DEMO_PRIMERA_ENTREGA.md](DEMO_PRIMERA_ENTREGA.md). El producto completo y una publicación pública funcional permanecen pendientes. La auditoría termina en esta fase y no inicia la segunda entrega.
