# Comparador de tres estrategias de rotación agrícola

Fecha: **8 de noviembre de 2026**. Rama: `feat/rotaciones`. Base: `92a7d2f53ede7fe524cd45e5bd7f8d4e454dd3e9`.

## 1. Hito protegido y alcance

Se verificó Git limpio y el commit indicado antes de actuar. Se creó la etiqueta **local anotada** `v0.1.0-primera-entrega`, que apunta al commit de auditoría, y la rama nueva `feat/rotaciones`. Objeto de la etiqueta: `9d5f716dcf9c4cd357066404879bf5e767409dd3`.

Se conservan autenticación, perfil, terrenos, siembras, NASA, Open-Meteo, calendario y las correcciones de la primera entrega. No se modifican `PROYECTO.md`, `AGENTS.md`, esquema/migración, la rama anterior o `main`. No se añaden dependencias ni se implementan tendencias, simulador visual, capas, panel técnico avanzado o PDF. No se hace push, merge ni despliegue.

## 2. Definición y autorización de la heurística

La sección 7.3 define los criterios cualitativos y las tres posiciones, pero no fija fórmulas numéricas, peso del riesgo climático o fecha inicial de las propuestas. Antes de programar el motor se señaló esa ausencia. El usuario respondió explícitamente: **«Diseña y documenta la heurística referencial»**.

Por tanto, las fórmulas siguientes son una **decisión de diseño autorizada**, versión `heuristica_rotaciones_v1`; no se atribuyen al documento original ni a un estudio científico. No han sido calibradas o validadas por un técnico agrícola. Se mantienen los valores del catálogo, las reglas originales del calendario y los campos del contrato. No hay predicción de rendimientos, dinero, nutrientes, ahorro de agua o probabilidades de éxito.

## 3. Las tres estrategias

1. **Actual:** patrón de las tres últimas siembras registradas, presentado cronológicamente. Si existen una o dos, se repite el último cultivo hasta completar tres, indicando expresamente que no son registros históricos añadidos. Sin historial, actual conserva secuencia vacía y total no determinado.
2. **Sugerida 1:** plantilla original con mayor total verificable entre las compatibles y programables.
3. **Sugerida 2:** siguiente plantilla original, con el mismo criterio y condiciones iniciales.

No se confunden las dos secuencias del ejemplo narrativo con alternativas fijas para toda parcela. Se evalúan las ocho plantillas originales de la sección 10:

| ID conservado | Secuencia de IDs |
| --- | --- |
| `papa-haba-cebada` | papa → haba → cebada |
| `papa-chocho-quinua` | papa → chocho → quinua |
| `papa-avena-haba` | papa → avena → haba |
| `papa-vicia-papa` | papa → vicia_avena → papa |
| `maiz-haba-cebada` | maiz → haba → cebada |
| `brocoli-haba-avena` | brocoli → haba → avena |
| `oca-haba-cebada` | oca → haba → cebada |
| `quinua-chocho-cebada` | quinua → chocho → cebada |

`vicia_avena` conserva su naturaleza combinada y ambos componentes de familia. Los nombres descriptivos se derivan de las secuencias y la descripción queda NULL; no se añaden afirmaciones agronómicas.

Las candidatas se ordenan por total **sin redondear**, y por ID en caso de empate. Una plantilla idéntica al patrón actual no ocupa una posición de alternativa. Para competir, todos sus pasos deben poder programarse sin una exclusión del calendario, y sus indicadores/total deben ser calculables. Es una selección conservadora dentro de las plantillas aptas por altitud, sin relajar otras restricciones conocidas.

Si hay menos de dos candidatas evaluables se conservan tres posiciones de respuesta, pero las restantes tienen **`id: null`, secuencia vacía, puntajes nulos y motivo explícito**. No se inventa otra estrategia ni se repite la misma alternativa. A 2775 m, por ejemplo, puede quedar únicamente `papa-vicia-papa` entre las ocho; se comprueba que el sistema no amplíe altitudes para completar el comparador.

## 4. Datos disponibles, límites y reutilización

| Fuente | Uso y alcance |
| --- | --- |
| PostgreSQL: terreno | Altitud estimada, riego declarado y contexto del área. No se acepta ubicación ni propietario desde la consulta. |
| PostgreSQL: propietario | Prioridades agua/suelo/ingresos. El técnico utiliza las prioridades del propietario, sin publicar su nombre, correo o teléfono. |
| PostgreSQL: siembras | Últimos tres registros para el patrón/predecesor; máximos de fechas registradas para el inicio común. No se escriben recomendaciones en el historial. |
| Diez cultivos originales | Familias, ciclos, ventanas y atributos referenciales. Sin añadir rendimientos, precios o características. |
| `plantillas_rotacion` | Ocho secuencias persistidas. Las constantes permiten validar las definiciones originales, pero GET no las siembra ni las sustituye por datos en memoria. |
| NASA POWER normalizada | Lluvia mensual en mm/mes y riesgo heurístico mensual del servicio existente, con fuente/periodo/resolución/antigüedad. No se hace una nueva conversión de unidades. |
| Calendario existente | Única autoridad para ventanas, compatibilidad por altitud, brócoli con riego y heladas de cultivos sensibles. Se reutilizan su función pura y el procesamiento de escenarios. |

No existe información suficiente para estimar disponibilidad física de la parcela, cosechas futuras reales, suelo medido, caudal, rentabilidad, balance hídrico completo, control de plagas o efecto de una rotación en una finca. Esas ausencias se muestran en `vacios_informacion`. Área, tipo de suelo y valor de forraje no reciben fórmulas adicionales que el proyecto no haya definido.

## 5. Secuencia temporal

- El backend obtiene hoy en Ecuador continental, UTC−5. El horizonte inicial común es el **primer día del mes posterior** al máximo de hoy, las fechas de siembra registradas y las cosechas conocidas del terreno. No se inicia antes de una cosecha conocida posterior.
- Se evalúa el patrón actual hipotéticamente hacia adelante y cada candidata bajo ese mismo inicio; las fechas históricas no se reescriben ni se presentan como cosechas proyectadas observadas.
- Por cada paso se busca, desde el mes disponible, el primer mes con estado recomendado o posible con cuidado en los doce meses siguientes. Se conservan el motivo y la precaución del calendario. Una celda roja o no determinada no se convierte en una fecha de siembra.
- El fin orientativo es inicio + `ciclo_meses` del catálogo, en meses civiles. El paso siguiente comienza como mínimo allí, con la espera adicional de su ventana. No se acortan ciclos, solapan pasos ni se inventan cosechas.
- Se manejan diciembre/enero, meses de espera y límites de año. Si un paso no puede programarse no se asignan fechas ficticias a los siguientes.
- Hay tres ciclos, **sin un horizonte total fijo de años**. Las esperas y duraciones pueden diferir entre alternativas. Los índices promedian cultivos y no representan productividad o ingresos anualizados.

Una cosecha no registrada no se asume realizada. Incluso cuando se genera un horizonte, se advierte que falta confirmar disponibilidad real del terreno; es una planificación hipotética. Las lluvias históricas del mes se aplican como referencia a los años proyectados: no son un pronóstico NASA para esos años.

## 6. Fórmulas exactas v1

Todos los puntajes son **índices adimensionales 0–100**, donde mayor es más favorable dentro de esta heurística. No son mediciones ni escalas agronómicas validadas. Se usa aritmética completa para seleccionar; se redondean a dos decimales al publicar.

Para un atributo referencial `x` entre 1 y 5:

```text
N(x) = 25 × (x − 1)
```

El promedio de una lista con un componente esencial nulo queda nulo, sin convertirlo en cero ni reponderar los demás. Datos inválidos fuera de rango no se aceptan como atributos válidos.

### Agua

Para cada cultivo y cada mes de su ciclo, cobertura referencial `C`:

```text
Si tiene_riego = true: C = 1
Sin riego: C = min(1, lluvia_mm / lluvia_min_mensual_mm)
Mínimo de lluvia = 0: C = 1
```

Si riego es desconocido y la lluvia no alcanza, C es nula. Si faltan lluvia/mínimo y no existe riego confirmado, C es nula. Una lluvia conocida suficiente satisface la regla aunque riego sea desconocido. No se presume una lluvia ausente de cero. C es un cociente de referencia, no una estimación de agua realmente disponible para raíces.

```text
C_media = promedio de C durante los ciclo_meses
Agua_cultivo = [100 − N(demanda_agua) + N(tolerancia_sequia) + 100 × C_media] / 3
Agua_estrategia = promedio de Agua_cultivo de los tres pasos
```

Riego declarado satisface el criterio de esta regla; no acredita caudal, infraestructura ni volumen. La lluvia mínima es la del catálogo y no un balance hídrico por fase fenológica.

### Suelo

```text
Suelo_cultivo = [F + N(aporte_materia_organica) + N(proteccion_erosion)] / 3
F = 100 si fija_nitrogeno es true; 0 si es false; nulo si se desconoce
P = proporción de transiciones consecutivas con al menos una familia compartida
Suelo_estrategia = max(0, promedio(Suelo_cultivo) − 25 × P)
```

Se revisan las dos transiciones internas y, si se conoce el predecesor del historial, su transición al primer cultivo propuesto. Una familia desconocida deja la proporción y el puntaje de suelo no determinados. Sin historial se revisan las dos transiciones internas, avisando que falta la transición de entrada. La mezcla Fabaceae/Poaceae comparte familia con ambas. El máximo descuento es 25 puntos: no es un diagnóstico de plagas ni una predicción de fertilidad.

### Compatibilidad climática (`puntajes.riesgo`)

Por cada mes del ciclo:

```text
S = 0 para riesgo de helada bajo; 0,5 medio; 1 alto; nulo si desconocido
H = 100 × [1 − S × (1 − N(tolerancia_helada)/100)]
D = 100 × [1 − (1 − C) × (1 − N(tolerancia_sequia)/100)]
Compatibilidad_mes = (H + D) / 2
Riesgo_cultivo = promedio de Compatibilidad_mes durante su ciclo
Riesgo_estrategia = promedio de Riesgo_cultivo de los tres pasos
```

**Mayor puntaje significa mayor compatibilidad referencial**, no mayor probabilidad de helada. S procede del riesgo histórico ya calculado por el módulo NASA, incluido su ajuste por altitud; no se vuelve a aplicar ese ajuste. No se usa el pronóstico Open-Meteo como clima a varios años. Cualquier ingrediente esencial desconocido deja ese indicador nulo. Las exclusiones conocidas del calendario siguen prevaleciendo aunque una media numérica pudiera ser favorable.

### Ingresos y total

```text
Ingresos = promedio de N(valor_mercado) de los tres cultivos
Total = (Agua×p_agua + Suelo×p_suelo + Riesgo×3 + Ingresos×p_ingresos)
        / (p_agua + p_suelo + 3 + p_ingresos)
```

Ingresos significa **«estimación, validar localmente» del índice referencial de mercado**, sin moneda, precios, costos o rendimiento. Los pesos `p` son las prioridades 1–5 del propietario almacenadas en SQL. El riesgo tiene peso fijo **3**, explícito, porque el perfil original define tres prioridades y cuatro indicadores. Si falta una prioridad o indicador necesario no se publica total ni se determina el ranking. Este peso y todas las fórmulas son decisiones heurísticas pendientes de calibración, no nuevos campos del perfil.

Agua y clima comparten factores; no se presupone independencia estadística ni se interpreta el total como una magnitud física. Cada cultivo pesa igual en el promedio de estrategia, aunque sus ciclos tengan distinta duración.

## 7. Endpoint, contrato y seguridad

```http
GET /api/terrenos/:id/rotaciones?lluvia_pct=0&temp_delta=0
Authorization: Bearer <token privado>
```

Los parámetros por defecto son cero. Se reutiliza la validación estricta del calendario: lluvia -30…30 %, temperatura -2…2 °C; rechaza vacíos, duplicados, arrays, claves inesperadas y valores no finitos. El UUID se valida. No se admiten propietario, coordenadas o prioridades como parámetros.

Se conservan los campos originales por estrategia: `id`, `nombre`, `es_actual`, `puntajes`, `por_que`, `evidencia`, `beneficios`, `vacios_informacion`, `riesgos`, `aviso`. Se añaden metadatos compatibles para el nuevo consumidor: `secuencia`, `planificacion`, `estado`, `candidatas`, `inicio_comun`, `escenario`, `metodologia`, `clima` y `advertencias`. Los puntajes nulos y posiciones con ID nulo expresan insuficiencia; no se inventa una estrategia con puntaje cero. `cambios_vs_base` es opcional en el contrato y no se implementa en esta fase.

Ejemplo **recortado, controlado de prueba**, no una recomendación universal: con el escenario E2E a 3000 m, sin riego, prioridad 3/3/3, un registro de papa y climatología archivada aplicada al horizonte diciembre de 2026:

```json
{
  "estrategias": [
    { "id": "actual", "es_actual": true, "puntajes": { "total": 58.59 } },
    { "id": "quinua-chocho-cebada", "es_actual": false, "puntajes": { "total": 72.15 } },
    { "id": "papa-chocho-quinua", "es_actual": false, "puntajes": { "total": 69.59 } }
  ]
}
```

La respuesta completa añade todos los indicadores, secuencias, motivos, riesgos y fuentes. Los valores del ejemplo corresponden a fixtures y al inicio indicado; cambian con clima, prioridades, historial y horizonte.

- Autenticación JWT existente y filtro por propietario. Agricultor ajeno recibe el mismo 404 que un terreno inexistente, antes de llamar NASA.
- Técnico puede leer con el contexto del propietario; no recibe sus datos de contacto ni obtiene permisos agrícolas de escritura.
- Se leen datos mediante Prisma, sin concatenación de entradas en SQL. GET no modifica terreno, perfil, historial, cultivos o plantillas. El servicio climático puede actualizar su caché conforme a la implementación existente.
- Se comparte la misma instancia NASA con clima/calendario, su deduplicación, límite y caché de 30 días. No hay una solicitud por plantilla o por cada paso.
- Sin clima fiable se devuelve `clima: null`, advertencia y comparación no determinada, conservando únicamente atributos conocidos. Se captura exclusivamente `ErrorClima`; un fallo SQL inesperado mantiene el error 500, sin convertirse en una aparente ausencia meteorológica.
- Errores conservan `{ error }`: 400 entrada, 401 autenticación, 404 recurso, 500 datos/configuración inesperados. Límite de consultas 30/minuto/usuario con 429; CORS local intacto.

## 8. Interfaz y sesión

Apartado **Comparador de rotaciones** dentro del detalle existente. Tres tarjetas paralelas en escritorio y apiladas en celular; muestran secuencia, inicio/fin orientativos, ciclo, esperas, estado con texto/símbolo, barras con valores numéricos, motivos y detalles de evidencia/ventajas/vacíos/riesgos. No se depende solo del color. Hay carga, errores/reintento, insuficiencia explícita y actualización manual.

La API se consume y valida en `frontend/src/lib/api.ts`. TanStack Query separa claves por usuario, terreno, contexto, prioridades y escenario; se conservan cancelación y guardas de sesión. Los cambios de siembras invalidan la comparación. El técnico puede actualizar para recoger cambios hechos por el propietario desde otra sesión. No se guarda un resultado agrícola en SQL ni se crea una caché de recomendaciones persistentes desactualizadas.

Los detalles nativos se pueden abrir con teclado. Las capturas y pruebas verifican ausencia de desbordamiento global, tres tarjetas, explicaciones y cambio de prioridades. Se conserva desplazamiento normal de página en celular, sin prometer mostrar todas las tarjetas simultáneamente. La prueba móvil es Edge con emulación táctil 390×844, no un teléfono físico ni certificación WCAG completa.

## 9. Semilla, integridad y estado final de bases

`npm.cmd run db:seed:rotaciones --workspace backend` carga las ocho plantillas originales en una transacción. Se ejecutó dos veces con éxito y sin duplicados. Conserva definiciones existentes idénticas y rechaza reemplazar una distinta; no borra datos ajenos. El primer intento dentro del aislamiento Windows falló en `uv_os_get_passwd` antes de iniciar el script; la ejecución nativa autorizada resolvió ese problema de entorno. No se cambió código ni credenciales para eludirlo.

PostgreSQL 18.4 y Prisma 7.10.1 se conservan. Las dos bases tienen aplicada únicamente `20261107000100_esquema_inicial`, sin pendientes; `prisma migrate diff --exit-code` informó **No difference detected**, código 0. No hay nuevas tablas/columnas/migraciones ni bases adicionales.

Conteos finales de consulta READ ONLY:

| Base | Usuarios | Terrenos | Cultivos | Siembras | Plantillas | Caché |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `rotaandes_dev` | 0 | 0 | 10 | 0 | 8 | 0 |
| `rotaandes_pruebas_36cbc85c` | 0 | 0 | 0 | 0 | 0 | 0 |

No quedan registros de agricultores/parcelas/siembras de prueba. SQL revierte transacciones; E2E elimina solo sus cuentas aleatorias, filas de catálogo/plantillas insertadas y restaura su clave de caché previa. No se borraron bases ni modificaron contraseñas.

## 10. Validaciones ejecutadas

La ejecución final de **`npm.cmd run check` terminó con código 0** después de los cambios de texto científico y la comparación directa con calendario:

| Comprobación | Resultado |
| --- | --- |
| `npm.cmd run lint` | Aprobado, sin advertencias. |
| `npm.cmd run typecheck` | Herramientas, backend y frontend aprobados; TypeScript estricto. |
| `npm.cmd run test` | **231 backend + 72 frontend** aprobadas. |
| PostgreSQL, incluido en `check` | **120 pruebas** aprobadas; incluye siete nuevas del módulo. |
| `npm.cmd run build` | Backend y frontend aprobados; generado Prisma 7.10.1, sin nuevas dependencias. |
| Playwright | **20 E2E** aprobados: 16 anteriores + 2 integrales primera entrega + 2 del comparador, escritorio/celular. |
| `npm.cmd run check` | **443 pruebas totales**, sin fallos; preserva las 404 de primera entrega y añade 39. |
| Git/secretos | Contenido actual y preparado revisados, sin archivos privados, artefactos o secretos detectados. |

Las 21 pruebas unitarias nuevas incluyen oráculos de fórmulas calculados manualmente, transcripción de todas las secuencias, tres registros/menos/vacío, altitud y una sola alternativa, riego/brócoli, datos faltantes de clima/catálogo/mercado/prioridades, familias combinadas, heladas, ciclos/esperas y límites de año, escenarios, entradas inválidas, determinismo/no mutación y un empate real con desempate por ID.

Las nueve de interfaz comprueban consulta a petición, carga/tarjetas/valores, errores/reintento, nulos, validación de respuesta y cambios/cierre de sesión con respuestas tardías. Las siete SQL cubren semilla, caché compartida, no escritura de historial, permisos/propiedad/técnico, escenarios/prioridades, indisponibilidad y fechas conocidas.

El E2E del comparador registra una cuenta aleatoria, usa terreno/altitud/clima **controlados y etiquetados**, registra papa desde la interfaz, abre las tres estrategias y contrasta cada paso programado con la respuesta real de `/calendario` (mes, estado y motivo). Guarda preferencias, comprueba su aplicación, edita la siembra a haba y verifica invalidación del patrón; finalmente cierra y limpia. PostgreSQL, frontend, backend y cálculos son reales; meteorología y contexto de parcela son fixtures, no una finca observada ni nueva consulta NASA.

Se mantuvieron cero errores de página/consola de aplicación y cero errores HTTP de navegación locales en esos recorridos del comparador. Se bloquean deliberadamente las teselas OSM en ese test para no depender de Internet; la alternativa del mapa queda identificada. La primera entrega mantiene su propio recorrido de mapa/elevación y pruebas previas de NASA/Open-Meteo. En esta fase no se afirma una nueva consulta meteorológica en vivo ni se atribuyen fixtures a una respuesta externa actual.

## 11. Capturas y archivos

Evidencias **locales e ignoradas por Git**, en las carpetas de escritorio/celular del segundo proceso Playwright:

- [Resumen de escritorio](../test-results/integral/rotaciones-rotaciones-inte-fdd16-dario-preferencias-y-sesión-escritorio/comparador-resumen.png).
- [Resumen de celular emulado](../test-results/integral/rotaciones-rotaciones-inte-fdd16-dario-preferencias-y-sesión-celular/comparador-resumen.png).
- [Evidencia expandida de escritorio](../test-results/integral/rotaciones-rotaciones-inte-fdd16-dario-preferencias-y-sesión-escritorio/comparador-rotaciones.png).
- [Evidencia expandida de celular](../test-results/integral/rotaciones-rotaciones-inte-fdd16-dario-preferencias-y-sesión-celular/comparador-rotaciones.png).

Cada carpeta incluye `evidencia-rotaciones.json`, sin credenciales, con las tres puntuaciones obtenidas y controles de errores. Las capturas identifican la climatología controlada. Los correos son aleatorios y las claves no aparecen en documentos; las trazas de navegador permanecen deshabilitadas.

Se registran **24 archivos**:

| Grupo | Archivos |
| --- | --- |
| Backend/datos | `backend/src/services/motorRotacion.ts`, `backend/src/routes/rotaciones.ts`, `backend/src/data/catalogoPlantillas.ts`, `backend/prisma/seedRotaciones.ts` |
| Integración/configuración | `backend/src/aplicacion.ts`, `backend/src/services/datosAgricolas.ts`, `backend/package.json`, `backend/tsconfig.json` |
| Pruebas backend | `backend/tests/motorRotacion.test.ts`, `backend/tests/fixtures/rotacionesPruebas.ts`, `backend/tests/base-datos/rotaciones.integration.test.ts` |
| Frontend | `frontend/src/components/ComparadorRotaciones.tsx`, `frontend/src/components/SiembrasTerreno.tsx`, `frontend/src/pages/DetalleTerreno.tsx`, `frontend/src/lib/api.ts`, `frontend/src/types/api.ts` |
| Pruebas frontend | `frontend/src/components/ComparadorRotaciones.test.tsx`, `frontend/src/tests/rotacionesPruebas.ts` |
| Navegador | `tests/navegador/rotaciones.spec.ts`, `playwright.config.ts`, `playwright.integral.config.ts` |
| Documentación | `README.md`, `docs/DECISIONES.md`, `docs/INFORME_ROTACIONES.md` |

## 12. Cierre, problemas y límites pendientes

- La ausencia de fórmulas originales se resolvió con la autorización expresa indicada, sin afirmar que la heurística sea una fórmula científica existente.
- Se corrigieron durante la construcción expectativas de test sobre URL y restauración tipada de JSON nulo; la validación final completa pasó después. No quedan fallos críticos conocidos del módulo en las comprobaciones realizadas.
- Las fórmulas/ponderaciones y la penalización de familias requieren revisión agronómica y calibración. No hay garantías de más ingresos, agua ahorrada o mejora real del suelo. No se dispone de fases fenológicas o información local para ese nivel de precisión.
- La disponibilidad real del terreno y los efectos de clima futuros no se conocen. Los tres ciclos pueden durar distinto y las medias no están anualizadas. No usar los índices como una evaluación económica.
- Se mantiene el comportamiento limitado del respaldo climático al mismo punto. Datos históricos desactualizados pueden evaluarse solo con su advertencia/antigüedad visibles, según el servicio existente. Sin información fiable no se inventa ranking.
- Puede haber menos de dos alternativas; no se amplían rangos ni se agregan plantillas nuevas para ocultarlo. Sin historial tampoco se inventa la referencia actual.
- Revisión móvil emulada, sin validación en dispositivo físico, estudio con agricultores o auditoría de accesibilidad completa. Las limitaciones de sesión y operación local de la primera entrega siguen vigentes.

El commit de esta fase usa `Implementar comparador de rotaciones agricolas`; su hash se comunica en la entrega final. Se verifica árbol limpio, rama `feat/rotaciones`, etiqueta intacta y ausencia de cambios en `main`/rama anterior y documentos protegidos. La fase termina aquí; no se inicia automáticamente ningún otro módulo ni una publicación pública.
