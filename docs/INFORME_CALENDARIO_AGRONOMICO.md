# Informe: corrección agronómica del calendario y nuevos cultivos (15-11-2026)

Rama local `feat/calendario-agronomico`, en un worktree independiente, creada desde `69f925b` (versión publicada). No se hizo push ni despliegue, y no se tocaron Railway, Vercel ni PostgreSQL de producción. El trabajo sin confirmar de `feat/comprension-graficas` quedó intacto en su carpeta, con una copia de seguridad del parche fuera de Git.

## 1. Causa de los excesivos «No recomendado»

Con la respuesta NASA POWER archivada de Latacunga y un terreno a 3000 m sin riego, el calendario anterior daba **88 de 120 casillas en rojo** (`tests/auditoriaCalendarioV1.test.ts`). Los datos no faltaban: Latacunga, Pujilí, Saquisilí y Salcedo comparten la misma celda NASA, con lluvia ≥ 52 mm todos los meses y mínimas medias de 1,9 a 5,1 °C. Las causas estaban en las reglas:

1. **La ventana de siembra excluía.** Cualquier mes fuera de `meses_siembra` era rojo. Las ventanas de §10 duran 3 a 5 meses, son aproximadas y no están validadas. Así, el haba tenía 9 meses rojos por definición, sin mirar el clima.
2. **La altitud excluía por pocos metros.** Un terreno a 2750 m quedaba sin cebada, chocho ni avena (mínimo de 2800 m en §10), a pesar de tener temperatura y lluvia compatibles.
3. **La helada alta sobre 3400 m.** La regla §7.1 sube un nivel el riesgo desde 3400 m. Con las mínimas de la celda, el riesgo es «alto» todos los meses, y la papa y el brócoli (tolerancia 2) quedaban excluidos todo el año en la mitad alta de su propio rango de §10 (2700-3800 m).
4. **Solo se miraba el mes de siembra y los dos siguientes**, no el ciclo real: la papa ocupa 6 meses y el rábano menos de 2.
5. **El brócoli sin riego era rojo todo el año** por una nota de §10 («con riego») sin fuente.

## 2. Cultivos nuevos y fuentes

Se añadieron los 19 cultivos solicitados, sin duplicados (29 en total). Parámetros y fuentes por cultivo: `backend/src/data/perfilesAgronomicos.ts`. Resumen en `PROYECTO.md` §10.

| Fuente | Qué aporta |
| --- | --- |
| Yugsi, L. (2011). *Producción limpia de hortalizas*. Boletín Técnico 408, INIAP Santa Catalina | Siembra directa (acelga, rábano, remolacha, zanahoria, culantro, papanabo) o trasplante (brócoli, cebolla de bulbo, cebolla blanca, coliflor, col, lechuga), Cuadro 3. Las hortalizas pueden sembrarse todo el año (p. 7). Riego durante todo el cultivo (pp. 18 y 21). Cosecha de hojas (p. 25). |
| FAO, Brouwer y Heibloem (1986), *Irrigation Water Needs*, cap. 3 | Ciclo total (Tabla 6) y necesidad de agua por ciclo (Tabla 14). El ciclo se alarga en clima frío. |
| FAO-56 (Allen et al., 1998), Tabla 11 | Ciclo de remolacha de mesa, apio y zapallo |
| FAO EcoCrop (copia OpenCLIM, SHA-256 `4187e884…`) | Temperatura media de crecimiento (mínima, óptima, máxima), ciclo y lluvia anual |
| Naranjo et al. (2018), *La Técnica* 19 (autores de INIAP) | Melloco en Ecuador: 1800-3800 m, 5-20 °C |
| Tesis UTC (2017) | «Papa nabo» = *Brassica rapa* (nabo de mesa) |
| Córdova et al. (2016), *Arct. Antarct. Alp. Res.* 48(4) | Gradiente térmico en los Andes ecuatorianos: 6,9 °C/km para la media y 5,5 °C/km para la mínima |

**Denominaciones aclaradas:**

- **Papa nabo:** *Brassica rapa* subsp. *rapa*; no es una papa.
- **Col:** *B. oleracea* var. *capitata*.
- **Col china:** *B. rapa* subsp. *pekinensis* o *chinensis*; queda por confirmar cuál se cultiva localmente.
- **Cebolla blanca:** *Allium fistulosum*, cebolla de rama. INIAP la distingue de la de bulbo.
- **Cebolla colorada:** *Allium cepa* de bulbo.
- **Zambo:** *Cucurbita ficifolia*.
- **Zapallo:** *Cucurbita maxima*.

**Categorías:**

- **Hortalizas:** de hoja, de flor, de raíz, cebollas y cucurbitáceas.
- **Otros cultivos:** el fréjol es leguminosa y el melloco, tubérculo andino; ninguno se trata como hortaliza de ciclo corto.

**Fuentes descartadas, y por qué:**

- **Altitudes máximas de EcoCrop:** son globales; por ejemplo, 2000 m para la col.
- **Temperatura letal de EcoCrop (KTMP):** clasificaba la cebada como sensible a 0 °C.
- **Rango altitudinal del fréjol INIAP-418:** su fuente ya no está disponible (HTTP 410).
- **Índices de rotación de los cultivos nuevos** (agua, helada, sequía, materia orgánica, erosión, forraje y mercado): no tienen fuente, así que quedan en `null` («no determinado»).

## 3. Reglas originales y reglas corregidas

| Criterio | Antes (v1) | Ahora (`calendario_ciclo_v2`) |
| --- | --- | --- |
| Meses evaluados | Mes de siembra; helada en m, m+1 y m+2 | **Todo el ciclo**, cruzando el año |
| Época | Fuera de la ventana → no recomendado | Fuera → precaución (la ventana no está validada). INIAP: hortalizas todo el año |
| Altitud | Fuera del rango → no recomendado | Fuera → precaución; la temperatura decide si hay incompatibilidad |
| Temperatura | No se evaluaba | Media del ciclo (EcoCrop) **ajustada a la altitud del terreno** (6,9 °C/km). Fuera del rango → no recomendado; si las fuentes no coinciden → precaución |
| Heladas | Tolerancia ≤ 2: alto → no; medio → precaución | Riesgo del ciclo, nunca menor que el de la mínima ajustada (5,5 °C/km). Tolerancia 1: alto → no. Tolerancia 2 y hortalizas INIAP: alto → precaución. Sin fuente: alto → no determinado |
| Agua sin riego | Lluvia del mes ≥ mínimo de §10 | Necesidad FAO por ciclo frente a la lluvia del ciclo. Bajo el mínimo → no; entre mínimo y máximo → precaución; sin fuente → no determinado. El berro necesita agua permanente |
| Ausencia de datos | No determinado | No determinado; nunca favorable ni desfavorable |

Cada casilla trae una frase de **resumen** y el **motivo** por criterio, con datos y fuentes. NASA aporta el clima; la recomendación es una regla de RotaAndes.

Para cultivos de trasplante, el mes indica el trasplante; el semillero se prepara antes.

## 4. Comparación cuantitativa

Comparación con `backend/scripts/compararCalendario.ts`:

- **Clima:** las mismas respuestas NASA archivadas en ambos motores.
- **Terrenos:** 5 terrenos ficticios de 2750 a 3650 m, cada uno con y sin riego.
- **Totales:** 1200 casillas antes (10 cultivos) y 3480 después (29 cultivos).

| Estado | Antes (10 cultivos) | Después, mismos 10 | Después, 29 cultivos |
| --- | --- | --- | --- |
| Recomendado | 198 (16,5 %) | 190 (15,8 %) | 431 (12,4 %) |
| Posible con precaución | 71 (5,9 %) | 833 (69,4 %) | 1472 (42,3 %) |
| No recomendado | 931 (77,6 %) | 177 (14,8 %) | 458 (13,2 %) |
| No determinado | 0 | 0 | 1119 (32,2 %) |

Por terreno (R / C / N / ?):

| Terreno ficticio | Riego | Antes (10) | Después (10) | Después (29) | Cultivos con algún mes viable |
| --- | --- | --- | --- | --- | --- |
| Valle, 2750 m | no | 11/7/102/0 | 11/90/19/0 | 22/109/36/181 | 13 |
| Valle, 2750 m | sí | 11/16/93/0 | 11/101/8/0 | 93/201/8/46 | 28 |
| Zona media, 2900 m | no | 22/7/91/0 | 20/81/19/0 | 31/100/36/181 | 13 |
| Zona media, 2900 m | sí | 22/16/82/0 | 22/90/8/0 | 104/190/8/46 | 28 |
| Zona media alta, 3150 m | no | 25/4/91/0 | 23/75/22/0 | 29/96/39/184 | 13 |
| Zona media alta, 3150 m | sí | 25/13/82/0 | 25/84/11/0 | 74/196/11/67 | 27 |
| Zona alta, 3400 m | no | 25/0/95/0 | 23/74/23/0 | 23/96/57/172 | 11 |
| Zona alta, 3400 m | sí | 25/0/95/0 | 25/83/12/0 | 25/215/29/79 | 20 |
| Páramo, 3650 m | no | 16/4/100/0 | 14/70/36/0 | 14/82/130/122 | 10 |
| Páramo, 3650 m | sí | 16/4/100/0 | 16/85/19/0 | 16/187/104/41 | 18 |

**Lectura honesta:**

- **Las recomendadas no aumentan artificialmente.** Con los mismos 10 cultivos bajan de 198 a 190. El cambio principal es que 754 casillas rojas pasan a «precaución», con su motivo.
- **Los «No recomendado» que quedan tienen una razón concreta** (casillas):

  | Motivo | Casillas |
  | --- | --- |
  | Demasiado frío para el cultivo (temperatura bajo el mínimo de EcoCrop) | 288 |
  | Heladas probables en un cultivo sensible (maíz) | 102 |
  | Lluvia del ciclo bajo el mínimo FAO, sin riego | 90 |
  | Berro sin agua permanente | 60 |

- **Las precauciones también tienen motivo** (casillas):

  | Motivo | Casillas |
  | --- | --- |
  | Riesgo alto de helada dentro del ciclo | 638 |
  | Fuera de la época referencial | 601 |
  | Riesgo medio de helada | 240 |
  | Fuera del rango de altitud referencial | 214 |
  | Lluvia justa para el ciclo | 103 |

- **Muchos «No determinado» son reales.** Sin riego, la mayoría de hortalizas no tienen una necesidad de agua documentada (522 casillas) e INIAP las maneja con riego. Además, apio, perejil, col china, berro, fréjol, zapallo, zambo y melloco no tienen fuente sobre tolerancia a heladas (513 casillas). No se maquillan. La interfaz pide indicar si el terreno tiene riego.
- **Con riego hay alternativas reales.** De 2750 a 3150 m, 27-28 de los 29 cultivos tienen meses viables. En el páramo (3650 m) solo 18, por frío y heladas.

## 5. Capturas

Tomadas en `.tmp/capturas-calendario/` (fuera de Git) sobre la compilación local, con datos ficticios y clima NASA archivado:

- **Terrenos:** «Huerto Salcedo con riego» a 2900 m y «Lote Pujilí» sin riego a 3150 m.
- **Pantallas:** escritorio de 1366 px y celular de 390 px, sin desbordamiento horizontal (0 px).

| Archivo | Muestra |
| --- | --- |
| `01-resumen-con-riego`, `02-leyenda`, `03-filtros` | Resumen del mes, leyenda con la definición de los cuatro estados y filtros |
| `04-matriz-con-riego`, `05-matriz-hortalizas-ciclo-corto` | Matriz agrupada por categoría, con ciclo y forma de siembra; filtro de hortalizas de ciclo corto |
| `06-motivo-lechuga`, `07-motivo-lechuga-julio-helada` | Explicación por criterio, con datos y fuentes enlazadas |
| `08-aviso-sin-riego`, `09-matriz-sin-riego` | Terreno sin riego: aviso comprensible sobre los «No determinado» |
| `10-motivo-papa-mayo`, `11-motivo-papa-octubre` | «No recomendado» por lluvia insuficiente frente a «precaución» por helada media |
| `12`, `13` (rotaciones) y `14-simulador-cambios` | Rotaciones y simulador con filtro de cambios |
| `informe-calendario.pdf` (37 páginas) | Matriz por categorías en las páginas 8 y 9 |

## 6. Rotaciones y simulador

- **Rotaciones:** usan el mismo calendario. El programador prefiere el primer mes **recomendado** en 12 meses y, si no hay, el primero con precaución; así no programa meses fuera de época. Las plantillas solo contienen cultivos originales y sus índices no cambian de significado. Un historial con un cultivo nuevo produce una estrategia actual con índices nulos: total y ranking **no determinados**.
- **Familias botánicas:** se comparan para no recomendar secuencias de la misma familia. Cada perfil incluye además consideraciones de rotación con fuente (por ejemplo, brásicas seguidas y, según INIAP, hortalizas después de papa o maíz).
- **Simulador:** aplica lluvia ±30 % y temperatura ±2 °C a la media, la mínima y la máxima antes de evaluar todo el ciclo. Se añadió el filtro «solo cultivos con algún cambio».
- **Informe PDF:** matriz agrupada por categorías y motivos agrupados por tramos de meses consecutivos con el mismo resultado; respeta el límite de páginas.

## 7. Pruebas

`npm.cmd run check` en el worktree terminó con **código 0 y 867 pruebas aprobadas** (antes, 810):

| Batería | Antes | Ahora |
| --- | --- | --- |
| Backend (Vitest) | 401 | 449 |
| Frontend (Vitest) | 203 | 205 |
| PostgreSQL aislado | 158 | 163 |
| Navegador (Playwright) | 48 | 50 |

**Pruebas nuevas:**

- **Calendario v2** (`backend/tests/calendario.test.ts`, 47):
  - los 19 cultivos, sin duplicados de identificador ni de nombre (normalizado);
  - las denominaciones ambiguas y las categorías no son todas «hortaliza corta»;
  - índices nulos sin inventar y fuentes registradas;
  - los cuatro estados, datos incompletos, con y sin riego, y riego desconocido;
  - meses consecutivos que cruzan el año y ciclo corto frente a largo;
  - heladas por tolerancia, ajuste por altitud, conflicto de fuentes y celda NASA más baja que el terreno;
  - escenarios de lluvia y de temperatura, y validación de entradas;
  - auditoría independiente con la respuesta NASA de Latacunga.
- **Migración** (`catalogoAmpliado.integration.test.ts`): en un esquema desechable; datos intactos, cultivos nuevos sembrables y reversión que se niega o restaura.
- **Calendario por HTTP** (`calendario.integration.test.ts`): catálogo parcial.
- **Navegador** (`calendarioAmpliado.spec.ts`, escritorio y celular):
  - 29 filas en grupos, leyenda y filtros;
  - explicación con fuente enlazada;
  - sin desbordamiento horizontal;
  - registro y persistencia de una siembra de melloco.
- **Interfaz** (`CalendarioSiembra.test.tsx`): grupos, filtros, ciclo, fuentes y aviso de riego.

**Pruebas conservadas y ajustadas** (no se eliminó ninguna verificación):

- **Motor anterior:** sus pruebas originales y su auditoría siguen ejecutándose sin cambios de aserciones sobre el motor conservado (`calendarioV1.test.ts` y `auditoriaCalendarioV1.test.ts`).
- **Reglas que cambiaron por diseño:** se reformularon con el mismo objetivo y explicación en el código:
  - 5 de rotaciones, como «no inventar una segunda alternativa» o «no programar meses rojos»;
  - la de altitud vacía de la interfaz, ahora «no deja una tabla vacía engañosa».
- **Conteos y rótulos:** se actualizaron las pruebas que fijaban 10 cultivos y 120 casillas, la nulabilidad de 10 columnas y los rótulos del resumen.
- **Navegador:** la explicación se comprueba criterio por criterio, porque ahora es una lista.
- **Límite de inicios de sesión:** la prueba nueva de navegador se ejecuta con su propia configuración (`playwright.calendario.config.ts`), igual que las demás baterías. Así no agota ese límite, que no se debilitó.
- **PDF:** con 29 cultivos se genera en 37 páginas, dentro del límite de 80, y supera sus pruebas.

## 8. Archivos modificados

| Área | Archivos |
| --- | --- |
| Datos y motor (backend) | `backend/src/data/perfilesAgronomicos.ts` (nuevo), `catalogoCultivos.ts`, `services/calendario.ts` (reescrito), `services/calendarioV1.ts` (motor anterior conservado), `motorRotacion.ts`, `nasaPower.ts`, `clima.ts`, `datosAgricolas.ts`, `reportes.ts`, `pdfTerreno.ts` |
| Rutas y scripts | `routes/calendario.ts`, `routes/rotaciones.ts`, `scripts/compararCalendario.ts` (nuevo), `scripts/verificarCalendario.ts` |
| Base de datos | `prisma/schema.prisma`, `prisma/migrations/20261115000100_catalogo_ampliado/migration.sql`, `prisma/reversiones/20261115000100_catalogo_ampliado.revertir.sql` |
| Frontend | `components/CalendarioSiembra.tsx`, `ResumenCalendario.tsx`, `SimuladorEscenarios.tsx`, `SiembrasTerreno.tsx`, `pages/PanelTecnico.tsx`, `lib/api.ts`, `types/api.ts` |
| Pruebas | Nuevas: `backend/tests/calendario.test.ts`, `base-datos/catalogoAmpliado.integration.test.ts` y `frontend/src/tests/calendarioPruebas.ts`. El motor v1 conserva sus pruebas en `calendarioV1.test.ts` y `auditoriaCalendarioV1.test.ts`. Se ajustaron las pruebas de rotaciones, calendario, escenarios, persistencia, terrenos y siembras, resumen y simulador. |
| Documentación | `PROYECTO.md` (§5, §7.2, §8 y §10), `docs/DECISIONES.md`, este informe |

## 9. Cambios de base de datos

- **Migración `20261115000100_catalogo_ampliado`:** `ALTER TABLE cultivos ALTER COLUMN … DROP NOT NULL` en 10 columnas: `altitud_min`, `altitud_max`, `lluvia_min_mensual_mm`, `demanda_agua`, `tolerancia_helada`, `tolerancia_sequia`, `aporte_materia_organica`, `proteccion_erosion`, `valor_forraje` y `valor_mercado`. No borra ni actualiza filas, ni modifica CHECK, PK, FK o UNIQUE.
- **Verificación en un esquema desechable:**
  - las huellas MD5 de cultivos, siembras, terrenos y usuarios son idénticas antes y después;
  - se quitan exactamente 10 NOT NULL (PostgreSQL 18 los registra como restricciones);
  - los 19 cultivos nuevos y sus siembras se insertan correctamente.
- **Datos:** `cargarCultivos` hace un *upsert* idempotente de los 29 cultivos. Se ejecuta en el `produccion:preparar` de Railway después de migrar y no cambia los 10 originales.
- **Reversión:** `backend/prisma/reversiones/…revertir.sql`, manual. Se niega a continuar si hay siembras de cultivos nuevos. Si no las hay, borra solo la ampliación, restaura NOT NULL y retira el registro de la migración. Probada en el esquema desechable.
- **Base de pruebas local:** la migración se aplicó temporalmente a `rotaandes_pruebas_36cbc85c` para ejecutar las pruebas y se revirtió después. Ver la sección 12.

## 10. Limitaciones agronómicas pendientes

- **Validación local:** ningún parámetro está validado para Cotopaxi; la revisión debe hacerla MAG/INIAP.
- **Fuentes genéricas:** EcoCrop y FAO son globales y no distinguen variedades. Por ejemplo, la papa andina puede tolerar zonas más frías que el mínimo de 7 °C de EcoCrop; por eso, si el rango local la admite, se muestra «precaución por conflicto de fuentes».
- **Datos sin fuente:**
  - tolerancia a heladas de apio, perejil, col china, berro, fréjol, zapallo, zambo y melloco;
  - necesidad de agua por ciclo de la mayoría de hortalizas;
  - época de siembra de los cultivos no incluidos en la guía INIAP.
- **Clima regional:** la celda NASA mide unos 50 km. El gradiente de temperatura es una estimación regional, no una medición del lote.
- **Ciclos:** cambian con la variedad, la altitud y el manejo. Se usa el máximo documentado (clima frío).
- **Datos que no se calculan:** volumen de riego, calidad del agua, suelo y plagas.
- **Caché de clima:** las entradas guardadas antes de este cambio no tienen la altitud de la celda. Mientras no se renueven (hasta 30 días), el calendario no confirma exclusiones por temperatura y lo indica.

## 11. Plan seguro de publicación y reversión

1. **Revisión:** el cliente o el equipo revisa este informe y las capturas; después, autorización expresa del commit.
2. **Respaldo:** respaldo verificado de PostgreSQL de producción con el procedimiento existente y restauración de prueba local.
3. **Exportación limpia:** del commit, con los mismos finales de línea con que se calcularon los checksums de las migraciones anteriores (ver `docs/INFORME_PUBLICACION_FINAL.md`).
4. **Frontend primero:** su validación acepta tanto el formato anterior como el nuevo del backend. Desplegar en Vercel con `--skip-domain`, verificar y promover.
5. **Backend después:** desplegar en Railway. El `produccion:preparar` aplica la migración y carga los 19 cultivos. Verificar:
   - conteos y huellas de usuarios, terrenos y siembras, sin cambios;
   - `/api/cultivos` devuelve 29 cultivos;
   - el calendario devuelve 348 casillas;
   - el PDF se genera.
6. **Reversión del frontend:** volver a promover el despliegue anterior.
7. **Reversión del backend:** antes de que existan siembras de cultivos nuevos, ejecutar el SQL de reversión y volver al despliegue anterior. Si ya existen, corregir hacia adelante sin borrar datos de agricultores.

## 12. Verificación y estado final

- **Base de pruebas compartida** (`rotaandes_pruebas_36cbc85c`): la migración se aplicó para las pruebas y después se revirtió con el script de reversión. El estado final es idéntico al registrado antes de empezar: 2 migraciones, las mismas columnas NOT NULL, 0 filas y ningún esquema extra. También se borraron las 3 entradas de caché creadas por las capturas.
- **Trabajo de la rama `feat/comprension-graficas`:** intacto en la carpeta principal (14 archivos sin confirmar). Hay una copia de seguridad del parche en `C:\Users\DELL\Documents\PROYECTOS\respaldo-comprension-graficas-20261115`. Esa rama modifica `ComparadorRotaciones.tsx`, `SimuladorEscenarios.tsx` y `estilos.css`, por lo que al integrar ambas ramas puede haber conflictos menores en el simulador.
- **Producción:** no se consultó ni modificó. No hubo push ni despliegues.
