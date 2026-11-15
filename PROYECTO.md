# RotaAndes: plataforma de apoyo a la siembra y rotación de cultivos (Cotopaxi)

> **Documento base del proyecto.** Es la fuente de verdad para el equipo de desarrollo y para los agentes de IA (Claude Code / Codex).
> Si eres un agente de IA: lee este archivo completo antes de escribir código y respeta el alcance, el stack, el modelo de datos y el contrato de la API definidos aquí. Si algo no está definido, elige la opción más simple y anótala en `docs/DECISIONES.md`.
>
> *"RotaAndes" es un nombre provisional. Se puede cambiar si el equipo de Nicole define otro.*

---

## 0. Resumen rápido (léelo primero)

- **Qué hacemos:** una plataforma web donde agricultores de Latacunga / Cotopaxi se registran, marcan su terreno en un mapa y ven **el clima de su zona con datos de la NASA**, **cuándo conviene sembrar cada cultivo**, **una comparación de 3 rotaciones de cultivo** (la actual + 2 sugeridas), **capas satelitales de vegetación y humedad del suelo**, **escenarios de cambio climático**, un **panel para técnicos** y **reportes en PDF**.
- **Para quién:** el equipo de Nicole, en el NASA Space Apps Challenge 2026.
- **Entregable completo:** **domingo 8 de noviembre** (como máximo). Lunes y martes son para pulir y ajustar. La presentación es el miércoles 11.
- **Stack:** React + Vite + TypeScript (**Vercel**) · Node + Express + TypeScript + PostgreSQL (**Railway**).
- **Meta:** que sea el mejor entregable posible. Todas las funcionalidades de la sección 3 son parte del proyecto.

---

## 1. Contexto

- **Evento:** NASA Space Apps Challenge 2026.
- **Reto:** *"Cambio de rumbo: Adaptación de las explotaciones agrícolas con datos de la NASA"*. Hay que crear una herramienta de apoyo a la toma de decisiones que use observaciones de la Tierra de la NASA, junto con información local de suelo, cultivos y prioridades del agricultor, para explorar estrategias de rotación de cultivos que mejoren la salud del suelo y la resiliencia frente al clima.
- **Cliente:** equipo de Nicole (6 personas, aeronáutica). Ellos hacen la investigación y la presentación; nosotros hacemos todo el software.
- **Zona:** cantón Latacunga y zonas agrícolas altas / páramos de la provincia de Cotopaxi, Ecuador (aprox. 2.700–3.800 m s. n. m.).

### Requisitos que pidió el cliente
1. Plataforma web **con registro de usuarios** (agricultores).
2. **Interactiva** para el agricultor.
3. Que el agricultor **vea el clima** de su zona.
4. Que vea **cuándo es apropiado sembrar**.
5. Enfocada en **Latacunga / Cotopaxi / páramos**.

### Requisitos del reto que debemos cubrir
- Usar **datos de la NASA**: NASA POWER, MODIS (NDVI) y SMAP (humedad del suelo).
- **Comparar al menos 3 estrategias de rotación, incluida la actual.**
- Para cada estrategia: **por qué se sugiere, evidencia, beneficios, vacíos de información y riesgos**.
- Ser entendible para agricultores sin conocimientos técnicos.
- Dejar claro que **no reemplaza el criterio del agricultor ni del técnico agrícola**.

---

## 2. Qué es la plataforma (en una frase)

Una web donde el agricultor se registra, marca su terreno en un mapa, registra lo que siembra y recibe: (a) el clima histórico y el pronóstico de su zona, (b) un calendario que indica qué meses conviene sembrar cada cultivo, (c) una comparación de 3 rotaciones con puntajes y explicaciones, y (d) mapas satelitales de su zona. Los técnicos agrícolas tienen un panel para ver todos los terrenos.

### Ejemplo de uso (historia de la demo)
1. Don Luis, agricultor de Pujilí, crea su cuenta.
2. Marca su lote en el mapa. La app detecta que está a 3.150 m.
3. Registra que en 2024 y 2025 sembró papa.
4. Elige su prioridad: **ahorrar agua**.
5. Ve que en su zona **julio y agosto** tienen riesgo alto de helada y poca lluvia (datos NASA POWER).
6. Activa la capa de **NDVI (MODIS)** y ve que la vegetación de su zona se estresa en la época seca.
7. En el calendario ve que la **haba** conviene sembrarla entre octubre y diciembre.
8. Ve 3 rotaciones:
   - **Actual:** papa → papa → papa. Puntaje de suelo bajo, porque repetir la misma familia mantiene plagas y agota nutrientes.
   - **Opción A:** papa → haba → cebada. La haba fija nitrógeno y la cebada protege contra la erosión.
   - **Opción B:** papa → chocho → quinua. Es la opción con menor consumo de agua y mayor tolerancia a sequía y helada.
9. Mueve el deslizador a **"20 % menos lluvia"** y ve cómo cambian el calendario y los puntajes.
10. Descarga su **reporte en PDF**.
11. Un técnico del MAG entra al **panel de técnico** y ve en un mapa todos los terrenos y alertas de la zona.

---

## 3. Alcance (todo esto se entrega)

### Fase 1: núcleo (listo el sábado 7)
- [ ] Registro, login y logout (email + contraseña, JWT).
- [ ] Perfil del agricultor: nombre, parroquia, teléfono (opcional), prioridades (agua, suelo, ingresos).
- [ ] CRUD de **terrenos**: punto en el mapa (Leaflet + OpenStreetMap), nombre, área en hectáreas, riego (sí/no), tipo de suelo y altitud automática.
- [ ] CRUD de **siembras** por terreno (historial).
- [ ] **Clima histórico** del terreno con NASA POWER (lluvia, temperatura máxima, mínima y media, humedad del suelo, riesgo de helada), con gráficas.
- [ ] **Pronóstico de 7 días** (Open-Meteo) con **alerta de helada** si la temperatura mínima es ≤ 2 °C.
- [ ] **Calendario de siembra**: matriz cultivo × mes con colores verde / amarillo / rojo y el motivo de cada celda.

### Fase 2: avanzado (listo el domingo 8)
- [ ] **Comparador de rotaciones**: 3 estrategias (actual + 2 sugeridas) con puntajes, por qué, evidencia, beneficios, vacíos, riesgos y aviso.
- [ ] **Tendencia climática** 2005–2024: ¿llueve menos? ¿hay más heladas?
- [ ] **Capas satelitales en el mapa:** NDVI (MODIS) y humedad del suelo (SMAP) de Cotopaxi, con selector de mes.
- [ ] **Simulador de escenarios:** deslizadores de lluvia (−30 % a +30 %) y temperatura (−2 °C a +2 °C) que recalculan calendario y rotaciones.
- [ ] **Panel de técnico** (rol `tecnico`): mapa con todos los terrenos, filtro por parroquia y cultivo, y lista de terrenos con alerta de helada.
- [ ] **Reporte PDF** del terreno: clima, calendario y rotaciones.
- [ ] **Landing pública**, **Glosario** (evapotranspiración, humedad del suelo, NDVI, helada, rotación, fijación de nitrógeno) y página **Acerca de / Datos**.
- [ ] Interfaz en **español**, **responsive** (que funcione bien en celular).
- [ ] Desplegado en Vercel + Railway, con una cuenta demo precargada.

### Fase 3: pulido (lunes 9 y martes 10)
- Correcciones a partir de la revisión interna y del equipo de Nicole.
- Ajuste de los datos de cultivos validados por el equipo de Nicole.
- Pruebas en celular, rendimiento, textos y guion de la demo.
- [x] **Delimitación opcional de la zona de cultivo** en el mapa (polígono con superficie aproximada), solicitada por el cliente el 12 de noviembre (ver 7.5).

### Fuera de alcance
- App móvil nativa.
- Modelos de machine learning entrenados. Usamos **reglas + puntajes explicables**, que además son más fáciles de defender frente al jurado.
- Precios de mercado en tiempo real.

---

## 4. Arquitectura y stack

```
[Navegador]
   │
   ├── Frontend: React + Vite + TypeScript + TailwindCSS          → Vercel
   │      - React Router, TanStack Query (llamadas a la API)
   │      - Leaflet + OpenStreetMap (mapa y capas satelitales)
   │      - Recharts (gráficas)
   │      - Consume SOLO la API del backend (sección 8)
   │
   └── Backend: Node.js + Express + TypeScript                    → Railway
          - Auth propia: bcrypt + JWT
          - Prisma ORM sobre PostgreSQL (Railway)
          - Proxy y caché de NASA POWER y Open-Meteo
          - Lógica: calendario, rotaciones y escenarios
          - Generación de PDF (pdfkit o puppeteer)
          - Sirve las capas NDVI/SMAP precargadas (GeoJSON)

   PostgreSQL                                                      → Railway
```

**Criterio:** el frontend **nunca** habla con la base de datos ni con APIs externas directamente; todo pasa por el backend. Así el frontend se enfoca solo en la interfaz y el backend concentra los datos y la lógica.

### Estructura del repositorio (monorepo)
```
rotaandes/
├── PROYECTO.md
├── docs/
│   ├── DECISIONES.md
│   └── DEMO.md
├── frontend/
│   ├── src/
│   │   ├── pages/        (Landing, Login, Registro, Onboarding, Dashboard, Terreno, Tecnico, Glosario, AcercaDe)
│   │   ├── components/
│   │   ├── lib/api.ts    (cliente de la API con el token JWT)
│   │   ├── mocks/        (respuestas de ejemplo con el formato de la sección 8)
│   │   └── types/        (tipos compartidos con el contrato de la API)
│   └── .env.example      (VITE_API_URL)
└── backend/
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.ts       (cultivos, plantillas, usuarios demo)
    ├── src/
    │   ├── index.ts
    │   ├── routes/       (auth, perfil, terrenos, siembras, clima, calendario, rotaciones, capas, reportes, tecnico)
    │   ├── services/     (nasaPower, openMeteo, calendario, motorRotacion, escenarios, pdf)
    │   ├── middleware/   (auth, rol, errores)
    │   └── data/         (respaldo de clima y capas GeoJSON de NDVI/SMAP)
    └── .env.example      (DATABASE_URL, JWT_SECRET, CORS_ORIGIN, PORT)
```

---

## 5. Modelo de datos (PostgreSQL)

> Referencia en SQL. Implementarlo en `schema.prisma` con los mismos nombres de tablas y columnas.

```sql
create table usuarios (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  rol text not null default 'agricultor' check (rol in ('agricultor','tecnico')),
  nombre text not null,
  parroquia text,
  telefono text,
  prioridad_agua smallint default 3 check (prioridad_agua between 1 and 5),
  prioridad_suelo smallint default 3 check (prioridad_suelo between 1 and 5),
  prioridad_ingresos smallint default 3 check (prioridad_ingresos between 1 and 5),
  creado_en timestamptz default now()
);

create table terrenos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuarios(id) on delete cascade,
  nombre text not null,
  latitud double precision not null,
  longitud double precision not null,
  altitud_m integer,
  area_ha numeric(8,2),
  tiene_riego boolean default false,
  tipo_suelo text,                  -- 'franco', 'arenoso', 'arcilloso', 'no_se'
  creado_en timestamptz default now(),
  poligono jsonb                    -- opcional: zona de cultivo, GeoJSON Polygon WGS84 [longitud, latitud] (ver docs/DECISIONES.md)
);

create table cultivos (              -- catálogo (seed)
  id text primary key,
  nombre text not null,
  familia text not null,
  altitud_min integer,                     -- null: sin rango documentado (migración 20261115000100_catalogo_ampliado)
  altitud_max integer,
  ciclo_meses smallint not null,
  meses_siembra smallint[] not null,       -- vacío: sin época documentada
  lluvia_min_mensual_mm integer,           -- los valores sin fuente se guardan como null ("no determinado")
  demanda_agua smallint,                   -- 1..5
  tolerancia_helada smallint,              -- 1..5
  tolerancia_sequia smallint,              -- 1..5
  fija_nitrogeno boolean not null default false,
  aporte_materia_organica smallint,
  proteccion_erosion smallint,
  valor_forraje smallint,
  valor_mercado smallint,
  descripcion text
);

create table siembras (
  id uuid primary key default gen_random_uuid(),
  terreno_id uuid not null references terrenos(id) on delete cascade,
  cultivo_id text not null references cultivos(id),
  fecha_siembra date not null,
  fecha_cosecha date,
  notas text,
  creado_en timestamptz default now()
);

create table plantillas_rotacion (
  id text primary key,
  nombre text not null,
  secuencia text[] not null,
  descripcion text
);

create table clima_cache (
  clave text primary key,            -- ej. 'power_clim_-0.93_-78.62'
  datos jsonb not null,
  actualizado_en timestamptz default now()
);
```

**Seguridad:** el backend siempre filtra por el `usuario_id` del token. Un agricultor solo ve sus terrenos; el rol `tecnico` puede leer todos los terrenos, pero no editarlos.

---

## 6. Fuentes de datos externas (todas gratis)

> **Verificar cada endpoint con `curl` antes de programar sobre él.** Si algún parámetro no responde, revisar la documentación oficial y anotar el cambio en `docs/DECISIONES.md`.

### 6.1 NASA POWER (sin API key)
Documentación: https://power.larc.nasa.gov/docs/

```
# Climatología mensual (promedio de largo plazo)
GET https://power.larc.nasa.gov/api/temporal/climatology/point
    ?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,GWETTOP,GWETROOT,ALLSKY_SFC_SW_DWN
    &community=AG&latitude=-0.93&longitude=-78.62&format=JSON

# Serie mensual por años (tendencias)
GET https://power.larc.nasa.gov/api/temporal/monthly/point
    ?parameters=T2M_MIN,PRECTOTCORR,GWETTOP
    &community=AG&latitude=-0.93&longitude=-78.62&start=2005&end=2024&format=JSON

# Diaria (conteo de días con helada)
GET https://power.larc.nasa.gov/api/temporal/daily/point
    ?parameters=T2M_MIN&community=AG&latitude=-0.93&longitude=-78.62
    &start=20150101&end=20241231&format=JSON
```

| Parámetro | Significado | Uso |
|---|---|---|
| `T2M`, `T2M_MAX`, `T2M_MIN` | Temperatura a 2 m (°C) | Gráficas y helada |
| `PRECTOTCORR` | Precipitación (mm/día) | Lluvia mensual = valor × días del mes |
| `RH2M` | Humedad relativa (%) | Informativo |
| `GWETTOP` / `GWETROOT` | Humedad del suelo superficial / zona de raíces (0–1) | Estrés hídrico |
| `ALLSKY_SFC_SW_DWN` | Radiación solar | Informativo |

- **Caché** en `clima_cache` por 30 días. Si una entrada anterior no contiene la altitud de la celda NASA, se intenta renovarla aunque siga vigente. Si NASA falla, se prefiere un respaldo completo y verificado de la misma celda; se conserva su fecha y procedencia. Sin ese metadato no se inventa una temperatura del terreno.
- **Limitación (mostrarla en la UI):** resolución de ~0,5° (unos 50 km). Representa la zona, no el microclima del lote.
- **Respaldo:** JSON precargado en `backend/src/data/` para Latacunga, Pujilí, Saquisilí, Salcedo y una zona de páramo, por si la API falla durante la demo.

### 6.2 Open-Meteo (pronóstico y altitud, sin API key)
No es de la NASA; se usa porque NASA POWER no da pronóstico.
```
GET https://api.open-meteo.com/v1/forecast?latitude=-0.93&longitude=-78.62
    &daily=temperature_2m_max,temperature_2m_min,precipitation_sum
    &timezone=America/Guayaquil&forecast_days=7
GET https://api.open-meteo.com/v1/elevation?latitude=-0.93&longitude=-78.62
```

### 6.3 MODIS NDVI y SMAP (capas satelitales)
- Fuente: **NASA AppEEARS** (https://appeears.earthdatacloud.nasa.gov/), con cuenta gratuita de Earthdata.
- Productos sugeridos: **MOD13Q1** (NDVI a 250 m, cada 16 días) y **SPL3SMP_E** (humedad del suelo SMAP a 9 km).
- Proceso (el sábado): descargar **una vez** el recorte de Cotopaxi de 2023–2024, promediar por mes, convertir a una grilla GeoJSON simplificada y guardarla en `backend/src/data/capas/`.
- El backend sirve esas capas; el frontend las pinta en Leaflet con una leyenda de colores.
- Mientras tanto, el frontend trabaja con un GeoJSON de ejemplo con el mismo formato.

---

## 7. Lógica de negocio

### 7.1 Riesgo de helada mensual
- `T2M_MIN` ≤ 2 °C → **alto** · 2–5 °C → **medio** · > 5 °C → **bajo**.
- Si `altitud_m` ≥ 3.400, se sube un nivel (el dato NASA promedia zonas más bajas).
- Este es el indicador **regional de la vista Clima**. El calendario usa la mínima estimada a la altitud del terreno, según 7.2; no acumula ambas correcciones. Ninguno representa heladas observadas ni sustituye el pronóstico.

### 7.2 Calendario de siembra (cultivo × mes) — versión `calendario_ciclo_v3` (15-11-2026)
Para cada cultivo del catálogo y cada mes `m` de siembra o trasplante se evalúan **todos los meses del ciclo** (`ciclo_meses` desde `m`, cruzando el año) con cinco criterios, cada uno con su fuente (detalle en `backend/src/data/perfilesAgronomicos.ts` y `docs/INFORME_CALENDARIO_AGRONOMICO.md`):
1. **Época:** `meses_siembra` del catálogo (referencial). La pertenencia o no a una ventana sin validación local se informa, sin atribuir por sí sola un riesgo climático. INIAP (2011) indica que las hortalizas pueden sembrarse todo el año; eso no documenta su resistencia a heladas.
2. **Altitud:** informar el rango del catálogo o documentado y si el terreno está fuera; evaluar la temperatura estimada antes de atribuir incompatibilidad. Sin altitud del terreno → no determinado.
3. **Temperatura media del ciclo** (FAO EcoCrop), estimada desde la altitud de la celda NASA con 6,9 °C/km (Córdova et al., 2016). Fuera del rango de crecimiento → no recomendado; si un rango local lo admite → no determinado por conflicto de fuentes. Sin altitud de celda → no determinado, en vez de una precaución permanente.
4. **Heladas:** mínima promedio NASA ajustada **una sola vez** a la altitud del terreno (5,5 °C/km). Aplicar los umbrales ≤2 °C alto, 2–5 °C medio y >5 °C bajo a esa estimación, sin sumar el escalón regional de 3400 m. Tolerancias originales 1–5: conservar reglas de sensibilidad del catálogo. Para la ampliación: fuente por especie (Iowa State University, heladas leves en campo; FAO 2005, capítulo 4). Tolerancia leve documentada: alto → precaución, medio → informativo. Lechuga sensible cerca de 0 °C: alto → no recomendado, medio → precaución. Sin fuente: medio o alto → no determinado. Falta de dato climático en cualquier mes → no determinado, incluso si el cultivo se considera tolerante. No extrapolar inmunidad a heladas fuertes ni usar temperaturas de almacenamiento como límites del cultivo vivo.
5. **Agua:** con riego se cumple el criterio ordinario (sin calcular caudal ni volumen). Sin riego: necesidad FAO (1986, Tabla 14) frente a la lluvia del ciclo (bajo el mínimo → no recomendado; entre mínimo y máximo → precaución); si no hay, `lluvia_min_mensual_mm` mes a mes (precaución); si no hay ninguna → no determinado. Para berro, el dato de riego no confirma ni descarta agua permanente o suelo saturado y agua limpia: no determinado hasta confirmar esa condición, que el modelo actual no recoge.

Estado: 🔴 **No recomendado** si un criterio excluye; si no, ⚪ **No determinado** si falta un dato o una fuente; si no, 🟡 **Posible con precaución** si hay un riesgo manejable; si no, 🟢 **Recomendado**. Un dato ausente nunca se convierte en favorable ni en desfavorable.

Cada celda incluye `resumen` (una frase) y `motivo` (criterios con datos y fuentes). NASA aporta el clima; la recomendación es una regla de RotaAndes, referencial y pendiente de validación local. El motor anterior se conserva en `calendarioV1.ts` solo para comparar.

Se mantienen los ciclos máximos documentados y los 29 cultivos; no se acorta un ciclo ni se reparten colores para forzar diferencias mensuales. La interfaz explica en conjunto los motivos que se repiten durante todo el año, conservando cada casilla y sus acciones. Diagnóstico y comparación: `docs/INFORME_CORRECCION_CALENDARIO_RIESGOS.md`.

### 7.3 Motor de rotaciones (explicable)
**Estrategias:**
1. **Actual:** las últimas 3 siembras del historial (si hay menos, se repite el último cultivo).
2. **Dos sugeridas:** las 2 plantillas con mayor puntaje total entre las aptas por altitud.

**Puntajes (0–100):**
- **Agua:** demanda de agua promedio y tolerancia a sequía, frente a la lluvia de la zona y al riego.
- **Suelo:** suma puntos por leguminosas, materia orgánica y protección contra erosión; **resta** si dos cultivos consecutivos son de la **misma familia**.
- **Riesgo climático:** tolerancia a helada y sequía frente al riesgo de la zona.
- **Ingresos:** promedio de `valor_mercado`, marcado como **"estimación, validar localmente"**.
- **Total:** promedio ponderado con las prioridades del usuario.

**Formato de cada estrategia:**
```json
{
  "id": "papa-haba-cebada",
  "nombre": "Papa → Haba → Cebada",
  "es_actual": false,
  "puntajes": { "agua": 72, "suelo": 85, "riesgo": 68, "ingresos": 60, "total": 74 },
  "por_que": "Alterna familias distintas e incluye una leguminosa después de la papa.",
  "evidencia": [
    "NASA POWER: lluvia promedio de oct–dic en su zona = 95 mm/mes",
    "NASA POWER: temperatura mínima de julio = 1,8 °C (riesgo de helada alto)"
  ],
  "beneficios": ["La haba fija nitrógeno", "Rompe el ciclo de plagas de la papa", "La cebada cubre el suelo"],
  "vacios_informacion": ["No hay análisis de suelo del lote", "El dato climático es regional (~50 km)"],
  "riesgos": ["La haba es sensible a la sequía en floración"],
  "aviso": "Esta es una sugerencia. Confírmela con un técnico agrícola o con su experiencia local."
}
```

### 7.4 Simulador de escenarios
Parámetros `lluvia_pct` (−30 a +30) y `temp_delta` (−2 a +2 °C). Se aplican a la climatología antes de calcular el calendario y las rotaciones:
- `lluvia_mm × (1 + lluvia_pct/100)`
- `t_min + temp_delta`, `t_max + temp_delta`

La respuesta incluye las diferencias frente al escenario base, por ejemplo: *"Con 20 % menos lluvia, la papa deja de ser recomendada en noviembre."*

### 7.5 Delimitación de la zona de cultivo (opcional)
- El agricultor propietario puede dibujar un polígono sobre el mapa. Se guarda en `terrenos.poligono` como GeoJSON `Polygon` (WGS84, `[longitud, latitud]`, un solo contorno cerrado).
- Validación en el backend: 3 a 100 vértices distintos, sin autointersecciones, todos a 10 km o menos del punto del terreno, y superficie entre 10 m² y 10 000 ha.
- `area_poligono_m2` es la superficie geodésica aproximada (Chamberlain y Duquette, 2007). **No reemplaza** `area_ha`, que sigue siendo el área declarada. No es una medición catastral.
- No cambia el clima, el calendario ni las rotaciones, que se siguen calculando con el punto del terreno. El dato NASA POWER es regional y no describe el interior del polígono.
- El rol `tecnico` puede verla pero no modificarla. Detalles en `docs/INFORME_GRAFICAS_Y_DELIMITACION.md`.

---

## 8. API del backend (contrato entre frontend y backend)

- Base: `/api`. Todas las rutas usan `Authorization: Bearer <jwt>`, salvo `/api/health`, `/api/auth/*` y `/api/cultivos`.
- Errores: `{ "error": "mensaje" }` con el código HTTP correcto (400, 401, 403, 404, 500).
- **El backend publica este contrato funcionando el viernes en la noche.** Hasta entonces, el frontend usa los mocks de `frontend/src/mocks/` con exactamente este formato.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | `{ ok: true }` |
| POST | `/api/auth/registro` | `{ email, password, nombre, parroquia? }` → `{ token, usuario }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, usuario }` |
| GET | `/api/auth/yo` | Usuario actual |
| PUT | `/api/perfil` | Actualiza nombre, parroquia, teléfono y prioridades |
| GET | `/api/cultivos` | Catálogo de cultivos (incluye `nombre_cientifico`, `categoria` y `categoria_nombre`; los valores sin fuente son `null`) |
| GET / POST | `/api/terrenos` | Listar / crear (calcula `altitud_m` automáticamente) |
| GET / PUT / DELETE | `/api/terrenos/:id` | Detalle / editar / borrar. Las respuestas de terreno incluyen `poligono` (GeoJSON o `null`) y `area_poligono_m2` (derivado, solo lectura) |
| PUT / DELETE | `/api/terrenos/:id/delimitacion` | Solo el agricultor propietario: guarda `{ poligono }` (GeoJSON Polygon validado) / elimina la delimitación |
| GET / POST | `/api/terrenos/:id/siembras` | Historial / agregar siembra |
| PUT / DELETE | `/api/siembras/:id` | Editar / borrar |
| GET | `/api/terrenos/:id/clima` | Climatología mensual: `[{ mes, t_min, t_max, t_med, lluvia_mm, humedad_suelo, riesgo_helada }]`, `fuente`, `resolucion` |
| GET | `/api/terrenos/:id/tendencia` | Serie 2005–2024 de lluvia anual, temperatura mínima y días de helada |
| GET | `/api/terrenos/:id/pronostico` | 7 días + `alertas: [{ fecha, tipo, mensaje }]` |
| GET | `/api/terrenos/:id/calendario?lluvia_pct=&temp_delta=` | `{ celdas: [{ cultivo_id, mes, estado, resumen, motivo }], cultivos: [{ id, nombre, nombre_cientifico, categoria, categoria_nombre, es_hortaliza, ciclo_dias_min, ciclo_dias_max, ciclo_meses_evaluados, ciclo_corto, establecimiento, cosecha, fuentes, … }], categorias, version }` |
| GET | `/api/terrenos/:id/rotaciones?lluvia_pct=&temp_delta=` | `{ estrategias: [actual, sugerida1, sugerida2], cambios_vs_base? }` |
| GET | `/api/terrenos/:id/reporte.pdf` | PDF del terreno |
| GET | `/api/capas/:tipo?mes=` | `tipo` = `ndvi` \| `humedad_suelo` → GeoJSON + leyenda |
| GET | `/api/tecnico/terrenos?parroquia=&cultivo=` | Solo rol `tecnico`: todos los terrenos con su última siembra y su alerta |

---

## 9. Pantallas

1. **Landing (pública):** qué es, qué problema resuelve, datos NASA usados y botón "Registrarme".
2. **Registro / Login.**
3. **Onboarding de prioridades:** 3 deslizadores con íconos (agua, suelo, ingresos).
4. **Dashboard:** mapa con mis terrenos, alertas de helada de los próximos días y accesos rápidos.
5. **Nuevo / editar terreno:** clic en el mapa → altitud automática → formulario.
6. **Detalle del terreno**, con pestañas:
   - **Clima:** barras de lluvia por mes, líneas de temperatura mínima y máxima, meses con helada resaltados, pronóstico de 7 días y nota de resolución.
   - **Tendencia:** gráfica 2005–2024.
   - **Mapa satelital:** capas NDVI / humedad del suelo con selector de mes y leyenda.
   - **Mis siembras:** historial y formulario.
   - **Calendario:** matriz de colores; al tocar una celda se ve el motivo.
   - **Rotaciones:** 3 tarjetas (apiladas en celular) con barras de puntaje y todas las secciones del reto.
   - **Escenarios:** deslizadores de lluvia y temperatura que actualizan calendario y rotaciones en vivo.
   - **Zona de cultivo:** dibujar, editar, guardar o eliminar la delimitación del terreno, con su superficie aproximada (opcional).
   - Botón **"Descargar reporte PDF"**.
7. **Panel de técnico:** mapa con todos los terrenos, filtros y tabla de alertas.
8. **Glosario.**
9. **Acerca de / Datos:** fuentes (NASA POWER, MODIS, SMAP, Open-Meteo, OpenStreetMap), limitaciones y créditos del equipo.

**Lineamientos de UI:** paleta tierra y verde, letra grande, íconos (gota = agua, hoja = suelo, copo = helada, moneda = ingresos), botones grandes para celular y estados de carga y de error en cada llamada a la API. Siempre mostrar la **fuente del dato** y el **aviso**.

---

## 10. Datos semilla: cultivos de Cotopaxi

> ⚠️ **Valores aproximados. El equipo de Nicole debe validarlos** (MAG / INIAP / técnico agrícola). En la UI se muestran como "referenciales".

| id | nombre | familia | alt. mín–máx (m) | ciclo (meses) | meses siembra | lluvia mín. (mm/mes) | agua | helada | sequía | fija N | MO | erosión | forraje | mercado |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| papa | Papa | Solanaceae | 2700–3800 | 6 | 10,11,12,1 | 60 | 4 | 2 | 2 | no | 2 | 2 | 1 | 5 |
| haba | Haba | Fabaceae | 2500–3600 | 6 | 10,11,12 | 50 | 3 | 3 | 2 | sí | 3 | 3 | 3 | 4 |
| chocho | Chocho | Fabaceae | 2800–3500 | 7 | 11,12,1 | 35 | 2 | 3 | 4 | sí | 4 | 3 | 2 | 4 |
| quinua | Quinua | Amaranthaceae | 2500–3800 | 6 | 11,12,1 | 35 | 2 | 4 | 4 | no | 3 | 3 | 2 | 4 |
| cebada | Cebada | Poaceae | 2800–3600 | 5 | 12,1,2 | 40 | 2 | 3 | 3 | no | 3 | 4 | 4 | 3 |
| maiz | Maíz suave | Poaceae | 2200–3000 | 8 | 9,10,11 | 70 | 4 | 1 | 2 | no | 3 | 3 | 4 | 4 |
| avena | Avena forrajera | Poaceae | 2800–3800 | 5 | 10,11,12,1,2 | 40 | 2 | 4 | 3 | no | 4 | 5 | 5 | 2 |
| brocoli | Brócoli | Brassicaceae | 2600–3200 | 4 | 1..12 (con riego) | 80 | 5 | 2 | 1 | no | 2 | 2 | 1 | 5 |
| oca | Oca | Oxalidaceae | 3000–3900 | 7 | 10,11,12 | 50 | 3 | 4 | 2 | no | 2 | 2 | 1 | 2 |
| vicia_avena | Vicia + avena (abono verde) | Fabaceae/Poaceae | 2700–3800 | 4 | 10,11,12,1,2 | 40 | 2 | 4 | 3 | sí | 5 | 5 | 5 | 1 |

### Ampliación del catálogo (15-11-2026, solicitada por el cliente)
19 cultivos nuevos. Sus parámetros agronómicos con fuente están en `backend/src/data/perfilesAgronomicos.ts` (INIAP 2011; FAO 1986; FAO-56; FAO EcoCrop; Naranjo et al. 2018). Los índices de rotación sin fuente (agua, helada, sequía, MO, erosión, forraje, mercado) son `null`: no se inventan.

| id | nombre | especie | categoría | ciclo de referencia (días) | época |
|---|---|---|---|---|---|
| col | Col | *Brassica oleracea* var. *capitata* | hoja | 120–140 | todo el año (INIAP) |
| remolacha | Remolacha | *Beta vulgaris* | raíz | 70–90 | todo el año (INIAP) |
| lechuga | Lechuga | *Lactuca sativa* | hoja | 75–140 | todo el año (INIAP) |
| cilantro | Cilantro | *Coriandrum sativum* | hoja | 35–140 | todo el año (INIAP) |
| apio | Apio | *Apium graveolens* var. *dulce* | hoja | 125–210 | sin dato |
| perejil | Perejil | *Petroselinum crispum* | hoja | 70–365 | sin dato |
| zanahoria | Zanahoria | *Daucus carota* | raíz | 100–150 | todo el año (INIAP) |
| cebolla_colorada | Cebolla colorada | *Allium cepa* (bulbo) | cebolla | 150–210 | todo el año (INIAP) |
| cebolla_blanca | Cebolla blanca | *Allium fistulosum* | cebolla | 60–160 | todo el año (INIAP) |
| coliflor | Coliflor | *Brassica oleracea* var. *botrytis* | flor | 60–120 | todo el año (INIAP) |
| papa_nabo | Papa nabo | *Brassica rapa* subsp. *rapa* | raíz | 40–80 | todo el año (INIAP) |
| col_china | Col china | *Brassica rapa* subsp. *pekinensis/chinensis* | hoja | 40–90 | sin dato |
| rabano | Rábano | *Raphanus sativus* var. *radicula* | raíz | 35–45 | todo el año (INIAP) |
| frejol | Fréjol | *Phaseolus vulgaris* | leguminosa | 95–110 | sin dato |
| zapallo | Zapallo | *Cucurbita maxima* | fruto | 100–120 | sin dato |
| zambo | Zambo | *Cucurbita ficifolia* | fruto | 40–120 | sin dato |
| berro | Berro | *Nasturtium officinale* | hoja | 40–80 | sin dato |
| acelga | Acelga | *Beta vulgaris* var. *cicla* | hoja | 50–150 | todo el año (INIAP) |
| melloco | Melloco | *Ullucus tuberosus* | tubérculo | 120–270 | sin dato |

### Plantillas de rotación (seed)
| id | secuencia |
|---|---|
| papa-haba-cebada | papa → haba → cebada |
| papa-chocho-quinua | papa → chocho → quinua |
| papa-avena-haba | papa → avena → haba |
| papa-vicia-papa | papa → vicia+avena → papa |
| maiz-haba-cebada | maíz → haba → cebada |
| brocoli-haba-avena | brócoli → haba → avena |
| oca-haba-cebada | oca → haba → cebada (páramo) |
| quinua-chocho-cebada | quinua → chocho → cebada |

### Usuarios demo (seed)
- Agricultor: `demo@rotaandes.app`, con el terreno "Lote Pujilí" (3.150 m) y el historial papa 2024, papa 2025.
- Técnico: `tecnico@rotaandes.app`.
- Unos 8 terrenos de ejemplo repartidos por Latacunga, Pujilí, Saquisilí, Salcedo y el páramo, para que el panel de técnico no se vea vacío.

---

## 11. Forma de trabajo

- **Contrato primero:** la sección 8 manda. El frontend puede avanzar con los mocks de `frontend/src/mocks/` mientras el backend no esté listo, y luego cambiar a la API real. Si el contrato cambia, se actualiza este archivo en el mismo commit.
- **Puntos de control:** sábado a las 13:00, sábado a las 21:00 y domingo a las 13:00. En cada uno se comparte el link desplegado y una lista de qué está listo y qué falta.
- **Git:** un repositorio, `main` siempre desplegable, ramas `feat/<nombre>` y PRs pequeños. Commits en español y en modo imperativo.

---

## 12. Cronograma

| Día | Backend y datos | Frontend | Hito |
|---|---|---|---|
| **Vie 6 (noche)** | Repo, Railway, BD, seed, auth y CRUD desplegados | Proyecto Vite, layout, rutas, login/registro con mocks | API base en línea |
| **Sáb 7** | Clima NASA, pronóstico, calendario, capas NDVI/SMAP | Dashboard, mapa, terrenos, siembras, clima, calendario | **Fase 1 completa** |
| **Dom 8** | Rotaciones, escenarios, tendencia, PDF, técnico | Rotaciones, escenarios, capas, panel técnico, landing, glosario | **Entregable completo** |
| **Lun 9 – Mar 10** | Ajustes y datos validados | Pulido visual y en celular | Revisión con el equipo de Nicole y guion de la demo |
| **Mié 11** | — | — | **Presentación** |

Si algo se complica, se avisa de inmediato para reorganizar.

---

## 13. Deploy y configuración

- **Railway:**
  - Servicio **PostgreSQL**.
  - Servicio **backend** desde `backend/`, con build `npm ci && npx prisma generate && npm run build` y start `npx prisma migrate deploy && node dist/index.js`.
  - Variables: `DATABASE_URL` (referencia al Postgres de Railway), `JWT_SECRET`, `CORS_ORIGIN=<url de vercel>`, `PORT`.
- **Vercel:** root `frontend/`, variable `VITE_API_URL=<url de railway>`. Agregar un `vercel.json` con rewrite a `index.html` para que funcionen las rutas de React Router.
- **Costos:** Vercel y Railway ya están pagados. Revisar en el panel de Railway el consumo del mes. Si después de la presentación se quiere dejar en plan gratuito, la base de datos se puede migrar a otro Postgres gratis (por ejemplo, Neon o Supabase) cambiando solo `DATABASE_URL`.
- **Nunca** subir `.env` al repositorio.

---

## 14. Criterios de aceptación (checklist de revisión)

- [ ] Un usuario nuevo se registra desde el celular en menos de 1 minuto.
- [ ] Crea un terreno en Latacunga tocando el mapa, y la altitud aparece sola.
- [ ] Ve gráficas de lluvia y temperatura con la etiqueta "Fuente: NASA POWER".
- [ ] Ve la tendencia 2005–2024.
- [ ] Ve el pronóstico de 7 días y, si corresponde, una alerta de helada.
- [ ] Ve el calendario con colores y el motivo de cada celda.
- [ ] Ve 3 rotaciones (incluida la actual) con puntajes, por qué, evidencia, beneficios, vacíos, riesgos y aviso.
- [ ] El simulador de escenarios cambia el calendario y los puntajes en vivo.
- [ ] Las capas NDVI y SMAP se ven en el mapa con su leyenda.
- [ ] Descarga el reporte PDF.
- [ ] El técnico ve todos los terrenos, filtra y ve las alertas.
- [ ] Todo funciona aunque NASA POWER no responda (respaldo).
- [ ] Un agricultor no puede ver ni editar terrenos de otro (probar cambiando el id en la URL).
- [ ] Delimita su zona de cultivo en el mapa (también en celular), ve su superficie aproximada, la guarda y la vuelve a ver al abrir el terreno; el técnico solo puede verla.
- [ ] Se ve bien en celular (Chrome Android) y en computadora.

---

## 15. Reglas para los agentes de IA (Claude Code / Codex)

1. **No cambiar el stack ni el modelo de datos** sin anotarlo en `docs/DECISIONES.md`.
2. **Respetar el contrato de la API (sección 8).** Si se cambia, actualizar este archivo en el mismo commit.
3. **TypeScript estricto.** Nombres de dominio en español (`terreno`, `siembra`, `cultivo`) y comentarios en español.
4. Textos de la interfaz en español sencillo, sin jerga (o explicada en el glosario).
5. Siempre mostrar la **fuente del dato** y el **aviso** de herramienta de apoyo.
6. **Verificar con `curl` cada API externa** antes de integrarla; no inventar parámetros.
7. `npm run build` debe pasar antes de cada commit.
8. **No inventar datos agronómicos.** Usar la sección 10 y marcar como "referencial" lo no validado.
9. El frontend solo habla con el backend; nunca directo con la base de datos ni con APIs externas.
