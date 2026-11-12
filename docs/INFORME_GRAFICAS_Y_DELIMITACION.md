# Informe: gráficas comprensibles y delimitación de la zona de cultivo

Fecha: 12 de noviembre de 2026 · Rama: `feat/graficas-delimitacion` · Base: `release/publicacion` (`8761912`).

Solicitud del cliente: «En la parte de cómo interpretar las gráficas, hay diagramas de barras que no se entienden del todo». Además pidió marcar en el mapa la zona exacta del terreno.

**Producción:** no se ha publicado nada. La migración no se aplicó en producción. Ver la [sección 7](#7-pasos-pendientes-que-requieren-autorización).

## 1. Gráficas

### Problemas encontrados

1. Los ejes no tenían título; la unidad solo aparecía en una frase bajo el título o en el cuadro emergente.
2. Las barras de lluvia, días de helada y precipitación anual no explicaban qué es una barra ni cómo leerla.
3. El mismo color significaba cosas distintas:
   - el terracota marcaba a la vez la temperatura máxima y los días de helada;
   - el azul, a la vez la lluvia y la mínima.
4. El cuadro emergente era el genérico de Recharts: sin nombre completo del mes y sin indicar los datos ausentes.
5. Nada distinguía a simple vista un dato histórico, un pronóstico, un escenario o un índice.
6. Había datos que se recibían pero no se graficaban:
   - la humedad del suelo (solo en tabla);
   - el pronóstico de 7 días (solo en tarjetas).
7. Las barras de los indicadores de rotación no tenían escala.
8. El simulador comparaba los puntajes solo con una tabla de números.

### Cambios

Un marco común (`frontend/src/components/AyudaGrafica.tsx`) da a todas las gráficas la misma estructura:

| Elemento | Detalle |
| --- | --- |
| Título claro | «Lluvia de cada mes», «Días de helada de cada año», etc. |
| Tipo de dato | Etiqueta «Dato histórico», «Pronóstico», «Escenario hipotético» o «Índice del modelo», con icono. |
| Fuente y periodo | Por ejemplo: «Fuente: NASA POWER · promedio 2001–2025 · dato regional (aprox. 50 km)». |
| Ejes | «↑ Lluvia en milímetros (mm) por mes» y «Meses del año →», en texto legible en celular. |
| Leyenda | HTML, con muestra de barra, línea continua, discontinua o punteada, o línea de referencia. |
| Valor exacto | Al pasar el cursor o tocar (y con flechas del teclado), el cuadro emergente muestra el nombre completo, el valor con su unidad y «Sin dato» cuando falta. |
| Resumen | «En pocas palabras»: frase calculada con los datos mostrados (`frontend/src/lib/graficas.ts`). Describe y no recomienda. |
| Ayuda | Desplegable **«¿Cómo interpretar esta gráfica?»**: qué muestra, eje horizontal, eje vertical, cada color, valores altos y bajos, precauciones y ejemplo de lectura. |

**Colores fijos por variable** (`COLORES_VARIABLE`):

| Variable | Color |
| --- | --- |
| Lluvia | Azul `#1f6391` |
| Temperatura máxima | Naranja `#b4541f` |
| Temperatura media | Verde bosque `#1d4636` |
| Temperatura mínima y heladas | Morado `#5b4a9e` |
| Humedad del suelo | Marrón `#8a5a2b` |
| Original frente a simulado | Gris frente a amarillo rayado |

**Gráficas revisadas y estado final:**

| Módulo | Gráficas | Novedad |
| --- | --- | --- |
| Climatología | Lluvia mensual (barras), temperaturas (3 líneas + línea de 2 °C), **humedad del suelo** (barras, escala fija 0–1) | Humedad nueva; umbral de helada visible |
| Tendencias 2005–2024 | Lluvia anual, mes más frío de cada año, días de helada, **humedad superficial** (escala 0–1) | Humedad nueva; resumen con la dirección ya calculada por el servidor |
| Pronóstico | **Temperaturas previstas** (mínima y máxima + umbral de alerta) y **lluvia prevista** | Nuevas: antes solo había tarjetas |
| Rotaciones | Barras de índice 0–100 | Escala 0 · 50 · 100, marca central, «No determinado» con borde punteado, etiqueta «Índice del modelo» y ayuda |
| Simulador | **Barras emparejadas** original (gris) frente a simulado (amarillo rayado) | Nuevas; etiqueta «Escenario hipotético»; la tabla exacta se conserva |
| Calendario | Matriz de colores | Ayuda de interpretación |

**Escalas honestas:**

- las barras empiezan en 0;
- los índices 0–1 usan siempre la escala completa;
- no se mezclan unidades en un mismo eje (la lluvia diaria del pronóstico va en su propia gráfica);
- los datos ausentes no se dibujan como cero: la barra falta, la línea se corta y el resumen lo dice.

No se modificó ningún dato, cálculo ni contrato del clima. Los resúmenes solo ordenan valores recibidos. La regla de 2 °C es la de `PROYECTO.md` §7.1.

## 2. Delimitación de la zona de cultivo

### Uso

En el detalle del terreno aparece el apartado **«Zona de cultivo»**, también accesible desde el mosaico «Delimitar mi zona de cultivo».

1. Pulsar **«Delimitar zona de cultivo»**.
2. Tocar o hacer clic en cada esquina. Las líneas unen los puntos y una línea punteada anticipa el cierre.
3. Cerrar tocando el punto 1 («Toca aquí para cerrar») o con **«Cerrar zona»**.
4. Corregir: el interior queda verde y el exterior oscurecido, y aparecen los puntos arrastrables y los «+» para insertar puntos intermedios. También se puede seleccionar un punto para eliminarlo.
5. Revisar en vivo los puntos, el área aproximada (ha y m²) y la diferencia con el área declarada. Si el contorno no es válido, se explica por qué.
6. **«Guardar delimitación»**. Al reabrir el terreno, la zona aparece sola, y el mapa de «Mis terrenos» también la dibuja.
7. **«Eliminar delimitación»**, con confirmación. No toca el área declarada ni las siembras.

**Accesibilidad y teclado:**

- el mapa se mueve con las flechas y se acerca con «+»;
- una mira marca el centro del mapa y «Añadir punto en el centro» añade ahí un vértice;
- el desplegable «Coordenadas de los puntos» permite escribir o corregir cada latitud y longitud, con coma o punto, y eliminar puntos;
- los vértices miden 26–30 px, con una zona táctil de 34 px;
- los botones miden al menos 48 px;
- los mensajes llegan a los lectores de pantalla mediante `role="status"` y `aria-live`.

**Permisos:** solo el agricultor propietario ve los botones. El técnico y otros usuarios ven la zona en solo lectura.

### Investigación de bibliotecas

| Opción | Compatibilidad | Decisión |
| --- | --- | --- |
| Leaflet.draw 1.0.4 | Leaflet 1.x, pero sin mantenimiento activo desde 2018 y con problemas táctiles conocidos | Descartada |
| Leaflet-Geoman (versión libre) | Leaflet 1.9, mantenida | Descartada: añade peso, tiene interfaz en inglés y requiere integración imperativa con React |
| Editor propio sobre Leaflet y React Leaflet (ya instalados) | Total | **Elegida**: cero dependencias nuevas, textos en español y control de la accesibilidad |

No se copió código de la imagen de referencia.

### Persistencia y contrato

- **PostgreSQL:** nueva columna opcional `terrenos.poligono JSONB`. Migración `20261112000100_delimitacion_terreno`:

  ```sql
  ALTER TABLE "terrenos" ADD COLUMN "poligono" JSONB;
  ```

  Es un cambio aditivo: sin valor predeterminado, sin reescritura de filas y sin tocar la migración inicial ni `_prisma_migrations`. Los terrenos existentes quedan con `NULL` y siguen funcionando como un punto. Se descartó PostGIS porque exige una extensión en Railway y no se hacen consultas espaciales.
- **Formato:** GeoJSON `Polygon` (RFC 7946):
  - WGS84, en orden `[longitud, latitud]`;
  - un único contorno, cerrado (el último punto repite el primero);
  - en sentido antihorario, con 7 decimales (unos 1 cm).
- **API** (`PROYECTO.md` §8, actualizado en el mismo commit):
  - `PUT /api/terrenos/:id/delimitacion`, con `{ "poligono": { "type": "Polygon", "coordinates": [[[lon, lat], …]] } }`, devuelve el terreno.
  - `DELETE /api/terrenos/:id/delimitacion` devuelve el terreno con `poligono: null`.
  - Las respuestas de terreno añaden `poligono` (o `null`) y `area_poligono_m2` (derivado, solo lectura).
  - `PUT /api/terrenos/:id` no admite estos campos: los rechaza por ser campos no permitidos.
- **Seguridad:**
  - el `usuario_id` se toma del JWT;
  - otro agricultor recibe 404, el técnico 403 y una petición sin token 401;
  - el cuerpo es estricto y rechaza campos extra, como un `usuario_id` enviado por el cliente;
  - el guardado se condiciona a la ubicación leída, para evitar carreras con un cambio de coordenadas.
- **Validación**, en el servidor (`backend/src/services/geometriaTerreno.ts`) y la misma en el navegador (`frontend/src/lib/geometria.ts`):
  - tipo `Polygon` con un solo contorno cerrado;
  - de 3 a 100 vértices distintos;
  - coordenadas en rango;
  - sin autointersecciones (prueba de segmentos no adyacentes sobre una proyección local);
  - todos los vértices a 10 km o menos del punto del terreno;
  - superficie entre 10 m² y 10 000 ha.

  No se permite mover el terreno a más de 10 km de su zona; primero hay que eliminar la delimitación.
- **Compatibilidad:** el frontend acepta respuestas sin los campos nuevos, que serían las de un backend anterior. El backend nuevo solo añade campos; el frontend publicado los ignora porque su esquema no es estricto.

### Metodología de la superficie

- **Fórmula:** área de un polígono sobre la esfera, de Chamberlain y Duquette (2007), «Some algorithms for polygons on a sphere», JPL:

  A = |Σ (λᵢ₊₁ − λᵢ₋₁) · sin φᵢ| · R² / 2

  con R = 6 378 137 m (radio ecuatorial WGS84), el mismo método que `@mapbox/geojson-area` y Turf.
- **Precisión del método:** para parcelas de pocas hectáreas en Ecuador, la diferencia con el elipsoide WGS84 es menor al 0,5 %. La prueba automatizada exige 1 ha ± 0,5 % para un cuadrado de 100 m.
- **Precisión real:** la domina el dibujo. La alineación del mapa base y la precisión del clic o del dedo desplazan cada vértice varios metros; a zoom 17, un píxel equivale a unos 1,2 m. Por eso la interfaz y el PDF dicen «aproximada» y advierten que no es una medición catastral ni topográfica.
- **Comparación:** diferencia = área dibujada − área declarada, en ha y en % del área declarada. El área declarada no se modifica nunca.

### Integración con los demás módulos

| Módulo | Efecto |
| --- | --- |
| Registro y edición del terreno | Sin cambios de formulario. El texto de ayuda menciona la delimitación opcional. Mover el terreno lejos de su zona se rechaza con un mensaje claro. |
| Mapas | El detalle tiene su mapa de zona. «Mis terrenos» dibuja las zonas guardadas. |
| Panel técnico | El técnico ve la zona en el detalle del terreno, en solo lectura. El listado del panel no cambia. |
| PDF | Ver la sección 3. |
| NASA, calendario y rotaciones | **Sin cambios.** Se siguen calculando con el punto del terreno. Se advierte que el dato NASA es regional y no del interior del polígono. |

## 3. PDF

- **Sección 1, «El terreno y su historial»:** subsección «Delimitación de la zona de cultivo» con:
  - un croquis vectorial a escala propia, con relleno verde, contorno, vértices y una flecha N;
  - la superficie aproximada (ha y m²) y el número de vértices;
  - el área declarada y la diferencia en ha y %;
  - el primer vértice (lat, lon);
  - una advertencia: no es catastral ni topográfica, no reemplaza el área declarada y el clima NASA es regional.
- **Resumen para el agricultor:** una línea con la superficie aproximada o «sin delimitación dibujada».
- **Sin delimitación:** «Sin delimitación guardada: el terreno se representa solo con un punto».
- **Páginas:** el número no cambia; la prueba compara el mismo informe con y sin delimitación. Se mantienen los márgenes (x 40–550, y 25–820), el determinismo y los límites de 80 páginas y 4 MB.

## 4. Verificación

`npm.cmd run check` terminó con **código 0**. Cubre lint, TypeScript, pruebas unitarias, PostgreSQL local aislado, build y Playwright en escritorio, 320, 375 y 390 px.

| Suite | Antes (`8761912`) | Ahora |
| --- | --- | --- |
| Backend (Vitest) | 376 | **401** |
| Frontend (Vitest) | 170 | **193** |
| PostgreSQL aislado | 152 | **158** |
| Playwright E2E | 42 | **44** |
| **Total** | **740** | **796** |

**Pruebas nuevas por requisito:**

| Requisito | Pruebas |
| --- | --- |
| Creación de polígonos | E2E con clics (escritorio) y toques (celular 390 px); unitaria con teclado («punto en el centro» y coordenadas) |
| Edición de vértices | E2E: arrastre de un vértice e inserción con «+»; unitaria: eliminar un punto y mínimo de 3 |
| Eliminación | Integración PostgreSQL, unitaria y E2E con confirmación; el área declarada se conserva |
| Guardado y recuperación | Integración: `PUT`, lectura, listado, edición; E2E: recarga y comprobación en PostgreSQL |
| Validación geográfica y polígonos inválidos | Servidor y navegador: sin cerrar, menos de 3 puntos, repetidos, moño, lejos (> 10 km), diminuto, enorme, otro tipo, agujeros, campos extra, fuera de rango, texto, más de 100 puntos |
| Superficies | 1 ha ± 0,5 % para un cuadrado de 100 m; escala con el lado²; independiente del sentido; triángulo = ½ rectángulo; comparación con el área declarada |
| Terrenos antiguos | Integración y unitaria: `poligono: null`; el frontend acepta respuestas sin los campos nuevos |
| Permisos | Otro agricultor: 404 al leer, guardar o borrar; técnico: 403 al modificar y lectura permitida; sin token: 401; el `usuario_id` del cliente se rechaza |
| Mapa en celular y escritorio | E2E de delimitación en ambos proyectos, sin desbordamiento horizontal |
| Gráficas: interpretación, cuadros emergentes, leyendas, unidades, datos ausentes | Unitarias (`graficas.test.ts`, `GraficasClima.test.tsx`) y E2E de climatología (paso del cursor en escritorio y toque en celular, ayuda, leyenda, unidades) |
| PDF con y sin delimitación | Unitaria (mismo número de páginas, márgenes, textos) e integración HTTP |

**Pruebas existentes ajustadas, sin ocultar errores:**

- El número esperado de gráficas sube de 2 a 3 en climatología (`clima.spec.ts` y `primeraEntrega.spec.ts`) y de 3 a 4 en tendencias, por la nueva gráfica de humedad del suelo.
- `persistencia.integration.test.ts` incluye la nueva columna `poligono jsonb?` en el esquema esperado.
- `PronosticoTerreno.test.tsx` simula la gráfica diferida, igual que las demás pruebas de módulos.
- La E2E de delimitación se ejecuta con su propio servidor (`playwright.delimitacion.config.ts`), como las demás E2E por módulo. En la misma ejecución que la batería principal superaba el límite de intentos de inicio de sesión del backend; el límite no se modificó.

**Comprobaciones adicionales:**

- **Lógica intacta:** `git diff 8761912` no muestra cambios en NASA POWER, clima, tendencias, Open-Meteo, calendario, motor de rotaciones, autenticación, middleware, datos de respaldo, la migración inicial ni `AGENTS.md`. Tampoco hay dependencias nuevas: `package-lock.json` no cambió.
- **Migración:** aplicada y probada solo en las bases locales `rotaandes_pruebas_*` y `rotaandes_dev` (127.0.0.1). No se aplicó en producción.
- **PDF real:** la sección de delimitación de un informe generado desde la interfaz (39 páginas) se revisó visualmente.

## 5. Capturas

En `.tmp/evidencias/`, carpeta ignorada por Git. Usan un usuario y terrenos **ficticios** en la base local de pruebas. La climatología y las tendencias son las respuestas NASA POWER archivadas y verificadas del repositorio. El pronóstico se consultó en vivo a Open-Meteo y el mapa base es OpenStreetMap real.

- **`antes/` y `despues/`** (escritorio 1366 px y celular 375 px): gráficas de climatología, valor exacto al señalar, pronóstico, tendencias, indicadores de rotación y variación del simulador. «Antes» corresponde a una compilación del commit `8761912`.
- **`despues/*-clima-lluvia-como-interpretar.png`**: la ayuda desplegada.
- **`despues/*-delimitacion-1-dibujando.png`, `-2-cerrada-editable.png` y `-3-guardada.png`**: un terreno con su zona delimitada sobre el mapa real, en escritorio y celular.
- **`despues/informe-con-delimitacion.pdf`** y **`despues/pdf-p4.png`**: la sección del PDF con el croquis.
- **`comparativas/`**: 16 imágenes antes y después lado a lado (8 por tamaño de pantalla).

Durante la revisión de las capturas se corrigieron tres detalles:

- la última etiqueta del eje del pronóstico se cortaba;
- en celular, las etiquetas largas del simulador se truncaban;
- en el simulador, «No determinado» se veía igual que un 0; ahora tiene borde punteado.

## 6. Limitaciones

- La superficie es aproximada y depende de la precisión del dibujo y del mapa base. No es catastral ni topográfica.
- Un solo contorno por terreno: no admite huecos (por ejemplo, una casa dentro del lote) ni varias zonas separadas.
- El editor no ajusta los puntos a bordes del mapa (no tiene «snapping») ni importa archivos GPS o KML.
- El mapa base es OpenStreetMap, sin imagen satelital de alta resolución. Algunas parcelas rurales tienen pocos detalles visibles.
- Arrastrar vértices en pantallas muy pequeñas requiere precisión. La lista de coordenadas y los «+» son las alternativas.
- Los datos climáticos siguen siendo regionales; la delimitación no los cambia.
- Los colores y textos de las gráficas se verificaron con pruebas automatizadas y capturas, sin una prueba formal con usuarios.

## 7. Pasos pendientes que requieren autorización

Para publicar estos cambios, en este orden:

1. Respaldo verificado de PostgreSQL de producción (`pg_dump -Fc`, restauración de prueba en una base local), como el del 10-11-2026.
2. Push de la rama y avance por fast-forward de `release/publicacion`.
3. Despliegue del backend en Railway: el pre-deploy ejecuta `prisma migrate deploy`, que aplica solo `ALTER TABLE "terrenos" ADD COLUMN "poligono" JSONB`.
4. Comprobación de `/api/health` y de un terreno existente (debe devolver `poligono: null`).
5. Despliegue del frontend en Vercel, primero sin dominio y luego promovido.

**Reversión:** el backend y el frontend anteriores ignoran la columna nueva, así que se puede volver a los despliegues anteriores sin borrar la columna. Borrar la columna sería una operación destructiva y no está prevista.
