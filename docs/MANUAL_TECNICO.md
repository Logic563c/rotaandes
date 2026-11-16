# Manual técnico de RotaAndes

Para quien mantenga el sistema o deba explicar cómo está construido. El uso de la aplicación está en el [manual de usuario](GUIA_CLIENTE.md). La fuente de verdad del alcance, el modelo y el contrato es [`PROYECTO.md`](../PROYECTO.md), y las convenciones están en [`AGENTS.md`](../AGENTS.md).

Actualizado el **15-11-2026** para `calendario_ciclo_v4`. Versiones exactas de GitHub, Railway y Vercel, catálogo y evidencia de pruebas: [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los informes históricos describen su propia fase.

## 1. Qué es y cómo se desarrolló

RotaAndes es una plataforma web de apoyo a la siembra y la rotación de cultivos para Latacunga y Cotopaxi, creada para el reto «Cambio de rumbo» del NASA Space Apps Challenge 2026. Combina datos de la NASA (POWER, MODIS y SMAP), el pronóstico de Open-Meteo, un catálogo referencial de cultivos y las prioridades del agricultor.

**Forma de trabajo:**

- **Contrato primero.** La sección 8 de `PROYECTO.md` define la API. El frontend y el backend se desarrollaron contra ese contrato, y cada cambio de contrato actualiza `PROYECTO.md` en el mismo commit.
- **Por módulos, con revisión.** Cada etapa se implementó, se probó y se documentó en `docs/INFORME_*.md` antes de pasar a la siguiente: base, autenticación, terrenos y siembras, clima NASA, pronóstico, calendario, rotaciones, escenarios, capas satelitales, tendencias, panel técnico, PDF, experiencia del agricultor, pulido visual, gráficas y delimitación.
- **Reglas explicables, sin aprendizaje automático.** Los puntajes y el calendario son reglas con su motivo en texto, más fáciles de auditar y de defender (`PROYECTO.md` §3, «Fuera de alcance»).
- **Honestidad de los datos.** Nunca se inventan valores. Un dato ausente se muestra como «Sin dato» o «No determinado», y cada resultado indica su fuente.
- **Verificación continua.** `npm run check` reúne lint, TypeScript estricto, pruebas unitarias, PostgreSQL local aislado, build y Playwright en escritorio y celular. Escribe datos de prueba y aplica migraciones en la base aislada; no debe ejecutarse contra producción. Antes de cada commit debe pasar `npm run build`; las demás comprobaciones se ajustan al alcance. Las decisiones técnicas quedan en [`DECISIONES.md`](DECISIONES.md).

## 2. Arquitectura

```text
Navegador (React 19 + Vite 8 + TypeScript + Tailwind 4)  ──HTTPS/JSON──▶  API Express 5 (Node 24, TypeScript)
  · TanStack Query, React Router 7                                       · JWT propio (bcrypt + jsonwebtoken)
  · Leaflet / React Leaflet (mapas, delimitación)                        · Prisma 7 + PostgreSQL 18
  · Recharts (gráficas)                                                  · Proxy y caché: NASA POWER, Open-Meteo, NASA GIBS
  · Consume SOLO la API del backend                                      · Motores: calendario, rotaciones, escenarios, tendencias
                                                                         · PDF con PDFKit
Vercel (frontend estático)                                               Railway (backend + PostgreSQL)
```

El frontend consume los datos agrícolas y climáticos exclusivamente mediante la API del backend; las teselas del mapa base OpenStreetMap se cargan en el navegador con atribución (`PROYECTO.md` §4).

### Estructura del repositorio

| Ruta | Contenido |
| --- | --- |
| `frontend/src/pages/` | Pantallas: Inicio, Acceso, EspacioPersonal, Terrenos, DetalleTerreno, EditarTerreno, Perfil, PanelTecnico, Glosario, Fuentes |
| `frontend/src/components/` | Módulos del terreno (ClimaTerreno, PronosticoTerreno, TendenciaTerreno, CalendarioSiembra, ComparadorRotaciones, SimuladorEscenarios, VisorCapas, DelimitacionTerreno y EditorDelimitacion), gráficas (`Graficas*.tsx`, `AyudaGrafica.tsx`) y marco visual |
| `frontend/src/lib/` | `api.ts` (cliente único con validación zod), sesión, `graficas.ts` (resúmenes y colores), `geometria.ts` (validación y área en el navegador) |
| `backend/src/routes/` | Rutas HTTP por recurso |
| `backend/src/services/` | Lógica: `nasaPower`, `cuadriculaNasa`, `clima`, `tendencia`, `openMeteo`, `pronostico`, `calendario`, `motorRotacion`, `capasSatelitales`, `geometriaTerreno`, `reportes`, `pdfTerreno`, `autenticacion` |
| `backend/src/data/` | Catálogos referenciales y respaldos NASA verificados (SHA-256) |
| `backend/prisma/` | `schema.prisma` y migraciones |
| `tests/navegador/` | Pruebas Playwright de extremo a extremo |
| `scripts/` | Utilidades locales: base de pruebas, cuenta técnica, respaldo y restauración de prueba |

## 3. Modelo de datos

Hay seis tablas, con los mismos nombres que en `PROYECTO.md` §5: `usuarios`, `terrenos`, `cultivos`, `siembras`, `plantillas_rotacion` y `clima_cache`. Prisma usa modelos en PascalCase mapeados con `@@map`/`@map`.

**Migraciones** (no se editan las ya aplicadas):

1. `20261107000100_esquema_inicial`: las seis tablas, sus restricciones CHECK (rol, prioridades 1–5) y las claves foráneas, con CASCADE en terrenos y siembras.
2. `20261112000100_delimitacion_terreno`: `ALTER TABLE "terrenos" ADD COLUMN "poligono" JSONB;`. Es aditiva y anulable.
3. `20261115000100_catalogo_ampliado`: relaja NOT NULL en diez columnas de `cultivos` para conservar como `null` los parámetros sin fuente de la ampliación. No renombra tablas ni borra filas. El catálogo se carga mediante la semilla, no mediante el SQL de la migración.

Las **tres migraciones** están aplicadas en producción. Hay **29 cultivos y ocho plantillas**. No alterar archivos aplicados ni sus finales de línea: las huellas registradas se detallan en [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). La migración v4 no existe: v4 cambia reglas del motor, sin una cuarta migración.

**Seguridad de datos:**

- el agricultor solo accede a sus terrenos; el filtro se aplica en el servidor con el `usuario_id` del JWT;
- el técnico lee todo, pero no edita;
- `password_hash` nunca se publica;
- la clave primaria de `clima_cache` es la consulta normalizada (proveedor, versión, parámetros y coordenadas).

## 4. Cómo funciona cada módulo

| Módulo | Entrada | Proceso | Salida |
| --- | --- | --- | --- |
| **Autenticación** | correo y contraseña (mínimo 15 caracteres) | bcrypt (coste 12), JWT de 15 min, límite de intentos por IP | `{ token, usuario }` |
| **Terrenos** | punto, nombre, área, riego, suelo | altitud de Open-Meteo / Copernicus DEM 90 m al guardar | terreno con `altitud_m` |
| **Delimitación** | GeoJSON `Polygon` | validación geográfica y área esférica (ver §5) | `poligono` y `area_poligono_m2` |
| **Climatología** | lat, lon, altitud | NASA POWER *climatology* (comunidad AG), caché de 30 días y respaldo de la misma celda; lluvia = mm/día × días del mes; riesgo de helada según §7.1 | 12 meses con t_min, t_med, t_max, lluvia, humedad GWETROOT y riesgo |
| **Tendencias** | lat, lon | series mensual y diaria 2005–2024, años completos, pendiente por mínimos cuadrados y días con mínima ≤ 0 °C | serie anual, pendientes y cobertura |
| **Pronóstico** | lat, lon | Open-Meteo 7 días, caché de 30 min, alerta si la mínima es ≤ 2 °C | días y alertas |
| **Calendario** | climatología, altitud de celda/terreno, riego y catálogo | `calendario_ciclo_v4`, cinco criterios durante todo el ciclo (§7.2) | 348 celdas: 29 cultivos × 12 meses, resumen, motivo y fuentes |
| **Rotaciones** | historial, catálogo, plantillas y prioridades | índices de agua, suelo, riesgo e ingresos y total ponderado (§7.3) | actual y dos alternativas, con evidencia, riesgos y vacíos |
| **Escenarios** | `lluvia_pct` ±30, `temp_delta` ±2 | se aplican a la climatología antes del calendario y las rotaciones (§7.4) | diferencias frente al escenario base |
| **Capas** | tipo y mes | NASA GIBS WMS (MOD13Q1 NDVI y SPL3SMP_E), verificación y caché | imagen y metadatos con leyenda oficial |
| **PDF** | terreno | reúne los módulos en el escenario base (0 % / 0 °C), PDFKit, máximo 80 páginas y 4 MiB | informe A4 con motivos agrupados del calendario completo |

### Calendario, catálogo y riego

Los identificadores y nombres de los 29 cultivos están en [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md); los parámetros y fuentes se conservan en [perfilesAgronomicos.ts](../backend/src/data/perfilesAgronomicos.ts) y [catalogoCultivos.ts](../backend/src/data/catalogoCultivos.ts). Son diez cultivos originales y 19 incorporados; los índices sin fuente de estos últimos permanecen nulos. Los ciclos nuevos usan el máximo documentado y se convierten a meses; «ciclo corto» exige un máximo de 120 días. El mes de un cultivo de trasplante representa su establecimiento en el terreno, no la preparación del semillero.

Se evalúan época, altitud, temperatura media, heladas y agua durante todo el ciclo, cruzando diciembre→enero. La época y la altitud referenciales son informativas; no imponen un estado por sí solas. La media se estima con 6,9 °C/km desde la altitud de la celda NASA, y la mínima con 5,5 °C/km una sola vez, sin sumar el escalón regional de 3400 m de la vista Clima. Son estimaciones; las tolerancias a heladas tienen la fuente y las limitaciones de cada especie.

Con riego declarado, si la lluvia queda bajo el mínimo FAO del ciclo, o bajo el mínimo mensual del catálogo en algún mes cuando no hay necesidad por ciclo, el criterio de agua da precaución «depende del riego». Si cubre el mínimo del ciclo, se mantiene el criterio ordinario del riego, explicando que puede completar la diferencia hasta el máximo. Sin necesidad con fuente o sin lluvia, se conserva ese criterio ordinario y se declara lo desconocido; no se inventa dependencia. RotaAndes no conoce ni calcula caudales, volúmenes, turnos o disponibilidad real. Para berro falta confirmar agua permanente y limpia o suelo saturado, condición no recogida por `tiene_riego`.

Sin riego: lluvia bajo el mínimo FAO → exclusión; entre mínimo y máximo → precaución; sin necesidad por ciclo se compara el mínimo mensual disponible; sin parámetro → no determinado. El riego desconocido se conserva como incertidumbre cuando resulta necesario para decidir.

Precedencia final: `no_recomendado` si hay exclusión independiente; si no, `no_determinado` si falta información esencial o hay conflicto; si no, `posible_con_cuidado` (visible: **Posible con precaución**); si no, `recomendado`. Un riesgo de agua no obliga a amarillo cuando otro criterio requiere rojo o gris. `resumen` y `motivo` explican el resultado y «Qué puedes hacer»; el resumen mensual y la matriz leen la misma respuesta.

NASA POWER suministra el clima, **no recomendaciones agrícolas directas**. Estas reglas son de RotaAndes y no tienen validación agronómica local. El motor v1 se conserva en `calendarioV1.ts` como referencia de pruebas; no es el motor público.

### API y permisos

El contrato está en `PROYECTO.md` §8 y las rutas reales en `backend/src/routes/`. Solo salud, catálogo, registro y login son públicos; `/api/auth/yo` requiere Bearer. Los parámetros del escenario son opcionales (`lluvia_pct` −30..30 y `temp_delta` −2..2), finitos y validados; no se aceptan claves adicionales.

`/api/capas/:tipo?mes=` conserva un **503 explícito**: el GeoJSON analítico no está disponible. El visor usa `/api/capas-visuales/:tipo` y su subruta `/imagen`, con año 2023/2024, mes y fecha opcional. Las imágenes GIBS no son agregaciones mensuales ni valores numéricos por parcela.

**Disponibilidad de NASA POWER:** el cliente tiene tiempo de espera de 10 s, 2 intentos y una cola de 8 consultas.

- Una caché válida con elevación de celda se reutiliza hasta 30 días. Si le falta esa elevación, se intenta renovarla aunque no haya vencido.
- Si NASA falla, se elige entre el dato anterior coherente y el respaldo verificado de la misma celda, conservando fecha y origen. Un respaldo completo se prefiere a una caché sin elevación; entre datos comparables se considera la fecha. No se mezclan celdas ni se rejuvenecen datos cambiando solo el timestamp SQL.
- Si tampoco hay respaldo, se responde 503 con una explicación, sin inventar datos.

Ver [`DIAGNOSTICO_NASA_Y_RECUPERACION.md`](DIAGNOSTICO_NASA_Y_RECUPERACION.md).

## 5. Delimitación de parcelas (detalle)

- **Formato:** GeoJSON `Polygon`, WGS84, `[longitud, latitud]`, un contorno cerrado en sentido antihorario y 7 decimales.
- **Validación**, en `backend/src/services/geometriaTerreno.ts`, con su réplica en `frontend/src/lib/geometria.ts`:
  - de 3 a 100 vértices distintos;
  - sin cruces entre lados no consecutivos;
  - todos a 10 km o menos del punto del terreno;
  - superficie entre 10 m² y 10 000 ha.
- **Superficie:** A = |Σ (λᵢ₊₁ − λᵢ₋₁) · sin φᵢ| · R² / 2, con R = 6 378 137 m (Chamberlain y Duquette, 2007). El error del método es menor al 0,5 % en parcelas pequeñas; el error real lo domina el dibujo.
- **Rutas:** `PUT` y `DELETE /api/terrenos/:id/delimitacion`, solo para el agricultor propietario. El guardado está condicionado a que la ubicación del terreno no haya cambiado.
- **Editor:** propio, sobre Leaflet, sin dependencias nuevas. Admite clic, toque, arrastre, puntos intermedios «+», teclado («punto en el centro») y edición de coordenadas.

## 6. Interfaz y gráficas

- **Identidad visual:** paleta con tokens en `frontend/src/estilos.css` (`@theme`), iconos SVG propios y contraste ≥ 4,5:1 verificado.
- **Portada:** fotografía estática y paisaje decorativo compartido en páginas interiores, sin movimiento automático ni botón de pausa. WebP con tamaños adaptados; licencias CC BY 2.0 y CC BY-SA 4.0 y autores en [CREDITOS.md](../frontend/public/imagenes/CREDITOS.md). `prefers-reduced-motion` se conserva para las transiciones restantes.
- **Gráficas:** comparten el marco de `AyudaGrafica.tsx`: tipo de dato, fuente, ejes con unidades, leyenda, valor exacto al señalar, resumen y «¿Cómo interpretar esta gráfica?». Cada variable tiene un color fijo y las escalas son honestas.
- **Accesibilidad:** HTML semántico, etiquetas en todos los campos, navegación por teclado, `role="status"` y `aria-live`, objetivos táctiles de 44 px o más y diseño desde 320 px.

## 7. Pruebas

| Suite | Herramienta | Qué cubre |
| --- | --- | --- |
| Backend | Vitest | servicios, validaciones, motores, PDF, geometría |
| Frontend | Vitest + Testing Library | componentes, estados de carga, error y vacío, gráficas, editor |
| PostgreSQL | Vitest + base local aislada | rutas HTTP reales, permisos, transacciones con reversión, esquema exacto |
| Navegador | Playwright (Edge) | recorridos completos en escritorio y celular (320, 375 y 390 px), contraste, desbordamiento, títulos, PDF |

Ejecución completa en desarrollo: `npm.cmd run check`. En esta auditoría documental se aprobaron **479 unitarias del backend y 225 del frontend (704)**, compilación y lint. El último `check` completo respaldado por registros corresponde a `bf3ff2b`: **908 = 470 + 225 + 163 + 50**. No se atribuye ese total a v4 ni se suman pruebas de distintas revisiones. No se repitieron PostgreSQL ni E2E por la restricción de no modificar bases. Detalle y límites en [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md).

## 8. Configuración y despliegue

- **Variables del backend:** `DATABASE_URL`, `TEST_DATABASE_URL` (solo local), `JWT_SECRET`, `CORS_ORIGIN` y `PORT`. Del frontend: `VITE_API_URL`. Los archivos `.env` nunca se versionan; los ejemplos están en `.env.example`.
- **Instalación local:** [README.md](../README.md), desde la raíz, con `npm ci`, asistente PostgreSQL, preparación JWT, migraciones y ambas semillas locales. No hay cuentas demo generadas por la semilla actual.
- **Railway:** raíz del monorepo, instalación `npm ci --include=dev`, compilación `npm run build --workspace backend` y arranque `npm run start --workspace backend`. El predeploy `npm run produccion:preparar --workspace backend` aplica migraciones y carga/verifica catálogo y plantillas; modifica la base y no es un comando de auditoría.
- **Vercel:** raíz del monorepo, `npm ci --include=dev`, `npm run build:publicacion --workspace frontend`, salida `frontend/dist`, reescritura SPA en `vercel.json`.
- **Publicación:** las cargas de código se hacen desde una exportación limpia aprobada, verificando primero compatibilidad de esquema y respaldo. Los despliegues vigentes se identifican en [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Un cambio exclusivamente documental se envía a GitHub tras revisión, sin ejecutar despliegues ni predeploy. Git no está conectado a los servicios para despliegue automático.
- **Respaldo:** [`PROCEDIMIENTO_RESPALDO_PRODUCCION.md`](PROCEDIMIENTO_RESPALDO_PRODUCCION.md).

## 9. Paquetes de entrega

- **Código fuente:** ZIP generado con `git archive` desde un commit. Contiene solo archivos versionados: sin `.env`, sin `node_modules` y sin respaldos.
- **Base de datos de demostración histórica:** esquema `pg_dump`, migraciones Prisma y datos **ficticios**, con script de restauración y verificación. Su `LEEME.md` pertenece al ZIP externo, no al repositorio. El paquete del 12-11-2026 contenía diez cultivos y dos migraciones; no representa automáticamente el catálogo vigente. No se regeneró en esta auditoría.

## 10. Limitaciones conocidas

- El clima es regional (celdas de unos 50 km); no representa el microclima del lote.
- El catálogo de cultivos y los umbrales son referenciales y no tienen validación agronómica local.
- Declarar riego no confirma disponibilidad suficiente; faltan datos de variedades, suelo, plagas y manejo local. Los estados pueden repetirse todo el año por condiciones verificables; no se reparten colores artificialmente.
- Los índices de rotación son heurísticos: no son rendimientos ni ingresos.
- La superficie dibujada es aproximada y no es catastral. Cada terreno admite un solo contorno, sin huecos.
- El paquete principal de JavaScript supera los 500 kB; es un aviso de Vite que no bloquea.
