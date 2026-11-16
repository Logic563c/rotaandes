# Estado actual de RotaAndes y auditoría documental

Consultas de producción realizadas el **15 de noviembre de 2026**, entre las 22:03 y las 22:15, **America/Guayaquil (UTC−5)**, con comprobaciones documentales locales posteriores. Las consultas equivalen al 16-11-2026 entre 03:03 y 03:15 UTC. Este documento distingue la aplicación vigente de los informes de fases anteriores. No cambia fechas, versiones ni resultados históricos.

## 1. Versión real de los servicios

| Componente | Estado observado y evidencia |
| --- | --- |
| GitHub | Repositorio **público** [Logic563c/rotaandes](https://github.com/Logic563c/rotaandes); rama predeterminada `release/publicacion`, cuyo HEAD al iniciar la auditoría es [`4a2055e71d159fbcf18f7eb98416bf9b359dacdd`](https://github.com/Logic563c/rotaandes/commit/4a2055e71d159fbcf18f7eb98416bf9b359dacdd). Consultado mediante el conector GitHub, sin alterar referencias |
| Railway backend | Despliegue `204569f5-bf40-4223-9e5e-1cfd3a119721`, **SUCCESS**, creado el **15-11-2026 a las 21:47:30 de Ecuador** (`2026-11-16T02:47:30.285Z`). Mensaje del CLI: `4a2055e calendario_ciclo_v4: riego no ilimitado`. Comparación por SSH: **121 archivos coinciden** con el commit completo indicado, normalizando únicamente CRLF/LF; sin diferencias. El motor compilado declara `calendario_ciclo_v4` |
| Vercel frontend | Destino de producción `dpl_FZy91aaQF43ieGBEbiV5SDSVrW8m`, **READY**; metadatos `revisionAprobada` y `gitCommitSha`: `bf3ff2bd5f89ceca6c5df8bf92c86ccc40584464`. El dominio público sirve el mismo bundle comprobado en el cierre de esa publicación |
| PostgreSQL | `rotaandes_prod`, servidor **18.6**. Consulta `BEGIN READ ONLY … ROLLBACK`, `transaction_read_only=on`: **29 cultivos, ocho plantillas, tres migraciones terminadas sin reversión y cero relaciones huérfanas**. No se consultaron contenidos personales ni hashes de contraseñas |

El último **código funcional** estable es `4a2055e`. No sería correcto afirmar que Vercel fue desplegado con ese commit: conserva el frontend compatible de `bf3ff2b`. La incorporación posterior de un commit exclusivamente documental a GitHub no cambia la versión funcional ni requiere desplegar. El hash del envío documental se comprueba con el historial de la rama; no se anticipa en este corte.

Configuración comprobada: Vercel sin repositorio Git conectado, raíz del monorepo; [vercel.json](../vercel.json) declara `deploymentEnabled: false`. Railway backend sin `source.repo`; configuración en [.railway/railway.ts](../.railway/railway.ts). Se conservaron los mismos servicios y despliegues durante la auditoría. No se consultó facturación ni se certifican saldo, plan o permanencia del alojamiento.

### Disponibilidad HTTP observada

- [Aplicación pública](https://rotaandes.vercel.app/): `/`, `/login`, `/registro`, `/glosario`, `/fuentes` y `/terrenos` devolvieron **200** como rutas SPA. El 200 de `/terrenos` sirve la aplicación; no concede acceso a recursos privados.
- [Salud del backend](https://backend-production-954a9.up.railway.app/api/health): **200**, `{"ok":true}`. Esta ruta por sí sola no prueba PostgreSQL; la consulta SQL se realizó por separado.
- [Catálogo público](https://backend-production-954a9.up.railway.app/api/cultivos): **200**, 29 identificadores iguales a los de PostgreSQL y al catálogo del código.
- `GET /api/terrenos` sin token: **401**. Salud con `Origin: https://ejemplo.com`: **403**.
- Bundle público `/assets/index-09_5osfj.js`: **200**, SHA-256 `9c22b332d4710327dca6b7e529bec8b26e40822084486a2504398477ac4a78bd`.

No se registraron usuarios, crearon terrenos, modificaron siembras ni llamaron rutas agrícolas que pudieran renovar la caché SQL. No se ejecutó un nuevo recorrido autenticado completo en producción. La comprobación nueva de funcionamiento se limita a estos GET, la lectura del artefacto y PostgreSQL; las pruebas integrales anteriores se identifican por su revisión.

## 2. Funciones vigentes y límites

Autenticación y perfil; terrenos y siembras; altitud estimada; mapa y delimitación opcional; climatología NASA POWER y tendencias 2005–2024; pronóstico Open-Meteo de siete días y alertas; calendario y resumen mensual; tres espacios de comparación de rotaciones; escenarios; imágenes MODIS/SMAP de NASA GIBS; panel técnico de solo lectura; PDF; glosario y fuentes públicas; fotografías estáticas y ayudas de lectura en las gráficas.

El agricultor accede solo a sus recursos; el técnico lee todos los terrenos, sin editarlos. Cuando no hay dos alternativas evaluables, el comparador conserva un espacio no determinado en vez de inventar una estrategia. Los índices sin fuente no se transforman en un puntaje favorable.

**NASA POWER proporciona información climática, no recomendaciones agrícolas directas.** La recomendación resulta de reglas de RotaAndes y fuentes agronómicas identificadas (catálogo referencial, INIAP, FAO/EcoCrop, Córdova y fuentes por especie). No implica aval NASA ni validación local MAG/INIAP. El clima regional y sus ajustes por altitud no miden el microclima, las mínimas extremas de cada noche ni las condiciones del interior del polígono.

Persisten incertidumbres sobre variedades, suelo, plagas, disponibilidad de agua y algunos parámetros por cultivo. Las ventanas de siembra no están validadas localmente. Los puntajes de rotación son heurísticos, no rendimientos, probabilidades ni dinero. Los escenarios son hipotéticos, no pronósticos. La superficie delimitada es aproximada, no catastral. El PDF siempre usa el escenario base, agrupa motivos y tiene límites de 80 páginas y 4 MiB; no tiene una extensión fija.

**Alcance satelital:** GIBS ofrece imágenes regionales de fechas/composiciones de 2023–2024, sin agregación mensual ni extracción numérica por parcela. `GET /api/capas/:tipo?mes=` sigue devolviendo **503** explícito para una consulta válida: el GeoJSON analítico no está implementado. Las imágenes se sirven por `/api/capas-visuales/:tipo` y `/imagen` mediante el backend. No confundir un píxel de visualización con la resolución nativa de MODIS (250 m) o SMAP (9 km).

## 3. Catálogo vigente: 29 cultivos y doce meses

Tabla contrastada con [catalogoCultivos.ts](../backend/src/data/catalogoCultivos.ts), [perfilesAgronomicos.ts](../backend/src/data/perfilesAgronomicos.ts), PostgreSQL y `GET /api/cultivos`. Los identificadores se conservan sin renombrar. `vicia_avena` es una entrada combinada del catálogo; no se describe el conjunto como «29 especies».

| Identificador | Nombre | Nombre científico de referencia | Categoría | Meses evaluados del ciclo |
| --- | --- | --- | --- | ---: |
| `acelga` | Acelga | Beta vulgaris var. cicla | Hortalizas de hoja | 5 |
| `apio` | Apio | Apium graveolens var. dulce | Hortalizas de hoja | 7 |
| `avena` | Avena forrajera | Avena sativa | Forrajes y abonos verdes | 5 |
| `berro` | Berro | Nasturtium officinale | Hortalizas de hoja | 3 |
| `brocoli` | Brócoli | Brassica oleracea var. italica | Hortalizas de flor | 4 |
| `cebada` | Cebada | Hordeum vulgare | Cereales y granos andinos | 5 |
| `cebolla_blanca` | Cebolla blanca | Allium fistulosum | Cebollas | 6 |
| `cebolla_colorada` | Cebolla colorada | Allium cepa (cebolla de bulbo) | Cebollas | 7 |
| `chocho` | Chocho | Lupinus mutabilis | Leguminosas | 7 |
| `cilantro` | Cilantro | Coriandrum sativum | Hortalizas de hoja | 5 |
| `col` | Col | Brassica oleracea var. capitata | Hortalizas de hoja | 5 |
| `col_china` | Col china | Brassica rapa subsp. pekinensis / chinensis | Hortalizas de hoja | 3 |
| `coliflor` | Coliflor | Brassica oleracea var. botrytis | Hortalizas de flor | 4 |
| `frejol` | Fréjol | Phaseolus vulgaris | Leguminosas | 4 |
| `haba` | Haba | Vicia faba | Leguminosas | 6 |
| `lechuga` | Lechuga | Lactuca sativa | Hortalizas de hoja | 5 |
| `maiz` | Maíz suave | Zea mays | Cereales y granos andinos | 8 |
| `melloco` | Melloco | Ullucus tuberosus | Tubérculos andinos | 9 |
| `oca` | Oca | Oxalis tuberosa | Tubérculos andinos | 7 |
| `papa` | Papa | Solanum tuberosum | Tubérculos andinos | 6 |
| `papa_nabo` | Papa nabo | Brassica rapa subsp. rapa | Hortalizas de raíz | 3 |
| `perejil` | Perejil | Petroselinum crispum | Hortalizas de hoja | 12 |
| `quinua` | Quinua | Chenopodium quinoa | Cereales y granos andinos | 6 |
| `rabano` | Rábano | Raphanus sativus var. radicula | Hortalizas de raíz | 2 |
| `remolacha` | Remolacha | Beta vulgaris (remolacha de mesa) | Hortalizas de raíz | 3 |
| `vicia_avena` | Vicia + avena (abono verde) | Vicia sativa + Avena sativa | Forrajes y abonos verdes | 4 |
| `zambo` | Zambo | Cucurbita ficifolia | Cucurbitáceas (fruto) | 4 |
| `zanahoria` | Zanahoria | Daucus carota subsp. sativus | Hortalizas de raíz | 5 |
| `zapallo` | Zapallo | Cucurbita maxima | Cucurbitáceas (fruto) | 4 |

Los meses de inicio son **enero, febrero, marzo, abril, mayo, junio, julio, agosto, septiembre, octubre, noviembre, diciembre**: cada cultivo produce doce casillas, **29 × 12 = 348**. Se evalúa todo el ciclo, incluyendo el cruce de año. Para los diez originales se conserva el ciclo del catálogo; para la ampliación se usa el máximo documentado, convertido a meses. El filtro de ciclo corto requiere máximo de referencia ≤120 días. Las fuentes no identifican necesariamente una variedad local; las denominaciones de col china y otros casos conservan sus notas y pendientes en los perfiles.

### Los cuatro estados

| Estado visible | Clave JSON conservada | Lectura |
| --- | --- | --- |
| Recomendado (verde) | `recomendado` | Los criterios evaluados favorecen la siembra; confirmar variedad y manejo |
| Posible con precaución (amarillo) | `posible_con_cuidado` | Existe un riesgo manejable identificado |
| No recomendado (rojo) | `no_recomendado` | Existe una exclusión independiente según las reglas y sus fuentes |
| No determinado (gris) | `no_determinado` | Falta un dato esencial o hay conflicto de fuentes, sin exclusión independiente |

Precedencia del motor: **exclusión → rojo; después incertidumbre → gris; después riesgo manejable → amarillo; finalmente verde**. Se mantienen `resumen`, `motivo` y «Qué puedes hacer». La época y la altitud referenciales se informan sin imponer por sí solas un color. La falta de elevación de celda no se convierte en una precaución permanente: impide determinar la temperatura. El ajuste de mínima se hace una sola vez; el indicador regional de la vista Clima no se suma al del calendario.

El resumen cuenta las casillas del mes para los 29 cultivos, aunque haya filtros inferiores. La matriz y el detalle usan la misma respuesta validada; la actualización manual y al recuperar foco renuevan consultas antiguas. Resultados uniformes durante todo el año pueden ser correctos y se explican; no se distribuyen colores artificialmente.

### Regla de riego v4

Tener `tiene_riego=true` no demuestra caudal ni disponibilidad suficientes. Se compara la lluvia NASA del ciclo con la necesidad con fuente:

1. Si hay necesidad FAO por ciclo y la lluvia es inferior al mínimo, el criterio de agua da **precaución: «depende del riego en el ciclo»**. Si alcanza al menos el mínimo, conserva el criterio ordinario del riego declarado, explicando la diferencia hasta el máximo cuando corresponde.
2. Sin necesidad por ciclo, si hay mínimo mensual del catálogo, se comprueban todos los meses del ciclo. Alguno por debajo → **precaución: «depende del riego en meses secos»**.
3. Sin parámetro con fuente o sin lluvia válida, se conserva el criterio ordinario del riego declarado y se declara la imposibilidad de compararlo. No se inventa una dependencia ni se afirma agua medida suficiente.
4. **Berro:** agua permanente y limpia o suelo saturado sigue sin confirmarse con el booleano de riego; el criterio queda no determinado, con prioridad de cualquier exclusión independiente.

RotaAndes no calcula caudales, volúmenes ni turnos. Sin riego, el déficit bajo el mínimo FAO excluye; entre mínimo y máximo genera precaución; sin necesidad por ciclo se usa el mínimo mensual disponible, y sin parámetro el agua queda no determinada. La época fuera de ventana se muestra también en el resumen recomendado y en las acciones sin cambiar por sí sola el estado. Las reglas completas están en [PROYECTO.md §7.2](../PROYECTO.md) y [calendario.ts](../backend/src/services/calendario.ts).

## 4. Migraciones realmente aplicadas

Consulta nueva en transacción de solo lectura: las tres tienen `finished_at` y `rolled_back_at=null`.

| Migración | SHA-256 registrado en producción |
| --- | --- |
| `20261107000100_esquema_inicial` | `2aec5b49e4595ca2ca1ced0afb3f1ae009f5983d91d15a3c34c09e1bf1c6edfb` |
| `20261112000100_delimitacion_terreno` | `78cffdab28defda5d97b33e9b87286e584fddc5a02f570ddfa6419ebde8da467` |
| `20261115000100_catalogo_ampliado` | `47690e62e5e0511a017814b10a5d355c1b093a5cfacf6c36258b36bde3eccfae` |

La inicial crea el esquema; la segunda añade `terrenos.poligono`; la tercera permite parámetros nulos del catálogo ampliado. El motor v4 no añade migraciones. Los checksums de producción reflejan los bytes aplicados (incluidos finales de línea); los hashes LF de Git pueden diferir. No editar archivos aplicados ni alterar `_prisma_migrations` para «corregir» esa diferencia. Los informes de publicación conservan su explicación histórica.

## 5. Pruebas y evidencias: sin mezclar revisiones

| Evidencia | Revisión | Resultado |
| --- | --- | --- |
| Compilación de ambos paquetes, `npm.cmd run build` | Código funcional `4a2055e` | **Código 0**; aviso conocido de bundle >500 kB, sin fallo |
| `npm.cmd run lint` | Código funcional `4a2055e` | **Código 0**, sin advertencias de ESLint |
| `npm.cmd run typecheck` | Código funcional `4a2055e` | **Código 0** en herramientas, backend y frontend |
| Unitarias backend, `npm.cmd run test --workspace backend` | Código funcional `4a2055e` | **479 aprobadas**, 28 archivos |
| Unitarias frontend, `npm.cmd test` (workspace frontend) | Código funcional `4a2055e` | **225 aprobadas**, 26 archivos |
| Último `npm.cmd run check` completo respaldado por registros conservados | `bf3ff2b`, anterior a v4 | **908 = 470 backend + 225 frontend + 163 PostgreSQL + 50 navegador**, código 0 en el registro de cierre |

**Total nuevo comprobado: 704 unitarias.** No se ejecutaron `test:db`, E2E ni `check` durante esta auditoría: aplican migraciones o escriben datos en PostgreSQL local aislado y la tarea prohíbe modificar PostgreSQL. No se extrapola un supuesto total completo de v4 a partir de los casos nuevos. Tampoco hay una batería de GitHub Actions versionada que acredite un resultado distinto.

El primer `npm.cmd test` dentro del entorno restringido terminó con código 1: 478 backend aprobadas y un caso de aprovisionamiento técnico falló al consultar información de Windows mediante `node:os`; el frontend aprobó sus 225 casos. Al repetir **solo el backend** fuera de esa restricción, sin modificar código, aprobaron las 479. Se conserva el intento fallido; no se presenta como una aprobación completa.

Los casos de [calendarioRiego.test.ts](../backend/tests/calendarioRiego.test.ts) usan una respuesta NASA real archivada y terrenos ficticios, incluida la regresión a 2840 m con riego, los doce meses, la lluvia estacional y la falta de parámetros. No constituyen una consulta nueva a NASA ni una validación en campo. Los registros anteriores de producción y navegador de `bf3ff2b` no son un recorrido nuevo de v4.

### Procedencia reproducible

Los artefactos locales están en `.tmp/auditoria-documental/`, **ignorados y ausentes del repositorio público**. Estas huellas permiten contrastar una copia privada conservada; no son enlaces de descarga ni una certificación independiente del proveedor.

| Archivo local | Alcance | SHA-256 |
| --- | --- | --- |
| `backend-unitarias.log` | Unitarias backend v4 | `2e3a19957006c5d4ba00cffeee5ada94fe4e02048185007821ad26072306d54d` |
| `unitarias.log` | Primer intento restringido y unitarias frontend v4 | `025f822ae1b04b332c0a7da5d4e0dfc6b92b52aa0327cf7df75cdf461c7510ee` |
| `build.log` | Compilación de ambos paquetes | `02dd802e717234c0ca0eed028ed442acb241c94024a0d2c0ae2003f2271eb3d1` |
| `lint.log` | Lint | `b81e428529ea724727a9bb171e270dbcbf83c62287de0514f0103bbf3c1f6405` |
| `tipos.log` | TypeScript en herramientas y ambos paquetes | `30b7159021eca7cc11cddad4737737295be0e1e22bf7c0fda1acb1e18c19510f` |
| `postgres.json` | PostgreSQL, transacción READ ONLY | `d3bcaf71ff906619a9c08ea4e48e138cb139a9d020c99fb97cc2640ca0b4b5e1` |
| `artefacto.json` | Comparación de archivos Railway | `24a2165bc985c6df01f4937e03dd48509f45868fea77030c9cbc2a9d1216429f` |
| `vercel.json` | Metadatos del destino de producción Vercel | `00221c7505bae8a30afece4fb56ebdb38228e5814f1ae8d1cf1d80f37df0e90b` |
| `railway.json` | Estado Railway | `52ccd51742344060e17bf5385439b067adfe8ea53385f8f1db06d021b345de5b` |
| `http.json` | GET públicos y huella del bundle | `b204d917b5fd221cf22a6ac300c5bd65637bd09eb484dfed9b95cd77081df842` |
| `seguridad.json` | Escaneo de historial | `62a79e8f8e0186f7ae706093425c8e5e57e9459d39c8fd0dbfba9c987535ce84` |

El registro completo anterior es `.tmp/resumen-calendario/check.log`, SHA-256 `52e36e294b605d22339158f250b53958dbf0bcb5b975d89a2f789b75b1b63f61`; su resumen y asociación con `bf3ff2b` se conservan en `publicacion/pruebas.json` y `publicacion/cierre.json` de esa carpeta. Los informes antiguos con 720, 739, 798, 810, 824 o 867 pruebas mantienen sus cifras, porque describen otras fases.

## 6. Repositorio público y secretos

Se revisaron **45 commits y 806 blobs** alcanzables desde `4a2055e`, con **380 archivos** en ese árbol. No se detectaron archivos privados `.env`, respaldos, claves privadas, tokens con los patrones examinados ni coincidencias con los secretos locales conocidos. Los ejemplos de entorno contienen configuración pública/ficticia; los archivos NASA archivados son datos del proveedor y fixtures identificados, no respaldos de usuarios.

Es un escaneo acotado de ese historial, **no una garantía de que no exista cualquier secreto desconocido**. No abarca referencias remotas ajenas a la rama auditada, releases o adjuntos externos, ni certifica seguridad completa. No se publican credenciales, contenido de respaldos, datos personales ni los JSON privados de consulta cloud. No se generó un nuevo respaldo ni se leyó el contenido de copias privadas.

Los archivos modificados de esta entrega deben ser exclusivamente Markdown; antes del envío se revisan el diff, la lista de archivos y la ausencia de secretos en las adiciones. El [procedimiento de respaldo](PROCEDIMIENTO_RESPALDO_PRODUCCION.md) explica que el restaurador muestra migraciones pero no exige automáticamente la lista actual, y que omitir la restauración no acredita recuperabilidad aunque aparezca un mensaje verde.

## 7. Auditoría de la documentación e instrucciones

Se inventariaron los **36 Markdown originales de `docs/`**, más `README.md`, `PROYECTO.md`, `AGENTS.md` y [CREDITOS.md](../frontend/public/imagenes/CREDITOS.md): **40 archivos originales**. Este documento añade uno: **37 en docs, 41 en todo el repositorio**. Se revisaron referencias, enlaces internos, rutas de aplicación/API, nombres de scripts y comandos contra los archivos y los tres `package.json`. Las instrucciones vigentes de instalación se contrastaron con los scripts; no se repitió `npm ci`, configuración de bases, semillas o restauraciones por ser una tarea documental.

La comprobación final no encontró enlaces internos rotos y contrastó **146 menciones a scripts npm**, todas con un script existente en el paquete indicado o en su contexto. Se conservaron dos referencias que no son archivos de un clon: `frontend/.env`, explícitamente opcional y generado localmente, y el nombre histórico de `auditoriaCalendario.test.ts`, acompañado del enlace a su nombre actual `auditoriaCalendarioV1.test.ts`.

El diff comprende **39 Markdown existentes y este documento nuevo: 40 archivos**. Los créditos fotográficos se revisaron y no necesitaron cambios. Se comparó el contenido completo de los **30 registros históricos** con sus originales: solo se añadieron avisos de fase, se aclararon rutas a artefactos no versionados y se corrigieron referencias de archivos, sin cambiar sus fechas, cifras, pruebas ni resultados. La revisión de las adiciones no detectó los secretos conocidos ni los patrones examinados; código, dependencias, configuración y migraciones no tienen diferencias.

| Antes | Después |
| --- | --- |
| README mezclaba repositorio privado, diez cultivos, 120 motivos y varios despliegues como actuales | Portada documental vigente: repositorio público, 29 cultivos, 348 casillas, motor v4 y revisiones separadas por servicio |
| Manual técnico enumeraba dos migraciones, 120 celdas y raíz frontend para Vercel | Tres migraciones, calendario por ciclo, configuración real del monorepo y límites de pruebas |
| Usuario y demo describían fondo animado y botón de pausa | Fotografías estáticas; cuatro estados, búsqueda/filtros, regla de riego y PDF base |
| Respaldo esperaba solo la migración inicial | Lista de las tres migraciones, catálogo actual y límites reales del verificador existente |
| Defensa hablaba de «cerca de 800» y delimitación pendiente de publicar | Resultados con revisión y alcance; delimitación aplicada, sin suponer nuevas pruebas de escritura |
| Informes históricos podían confundirse con estado actual | Aviso de fase y referencia a este documento; fechas, versiones y resultados originales conservados |
| Capturas ignoradas se ofrecían como enlaces relativos descargables | Se conservan las rutas como referencias a artefactos locales no versionados |
| Plan original parecía describir despliegues, mocks y cuentas demo actuales | Se identifica planificación histórica y se documenta el comportamiento ya implementado, sin cambiar modelo ni API |

Manuales vigentes: [usuario](GUIA_CLIENTE.md), [técnico](MANUAL_TECNICO.md), [defensa](GUIA_DEFENSA_JURADO.md), [recorrido](RECORRIDO_DEMOSTRACION.md) y [respaldo](PROCEDIMIENTO_RESPALDO_PRODUCCION.md). [DECISIONES.md](DECISIONES.md) conserva el registro cronológico: una decisión posterior puede sustituir una anterior.

### Índice completo de los 30 registros históricos

Los comandos y destinos de reversión de estos informes pertenecen a su fase; no ejecutarlos automáticamente contra el esquema o los datos actuales. Los ZIP, capturas y logs citados no se regeneran ni se incorporan al repositorio con esta auditoría.

| Documento | Lectura correcta |
| --- | --- |
| [DEMO_PRIMERA_ENTREGA.md](DEMO_PRIMERA_ENTREGA.md) | Registro de su fase; no sustituye el estado vigente |
| [DIAGNOSTICO_NASA_Y_RECUPERACION.md](DIAGNOSTICO_NASA_Y_RECUPERACION.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_ACTUALIZACION_ESCENARIOS_CAPAS.md](INFORME_ACTUALIZACION_ESCENARIOS_CAPAS.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_AMBIENTACION_GLOBAL.md](INFORME_AMBIENTACION_GLOBAL.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_AUDITORIA_CLAUDE_FINAL.md](INFORME_AUDITORIA_CLAUDE_FINAL.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_AUTENTICACION.md](INFORME_AUTENTICACION.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_CALENDARIO_AGRONOMICO.md](INFORME_CALENDARIO_AGRONOMICO.md) | Diseño y comparación v2; conserva sus 867 pruebas históricas |
| [INFORME_CALENDARIO_SIEMBRA.md](INFORME_CALENDARIO_SIEMBRA.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_CAPAS_SATELITALES.md](INFORME_CAPAS_SATELITALES.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_CLIMA_NASA.md](INFORME_CLIMA_NASA.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_COMPRENSION_GRAFICAS.md](INFORME_COMPRENSION_GRAFICAS.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_CORRECCION_CALENDARIO_RIESGOS.md](INFORME_CORRECCION_CALENDARIO_RIESGOS.md) | Corrección v3 anterior a la dependencia del riego v4 |
| [INFORME_DESPLIEGUE.md](INFORME_DESPLIEGUE.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_ENTREGA_FINAL.md](INFORME_ENTREGA_FINAL.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_ESCENARIOS.md](INFORME_ESCENARIOS.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_EXPERIENCIA_AGRICULTOR.md](INFORME_EXPERIENCIA_AGRICULTOR.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_FASE_ENTREGA.md](INFORME_FASE_ENTREGA.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_GRAFICAS_Y_DELIMITACION.md](INFORME_GRAFICAS_Y_DELIMITACION.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_INTEGRACION.md](INFORME_INTEGRACION.md) | Preparación e integración del calendario y gráficas, anterior a v4 |
| [INFORME_MEJORA_FOTOGRAFICA.md](INFORME_MEJORA_FOTOGRAFICA.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_PANEL_TECNICO.md](INFORME_PANEL_TECNICO.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_PERSISTENCIA.md](INFORME_PERSISTENCIA.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_PRIMERA_ENTREGA.md](INFORME_PRIMERA_ENTREGA.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_PRONOSTICO_HELADAS.md](INFORME_PRONOSTICO_HELADAS.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_PUBLICACION_FINAL.md](INFORME_PUBLICACION_FINAL.md) | Publicación del 12-11-2026, 0f13434; no es el último despliegue |
| [INFORME_PULIDO_VISUAL.md](INFORME_PULIDO_VISUAL.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_REPORTES_PDF.md](INFORME_REPORTES_PDF.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_ROTACIONES.md](INFORME_ROTACIONES.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_TENDENCIAS_CLIMATICAS.md](INFORME_TENDENCIAS_CLIMATICAS.md) | Registro de su fase; no sustituye el estado vigente |
| [INFORME_TERRENOS_SIEMBRAS.md](INFORME_TERRENOS_SIEMBRAS.md) | Registro de su fase; no sustituye el estado vigente |

No se modificaron frontend, backend, motores, algoritmos, dependencias, migraciones, configuración de despliegue, usuarios, terrenos ni siembras. No se ejecutaron despliegues ni se reescribió el historial. La publicación de las correcciones documentales se hará únicamente después de mostrar el diff y recibir la confirmación solicitada por el usuario, mediante un commit documental y avance normal de `release/publicacion`.
