# Informe de pulido visual y rediseño del PDF

> **Registro histórico de esta fase.** Se conservan sus fechas, versiones, cifras y resultados; las menciones a publicación pendiente o a repositorio privado describen ese momento. Para la versión vigente, las instrucciones actuales y las evidencias verificadas el 15-11-2026, consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los comandos de publicación, migración o reversión de este registro no son instrucciones para la auditoría documental actual.

Fecha: 9-10 de noviembre de 2026 · Rama: `feat/pulido-visual`, creada desde `release/publicacion` (`da9a9ec`).

Sin cambios en `PROYECTO.md`, `AGENTS.md`, esquema, migraciones, autenticación, roles, permisos, contratos de API, lógica NASA, motores de calendario o rotaciones, dependencias ni variables de entorno. No se publicó ni desplegó nada.

## 1. Problemas visuales encontrados (capturas «antes»)

1. Paleta casi monocroma (verde y beige): los módulos eran indistinguibles entre sí.
2. El detalle del terreno era una columna larga de bloques idénticos separados solo por una línea.
3. Tras «Saltar al contenido», el contorno de foco del `main` enmarcaba toda la página.
4. Calendario: estados en verde/amarillo/terracota apagados; el resumen mensual era una lista de textos iguales.
5. Rotaciones: indicadores con la misma barra verde; el estado de la estrategia se veía como texto plano.
6. Estados de carga y error en texto plano, sin indicador.
7. Portada con ilustración en tonos grises y poca jerarquía; «Mi espacio» con dos tarjetas de texto.
8. PDF: portada plana, títulos sin jerarquía, tablas sin cebreado y calendario de letras sin color.

## 2. Guía de estilo

| Token | Valor | Uso | Contraste |
| --- | --- | --- | --- |
| Verde bosque `pino` | `#1d4636` | Texto principal, botón primario, cabeceras oscuras | 9,8:1 sobre crema |
| Verde cultivo | `#2f7d43` | Acento de siembra/calendario, barras de suelo | 5,1:1 con blanco |
| Azul climático | `#1f6391` | Clima, pronóstico, tendencias, foco, lluvia | 6,5:1 con blanco |
| Amarillo andino | `#e6b33c` | Solo fondos y acentos; texto en `#7a5410`/`#6b4a0e` | 5,95–7,1:1 sobre su tono claro |
| Terracota `arcilla` | `#a3492a` | Rotaciones, avisos, alertas de helada | 5,9:1 con blanco |
| Oliva | `#4b5d49` | Texto secundario | 6,6:1 sobre crema |
| Crema / arena | `#f8f6ef` / `#ece5d3` | Fondos | — |

Todas las combinaciones de texto se comprobaron numéricamente (mínimo 5,08:1). Los estados nunca dependen solo del color: llevan símbolo (✓ ! × ?) y texto.

Elementos de identidad:

- Marca propia (montaña andina, sol y brote) en SVG, sin imágenes de terceros.
- «Franja andina» de cuatro colores inspirada en los tejidos, en CSS.
- 24 iconos SVG propios (`frontend/src/components/Iconos.tsx`), decorativos (`aria-hidden`).
- Tipografía: Georgia para títulos y Segoe UI/sistema para texto; Times y Helvetica estándar en el PDF.
- Movimiento mínimo (indicador de carga y elevación de 1 px), desactivado con `prefers-reduced-motion`.

## 3. Cambios en la interfaz

- **Marco común:** cabecera blanca con marca y franja andina, fija solo desde 640 px; en celular no ocupa pantalla. Pie oscuro con fuentes y aviso. Sin contorno de foco en `main` (destino programático) y margen de desplazamiento bajo la cabecera.
- **Portada:** héroe con degradado y paisaje andino original a color, chips de fuentes, tres pasos con icono y color, mosaico «Lo que encontrarás» (seis funciones existentes, descritas sin promesas), bloque oscuro de datos y límites, estado de conexión con indicador.
- **Mi espacio (panel del agricultor):** saludo destacado, acción principal, prioridades guardadas con medidor de 5 niveles y texto «n de 5» (o «Sin indicar»), accesos al glosario y las fuentes.
- **Mis terrenos:** tarjetas con icono y chips de área, riego y altitud; estado vacío ilustrado.
- **Detalle del terreno:** chips de resumen bajo el título, mosaico de preguntas con icono y color por módulo, ficha de datos con iconos, separadores de grupo («El clima de tu zona», «Planificar tus siembras», «La memoria de tu parcela»). Cada módulo es una tarjeta con borde e icono de su color: clima, pronóstico y tendencias en azul; calendario en verde; rotaciones en terracota; simulador en amarillo; historial en bosque. Los módulos siguen plegados hasta que el agricultor los abre, así que la página inicial es corta.
- **Fuentes y advertencias:** recuadros unificados, azul para la fuente del dato y terracota para advertencias.
- **Calendario:** colores de estado de la nueva paleta en matriz, leyenda y simulador. El resumen mensual muestra tarjetas de color por estado con símbolo y conteo. En celular, la columna fija de cultivos es más estrecha (7 rem en lugar de 11) para dejar sitio a los meses.
- **Rotaciones:** banda de color por posición, estado como insignia de color con texto, pasos numerados, indicadores con icono y barra de color propio (agua azul, suelo verde, clima amarillo, mercado terracota) y total destacado. Valores, textos y explicaciones sin cambios.
- **Pronóstico:** tarjetas diarias con borde azul (terracota si hay alerta, gris sin dato) y recuadro de alertas coloreado.
- **Mapa y capas:** tarjeta con icono satelital y controles/metadatos en recuadros azules. La leyenda oficial GIBS se conserva tal cual. Marcadores en verde cultivo con borde blanco.
- **Carga y error:** indicador giratorio accesible (`role="status"`), error con icono y botón «Reintentar».
- **Panel técnico, acceso e informe:** encabezado con icono, filtros en tarjeta con acento, terrenos con borde según el estado de helada (texto conservado), tarjeta de acceso con marca y beneficios, bloque de PDF con icono.
- **Gráficas:** lluvia en azul climático y heladas en terracota. Sin cambios de datos ni escalas.

No se eliminó ningún dato, unidad, fuente ni advertencia. No se añadieron dependencias.

## 4. PDF

Con PDFKit (ya instalado) y fuentes estándar:

1. **Portada:** banda con paisaje vectorial, sol, marca y franja andina; nombre del terreno; fichas de ubicación, altitud y área; aviso destacado; contenido.
2. **Resumen para el agricultor (2–3 páginas):**
   - fichas del terreno;
   - meses más lluviosos y más secos, meses con riesgo heurístico alto y mes con la mínima más baja;
   - franja de 12 meses con lluvia y letra de riesgo (A/M/B/?);
   - próximos 7 días: número de alertas, mínima más baja y lluvia total con la cantidad de días con dato;
   - qué está recomendado o es posible con cuidado en el mes actual y los dos siguientes (mes de Ecuador según la fecha de generación);
   - las tres rotaciones con su estado e índice total;
   - dirección de las tendencias 2005–2024.

   Todo se deriva de los datos ya incluidos en el informe. Si falta un dato, se escribe «Sin dato» o se indica que no está disponible.
3. **Secciones técnicas 1–7 completas,** con los mismos contenidos que antes:
   - títulos en banda de color;
   - recuadros de fuente y aviso;
   - tablas con cabecera de color y filas cebreadas;
   - riesgo de helada coloreado en la tabla climática y días con alerta resaltados en el pronóstico;
   - calendario con celdas coloreadas que conservan las letras R/C/N/?;
   - una banda de color distinta para cada estrategia de rotación.
4. **Cabecera y pie de página:** cabecera con marca, título y nombre del terreno; pie con franja, «Página n de N» y aviso.

El informe de la fixture de pruebas pasa de unas 30 a 37 páginas por la portada y el resumen. El límite de 80 páginas y 4 MB se mantiene. Sigue siendo determinista: los mismos datos producen el mismo PDF byte a byte.

## 5. Verificación

| Comprobación | Resultado |
| --- | --- |
| `npm.cmd run check` (lint → TypeScript → unitarias → PostgreSQL → build → Playwright) | **Código 0** |
| Backend (Vitest) | **376** (antes 375; +1 prueba del resumen del PDF) |
| Frontend (Vitest) | **170** |
| PostgreSQL aislado | **152** |
| Playwright E2E (escritorio, 320, 375 y 390 px) | **42** |
| **Total** | **740 pruebas aprobadas** |

- **E2E final:** comprueba en cada tamaño de pantalla que no haya desbordamiento horizontal, un solo `h1` y niveles de título consecutivos, contraste ≥ 4,5:1 del texto principal, secundario y del botón primario, etiquetas de todos los campos, navegación por teclado («Saltar al contenido» y anclas), y el PDF leído desde el navegador.
- **Contraste:** se calcularon con la fórmula WCAG 20 combinaciones de texto y fondo de la nueva paleta, en la web y en el PDF. La más baja es 5,08:1 (blanco sobre verde cultivo).
- **PDF:**
  - Se renderizaron con pdf.js todas las páginas de tres informes: fixture completa (37 páginas), fixture sin proveedores (10 páginas) e informe real de la E2E con tendencias (37 páginas).
  - Todas las páginas tienen cabecera, pie y «Página n de N».
  - Ninguna tabla ni sección queda cortada; las tablas largas repiten la cabecera en la página siguiente.
  - Sin datos, cada sección lo indica y no aparecen cifras.
  - Las pruebas del PDF verifican además: tamaño A4, márgenes de texto entre x 40–550 e y 25–820, determinismo byte a byte, límite de páginas y que el resumen se deriva de los datos.
- **Lógica intacta:** `git diff release/publicacion` no muestra cambios en servicios NASA, clima, calendario, motor de rotaciones, autenticación, rutas, middleware, Prisma, migraciones ni `PROYECTO.md`/`AGENTS.md`. En `backend/src` solo cambia `services/pdfTerreno.ts` (presentación). En `frontend/src/lib` solo cambian las clases de color de `compararEscenarios.ts`; `api.ts`, la sesión y los esquemas siguen igual.
- No se añadieron dependencias ni se modificó `package-lock.json`.

## 6. Capturas

En `.tmp/pulido/` (ignorada por Git):

- `antes/`: capturas de la E2E final previas al cambio (escritorio, 320, 375 y 390 px) y su PDF.
- `despues/`: las mismas capturas tras el cambio.
- `pdf-p*.png` y `pdf-vacio-p*.png`: páginas del PDF renderizadas con pdf.js, con datos completos y sin proveedores.
- `comparativas/`: 17 imágenes antes/después lado a lado: portada, detalle, resumen del calendario, navegación, simulador, tendencias, panel técnico y fuentes en escritorio; portada y detalle en 320, 375 y 390 px; portada, página 2 y calendario del PDF.
- `pdf-hoja-1.png`, `pdf-hoja-2.png`, `pdf-vacio-hoja.png` y `e2e-hoja.png`: hojas de contacto con todas las páginas de cada PDF revisado.

Nota: en las capturas de página completa de escritorio, la cabecera fija aparece a mitad de la imagen. Es un artefacto de la captura, no del uso real.

## 7. Limitaciones

- No hay certificación formal WCAG. El contraste se calculó con la fórmula WCAG 2.x para las combinaciones definidas.
- El PDF usa fuentes estándar (Helvetica y Times). Los símbolos fuera de Latin-1 se siguen sustituyendo por equivalentes de texto.
- Las ilustraciones son esquemáticas y propias; no representan un lugar concreto.
