# Informe del calendario de siembra — Prompt 10

> **Registro histórico de esta fase.** Se conservan sus fechas, versiones, cifras y resultados; las menciones a publicación pendiente o a repositorio privado describen ese momento. Para la versión vigente, las instrucciones actuales y las evidencias verificadas el 15-11-2026, consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los comandos de publicación, migración o reversión de este registro no son instrucciones para la auditoría documental actual.

## Resultado y alcance

Fase implementada sobre `f7c8fc87ede624ce733b724abe81e2d45ccd3843`, rama `feat/base-datos-autenticacion`. La auditoría inicial confirmó el commit indicado y Git limpio. Se revisaron completos los documentos rectores y los informes de persistencia, autenticación, terrenos, NASA POWER y pronóstico, además de rutas, servicios, catálogo, caché, Prisma y sesión.

Se implementan motor puro, escenarios deterministas en la API, autorización y matriz accesible en el detalle del terreno. Se mantienen las funcionalidades anteriores. No cambian `PROYECTO.md`, `AGENTS.md`, esquema o migraciones. No se instalan dependencias, se alteran credenciales, se borran bases ni se añaden cultivos o fórmulas agronómicas. No se implementan comparador, panel técnico avanzado, capas, PDF, tendencias o simulador visual.

## Motor y tabla de decisión

`backend/src/services/calendario.ts` contiene funciones independientes de Express y React: `calcularCalendario`, `aplicarEscenarioCalendario` y `validarConsultaCalendario`. Reciben entradas explícitas, no hacen HTTP/SQL, no leen el reloj ni modifican entradas. Producen una celda por cultivo/mes, en orden estable, con motivo construido de los valores empleados.

Se aplica la siguiente precedencia conservadora para resolver las ambigüedades de la sección 7.2:

| Prioridad | Condición | Resultado |
| --- | --- | --- |
| 1 | Fuera de ventana o rango de altitud; riesgo alto en cualquiera de los tres meses con tolerancia ≤2; brócoli sin riego | **No recomendado**, rojo, `no_recomendado` |
| 2 | Sin exclusión conocida, pero falta altitud, agua verificable, riego requerido de brócoli o riesgo necesario | **No determinado**, gris, `no_determinado` |
| 3 | Ventana/altitud compatibles y datos esenciales conocidos, con agua insuficiente sin riego o riesgo medio en cultivo sensible | **Posible con cuidado**, amarillo, `posible_con_cuidado` |
| 4 | Ventana/altitud compatibles, agua satisfecha por lluvia o riego y, si tolerancia ≤2, riesgo bajo en los tres meses | **Recomendado**, verde, `recomendado` |

Una exclusión comprobada tiene prioridad sobre datos faltantes: un mes fuera de ventana no se vuelve incierto por falta de lluvia. La incertidumbre esencial nunca se presenta como cumplimiento parcial. El contrato no fijaba un enum de estados; se documentan los tres valores de clasificación y el cuarto valor necesario para expresar la ausencia de conclusión que solicitó esta fase.

Los motivos explican ventana, altitud/rango, precipitación/mínimo del catálogo, riego, tres riesgos, tolerancia, escenario y limitaciones. Ninguna cifra procede de una frase de ejemplo fija. Los datos climáticos se atribuyen a NASA y los umbrales/ventanas al catálogo referencial. No se afirma validación por un técnico agrícola.

## Casos especiales

- Altitud compatible en extremos inclusivos. Altitud nula nunca produce verde o amarillo. La API conserva celdas negativas fuera de altitud; la matriz muestra filas compatibles/evaluables y enumera los cultivos excluidos con sus rangos.
- Agua: lluvia ≥mínimo satisface el criterio aunque no conste riego; riego verdadero satisface el criterio aunque lluvia falte o sea insuficiente. Lluvia insuficiente y riego falso son una precaución conocida; con riego desconocido no se determina. Lluvia faltante sin riego confirmado no se trata como cero o como agua suficiente.
- Área declarada: se incluye como contexto, sin inventar caudal, volumen de agua, superficie óptima o fórmula para modificar estados.
- Cultivos sensibles: exactamente tolerancia a heladas ≤2. Se evalúan m, m+1 y m+2 con módulo 12: diciembre→enero→febrero; noviembre→diciembre→enero. Alto conocido excluye, medio con datos completos exige cuidado y desconocido impide determinar. Se reutiliza `calcularRiesgoHelada`, incluido el ajuste original desde 3400 m, sin una segunda fórmula.
- Tolerancias 3–5: la regla original no exige riesgo bajo; no se introduce otro veto o escala de sensibilidad. Los riesgos se explican igualmente y se aclara que una tolerancia referencial no garantiza resistencia real. Datos no requeridos por esa regla no se inventan ni se transforman en requisitos nuevos.
- `brocoli`: la ventana 1–12 depende de riego confirmado. Riego falso excluye y desconocido impide determinar; lluvia abundante no sustituye esa condición explícita del catálogo.
- `vicia_avena`: conserva identificador, nombre combinado, familia y valores referenciales. No se divide en dos cultivos ni se modifica el catálogo.
- Datos inválidos: códigos de riesgo desconocidos, rellenos (-999), no finitos, meses inválidos/repetidos o catálogo incoherente rechazan el cálculo. Datos normalizados nulos o meses ausentes permiten expresar incertidumbre según los requisitos de cada cultivo. No hay interpolación, cero por defecto o recomendación favorable obtenida mediante coerción.

## Endpoint y escenarios

**GET `/api/terrenos/:id/calendario?lluvia_pct=0&temp_delta=0`**.

JWT obligatorio, propietario exclusivamente desde el usuario autenticado y rol consultado en PostgreSQL. Agricultor: sus propios terrenos. Técnico: lectura de los calendarios. Recursos ajenos e inexistentes responden el mismo 404. UUID inválido o parámetros incorrectos: 400; sin sesión: 401; clima/catálogo no fiables: 500 controlado; exceso: 429, treinta peticiones/minuto/usuario. Errores `{ "error": "mensaje" }`; CORS no cambia.

El servidor lee ubicación, altitud, riego, área y los diez cultivos de PostgreSQL. No acepta suplantación de propietario o contexto mediante query. El catálogo debe contener los diez IDs autorizados y valores válidos antes de consultar el clima. Un GET no ejecuta semillas ni modifica terrenos/cultivos.

Se conservan `{ celdas: [{ cultivo_id, mes, estado, motivo }] }`. Metadatos compatibles añadidos: `cultivos` (ID/nombre/rango), `terreno`, `escenario`, `clima` (fuente, resolución, periodo, fecha, origen, antigüedad y advertencias) y `aviso`. La respuesta normal contiene **120 celdas**; los filtros visuales no alteran la evaluación del backend.

Parámetros omitidos valen cero. Se aceptan decimales finitos, lluvia_pct de -30 a +30 y temp_delta de -2 a +2. Vacíos, duplicados/arrays, objetos, claves ajenas y formatos engañosos se rechazan; una cadena vacía no se convierte en cero. El frontend muestra solo el escenario base, pero su cliente central admite el par para reutilización futura.

La función de escenario aplica exactamente:

```text
lluvia del escenario = lluvia base × (1 + lluvia_pct / 100)
temperaturas mínima/máxima del escenario = temperatura base + temp_delta
```

Conserva nulos y recalcula riesgo mediante la función existente antes de clasificar, sin mutar datos base. Se identifica el escenario no nulo como hipotético en sus motivos. No se redondea para decidir; el texto formatea valores para lectura. No se crean todavía controles de simulación, comparaciones de rotaciones ni modelos predictivos.

## Clima, caché y limitaciones

Calendario y `/clima` comparten **la misma instancia** del servicio NASA: validación, caché PostgreSQL de treinta días, deduplicación, límites externos y respaldo de ubicación exacta. Cambiar escenario no repite una consulta NASA mientras el dato base sea reutilizable. No hay nueva tabla, caché SQL de recomendaciones ni claves agrícolas que confundan usuarios o escenarios.

Se conserva periodo, origen, fecha y advertencias del dato, incluidos respaldo y dato anterior desactualizado admitidos por el servicio. La antigüedad se muestra expresamente; no se rejuvenecen fechas ni se presenta esa consulta como una nueva medición o validación agrícola. Sin información fiable se devuelve error/reintento, sin una matriz ficticia. No se utiliza el pronóstico Open-Meteo para reemplazar climatología.

La climatología es regional y multianual, con lluvia mensual aproximada derivada de mm/día y riesgo de helada heurístico. No es microclima, medición del lote, conteo de días de helada ni pronóstico. Los diez cultivos siguen siendo referenciales, pendientes de validación agronómica local. El sistema no reemplaza al agricultor o técnico ni garantiza rendimientos, agua o ausencia de heladas.

## Comprobación real independiente y ejemplo

Ejecutado con código **0**:

```powershell
npm.cmd run calendario:verificar --workspace backend
```

Lee los diez cultivos reales de desarrollo en una transacción **READ ONLY** y consulta el cliente NASA existente en (-0.93, -78.62). No crea una parcela, no presume altitud/riego/área de un agricultor, no persiste caché y no escribe datos de pruebas.

Respuesta real procesada el **2026-11-08T05:00:42.953Z** (8 de noviembre, 00:00 en Ecuador), periodo **2001–2025**. Se calcularon **120 celdas**: 79 no recomendadas por exclusiones verificables y 41 no determinadas; ninguna verde o amarilla, al desconocerse la altitud. Esto verifica que la incertidumbre no se convierte en certeza favorable.

Enero de papa utilizó **124 mm** de lluvia mensual NASA frente al mínimo referencial de **60 mm/mes**, y riesgos enero medio/febrero bajo/marzo medio. El resultado fue no determinado por altitud desconocida. Ejemplo de los cuatro campos publicados (una celda calculada; se omiten las otras 119 y los metadatos para esta muestra):

```json
{
  "cultivo_id": "papa",
  "mes": 1,
  "estado": "no_determinado",
  "motivo": "Papa: enero pertenece a su ventana referencial (octubre, noviembre, diciembre, enero). Altitud del terreno desconocida: no se puede confirmar compatibilidad con 2700–3800 m del catálogo. Lluvia mensual estimada a partir de NASA: 124 mm; mínimo referencial del catálogo: 60 mm/mes (alcanza el mínimo). No se conoce la condición de riego. Riesgo de helada heurístico de enero: medio; febrero: bajo; marzo: medio. Tolerancia referencial: 2/5. Cultivo sensible: se exige riesgo bajo en los tres meses para recomendar; riesgo alto en cualquiera excluye la siembra. Faltan datos esenciales: no se determina la recomendación. NASA describe una zona y un periodo histórico, no el microclima del lote ni el tiempo futuro. Los umbrales agronómicos son referenciales, pendientes de validación local."
}
```

Estos valores son evidencia de una consulta real, sin atribuir validación agrícola al ejemplo. Los casos verdes/amarillos/rojos/grises de las pruebas utilizan condiciones controladas identificadas como tales.

## Interfaz, accesibilidad y sesión

Panel integrado en el detalle, cerrado inicialmente. La matriz muestra doce meses, encabezados fijos y primera columna fija, con scroll horizontal/vertical limitado al contenedor. Los estados se diferencian con etiquetas y símbolos además de color; la leyenda incluye incertidumbre gris.

Cada celda es un botón con nombre accesible cultivo/mes/estado, operable con Tab y Enter. Abre un diálogo nativo con el motivo completo, fuente/periodo/fecha y aviso referencial. Se enfoca el título al abrir para que una explicación larga en celular comience por el principio; Escape cierra. El contexto mostrado y el filtro por altitud proceden de la respuesta del servidor.

Carga, error/reintento, advertencias, falta de datos, altitud desconocida y ausencia de cultivos compatibles tienen mensajes propios. No se genera una matriz de reemplazo ante error. Se conserva API central, TanStack Query y sesión. Las claves incluyen usuario, terreno, coordenadas, altitud, riego, área y escenario; respuestas tardías de una sesión cerrada o cambiada no se presentan.

## Resultados ejecutados

`npm.cmd run check` terminó con **código 0** el 8 de noviembre de 2026. Ejecutó lint, tipos, pruebas unitarias, PostgreSQL, build y E2E:

| Comprobación | Resultado real |
| --- | --- |
| `npm.cmd run lint` | Código 0, cero errores/advertencias ESLint |
| `npm.cmd run typecheck` | Código 0, herramientas/backend/frontend estrictos |
| `npm.cmd run test` | Backend **206/206**, frontend **63/63** |
| `npm.cmd run test:db` | PostgreSQL **108/108**, seis suites |
| `npm.cmd run build` | Ambos paquetes compilados; Prisma 7.10.1 |
| Playwright / Edge | **16/16**, ocho recorridos × escritorio/celular |
| **Total de check** | **393 aprobadas, ninguna fallida** |
| `calendario:verificar` | Código 0 con NASA real y catálogo SQL en solo lectura |

Se conservan las 333 pruebas anteriores y se añaden 60: 44 de motor/validación, 9 de interfaz, 5 SQL/HTTP y dos ejecuciones E2E. Cubren altitud inclusive/fuera/nula, riego, lluvia suficiente/insuficiente/faltante, riesgos alto/medio/bajo/desconocido, sensibilidad/tolerancia, año circular, ventanas de los diez cultivos, brócoli/vicia, NASA incompleta/códigos inválidos, escenarios extremos/cero, parámetros inválidos, determinismo, motivos, área sin fórmula inventada, autorización, no escritura de terreno y no contaminación de caché base.

E2E ejecuta backend, frontend y PostgreSQL reales con caché climática controlada. Comprueba 120 celdas realmente calculadas por la ruta, diez filas/doce meses, apertura y motivo idéntico al resultado API, navegación por teclado/Escape, desplazamiento hasta diciembre, documento sin desbordamiento, 401 sin sesión y rechazo de terreno ajeno. Después simula indisponibilidad para verificar ausencia de tabla. El catálogo temporal se inserta sin sobrescribir datos previos; se eliminan solo IDs propios/correos aleatorios y se restaura la entrada de caché anterior.

No hay dependencia de Internet en las pruebas nuevas habituales. La verificación real se ejecutó separadamente. Los recorridos previos de mapa/elevación mantienen sus integraciones existentes.

Capturas generadas y revisadas visualmente, ignoradas por Git; **son datos controlados de pruebas, no recomendaciones reales**:

- Matriz en escritorio (`../test-results/calendario-calendario-calc-65ed2--aislamiento-con-PostgreSQL-escritorio/calendario.png`, artefacto local no versionado).
- Matriz en celular (`../test-results/calendario-calendario-calc-65ed2--aislamiento-con-PostgreSQL-celular/calendario.png`, artefacto local no versionado).
- Explicación en escritorio (`../test-results/calendario-calendario-calc-65ed2--aislamiento-con-PostgreSQL-escritorio/explicacion.png`, artefacto local no versionado).
- Explicación en celular (`../test-results/calendario-calendario-calc-65ed2--aislamiento-con-PostgreSQL-celular/explicacion.png`, artefacto local no versionado).
- Indisponibilidad en escritorio (`../test-results/calendario-calendario-calc-65ed2--aislamiento-con-PostgreSQL-escritorio/calendario-no-disponible.png`, artefacto local no versionado).
- Indisponibilidad en celular (`../test-results/calendario-calendario-calc-65ed2--aislamiento-con-PostgreSQL-celular/calendario-no-disponible.png`, artefacto local no versionado).

## PostgreSQL, seguridad y Git

Ambas bases se comprobaron en solo lectura después de los tests:

| Base | Usuarios | Terrenos | Cultivos | Siembras | Plantillas | Clima/caché |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `rotaandes_dev` | 0 | 0 | 10 | 0 | 0 | 0 |
| `rotaandes_pruebas_36cbc85c` | 0 | 0 | 0 | 0 | 0 | 0 |

Prisma informa ambas actualizadas, sin migraciones pendientes. Se conserva únicamente `20261107000100_esquema_inicial`, aplicada. No quedan fixtures ni se crearon bases adicionales. Las pruebas SQL revertieron sus transacciones y las E2E limpiaron sus registros propios.

Los documentos protegidos conservan SHA-256 original y `backend/prisma/`/lockfile permanecen intactos. `main` continúa en `ee4f8c8542744ddecf64a5f2ab58d6993e6e3431`. Se revisan contenido y diff del índice, exclusiones y secretos antes del commit; `.env`, pgpass, claves privadas, dependencias, builds, cliente generado, capturas/resultados y temporales permanecen ignorados. No se instalan dependencias ni se cambian versiones.

El commit autorizado usa `Implementar calendario inteligente de siembra`; hash y estado limpio final se entregan en la conversación, evitando autorreferencia en el propio commit. No se hace push, merge ni despliegue.

## Archivos de la entrega

Nuevos (10):

- `backend/src/services/calendario.ts` y `backend/src/routes/calendario.ts`.
- `backend/scripts/verificarCalendario.ts`.
- `backend/tests/calendario.test.ts`, `backend/tests/fixtures/calendarioPruebas.ts` y `backend/tests/base-datos/calendario.integration.test.ts`.
- `frontend/src/components/CalendarioSiembra.tsx` y `frontend/src/components/CalendarioSiembra.test.tsx`.
- `tests/navegador/calendario.spec.ts`.
- `docs/INFORME_CALENDARIO_SIEMBRA.md`.

Modificados (7): `backend/package.json`, `backend/src/aplicacion.ts`, `frontend/src/lib/api.ts`, `frontend/src/types/api.ts`, `frontend/src/pages/DetalleTerreno.tsx`, `README.md` y `docs/DECISIONES.md`.

No quedan pruebas fallidas o errores críticos conocidos de esta fase. La validación agronómica local, la incertidumbre de clima/altitud/riego y los módulos posteriores permanecen pendientes; no se presenta el calendario como garantía ni se inicia otra fase.
