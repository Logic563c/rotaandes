# Manual técnico de RotaAndes

Para quien mantenga el sistema o deba explicar cómo está construido. El uso de la aplicación está en el [manual de usuario](GUIA_CLIENTE.md). La fuente de verdad del alcance, el modelo y el contrato es [`PROYECTO.md`](../PROYECTO.md), y las convenciones están en [`AGENTS.md`](../AGENTS.md).

## 1. Qué es y cómo se desarrolló

RotaAndes es una plataforma web de apoyo a la siembra y la rotación de cultivos para Latacunga y Cotopaxi, creada para el reto «Cambio de rumbo» del NASA Space Apps Challenge 2026. Combina datos de la NASA (POWER, MODIS y SMAP), el pronóstico de Open-Meteo, un catálogo referencial de cultivos y las prioridades del agricultor.

**Forma de trabajo:**

- **Contrato primero.** La sección 8 de `PROYECTO.md` define la API. El frontend y el backend se desarrollaron contra ese contrato, y cada cambio de contrato actualiza `PROYECTO.md` en el mismo commit.
- **Por módulos, con revisión.** Cada etapa se implementó, se probó y se documentó en `docs/INFORME_*.md` antes de pasar a la siguiente: base, autenticación, terrenos y siembras, clima NASA, pronóstico, calendario, rotaciones, escenarios, capas satelitales, tendencias, panel técnico, PDF, experiencia del agricultor, pulido visual, gráficas y delimitación.
- **Reglas explicables, sin aprendizaje automático.** Los puntajes y el calendario son reglas con su motivo en texto, más fáciles de auditar y de defender (`PROYECTO.md` §3, «Fuera de alcance»).
- **Honestidad de los datos.** Nunca se inventan valores. Un dato ausente se muestra como «Sin dato» o «No determinado», y cada resultado indica su fuente.
- **Verificación continua.** Antes de cada commit, `npm run check` ejecuta lint, TypeScript estricto, pruebas unitarias, pruebas con PostgreSQL, build y Playwright en escritorio y celular. Las decisiones técnicas quedan en [`DECISIONES.md`](DECISIONES.md).

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

El frontend nunca habla con la base de datos ni con proveedores externos (`PROYECTO.md` §4).

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
| **Calendario** | climatología y catálogo | regla §7.2 por cultivo y mes, con motivo en texto | 120 celdas |
| **Rotaciones** | historial, catálogo, plantillas y prioridades | índices de agua, suelo, riesgo e ingresos y total ponderado (§7.3) | actual y dos alternativas, con evidencia, riesgos y vacíos |
| **Escenarios** | `lluvia_pct` ±30, `temp_delta` ±2 | se aplican a la climatología antes del calendario y las rotaciones (§7.4) | diferencias frente al escenario base |
| **Capas** | tipo y mes | NASA GIBS WMS (MOD13Q1 NDVI y SPL3SMP_E), verificación y caché | imagen y metadatos con leyenda oficial |
| **PDF** | terreno | reúne todos los módulos en el escenario base, con PDFKit determinista, máximo 80 páginas y 4 MB | informe A4 |

**Disponibilidad de NASA POWER:** el cliente tiene tiempo de espera de 10 s, 2 intentos y una cola de 8 consultas.

- Si NASA falla, se usa la caché aunque esté vencida (marcada como «desactualizada»).
- Si no hay caché, se usa el respaldo verificado de la misma celda MERRA-2 (0,5° × 0,625°).
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
- **Portada:** el fondo animado es CSS original (nubes, surcos y el paisaje SVG); solo anima transformaciones y opacidad. Tiene un botón de pausa, que se recuerda en `localStorage`, y se desactiva con `prefers-reduced-motion`. Las fotos de la portada son de Wikimedia Commons con licencia CC BY-SA 4.0 verificada, en WebP de 14–44 KB y con carga diferida (`frontend/public/imagenes/CREDITOS.md`).
- **Gráficas:** comparten el marco de `AyudaGrafica.tsx`: tipo de dato, fuente, ejes con unidades, leyenda, valor exacto al señalar, resumen y «¿Cómo interpretar esta gráfica?». Cada variable tiene un color fijo y las escalas son honestas.
- **Accesibilidad:** HTML semántico, etiquetas en todos los campos, navegación por teclado, `role="status"` y `aria-live`, objetivos táctiles de 44 px o más y diseño desde 320 px.

## 7. Pruebas

| Suite | Herramienta | Qué cubre |
| --- | --- | --- |
| Backend | Vitest | servicios, validaciones, motores, PDF, geometría |
| Frontend | Vitest + Testing Library | componentes, estados de carga, error y vacío, gráficas, editor |
| PostgreSQL | Vitest + base local aislada | rutas HTTP reales, permisos, transacciones con reversión, esquema exacto |
| Navegador | Playwright (Edge) | recorridos completos en escritorio y celular (320, 375 y 390 px), contraste, desbordamiento, títulos, PDF |

Ejecución completa: `npm.cmd run check`. El número actual de pruebas está en el informe de la fase vigente.

## 8. Configuración y despliegue

- **Variables del backend:** `DATABASE_URL`, `TEST_DATABASE_URL` (solo local), `JWT_SECRET`, `CORS_ORIGIN` y `PORT`. Del frontend: `VITE_API_URL`. Los archivos `.env` nunca se versionan; los ejemplos están en `.env.example`.
- **Railway:** `npm ci && npx prisma generate && npm run build`. El pre-deploy ejecuta `prisma migrate deploy` y verifica el catálogo.
- **Vercel:** raíz `frontend/`, con reescritura SPA en `vercel.json`.
- **Procedimiento de publicación:** exportación limpia del commit (`git archive`), `railway up`, comprobación de `/api/health`, despliegue en Vercel sin dominio y promoción.
- **Respaldo:** [`PROCEDIMIENTO_RESPALDO_PRODUCCION.md`](PROCEDIMIENTO_RESPALDO_PRODUCCION.md).

## 9. Paquetes de entrega

- **Código fuente:** ZIP generado con `git archive` desde un commit. Contiene solo archivos versionados: sin `.env`, sin `node_modules` y sin respaldos.
- **Base de datos de demostración:** esquema `pg_dump`, migraciones Prisma y datos **ficticios**, con script de restauración y verificación. Ver el `LEEME.md` del paquete.

## 10. Limitaciones conocidas

- El clima es regional (celdas de unos 50 km); no representa el microclima del lote.
- El catálogo de cultivos y los umbrales son referenciales y no tienen validación agronómica local.
- Los índices de rotación son heurísticos: no son rendimientos ni ingresos.
- La superficie dibujada es aproximada y no es catastral. Cada terreno admite un solo contorno, sin huecos.
- El paquete principal de JavaScript supera los 500 kB; es un aviso de Vite que no bloquea.
