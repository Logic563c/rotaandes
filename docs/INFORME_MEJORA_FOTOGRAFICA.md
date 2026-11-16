# Informe: mejora fotográfica de la interfaz

> **Registro histórico de esta fase.** Se conservan sus fechas, versiones, cifras y resultados; las menciones a publicación pendiente o a repositorio privado describen ese momento. Para la versión vigente, las instrucciones actuales y las evidencias verificadas el 15-11-2026, consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los comandos de publicación, migración o reversión de este registro no son instrucciones para la auditoría documental actual.

Fecha: 13 de noviembre de 2026 · Rama local: `feat/fotografia-visual`, creada desde `release/publicacion` (`0c2253d`, la versión publicada y documentada).

**Alcance:** solo diseño visual. No se modificaron fórmulas, algoritmos, reglas, API, modelos de Prisma, migraciones, datos, contratos, credenciales ni variables de entorno. Tampoco se modificaron PostgreSQL, Railway ni Vercel, y no se hizo push ni despliegue.

## 1. Qué cambió

| Elemento | Antes | Ahora |
| --- | --- | --- |
| Fondo de la portada | Nubes y surcos dibujados con CSS | **Fotografía real del Cotopaxi** sobre el mar de nubes, con potreros. Tiene un acercamiento muy lento (38 s, solo `transform`) y un velo claro que garantiza la lectura. |
| Ilustración principal de la portada | Paisaje SVG esquemático | **Composición fotográfica:** campos e invernaderos de la Hacienda La Ciénega con el Cotopaxi al fondo. Lleva encima un contorno de parcela con vértices (alusión a la delimitación) y tres etiquetas flotantes de funciones reales (clima NASA, delimitación, calendario). |
| «Mi espacio», «Mis terrenos», detalle del terreno, panel técnico | Cabecera verde lisa o texto sobre fondo crema | **Cabeceras fotográficas** con velo oscuro graduado: la foto se ve a la derecha y el texto queda legible a la izquierda. |
| Tarjeta decorativa del acceso | Verde liso con un círculo | Foto de laderas cultivadas bajo un velo uniforme |
| Página «Fuentes» | — | Sección «Créditos de las fotografías» |

**Sin cambios:**

- el logotipo de la barra;
- los formularios, mapas, gráficas, tablas, módulos, botones de acción y resultados;
- los módulos del terreno (clima, calendario, rotaciones, simulador, tendencias), que siguen sobre superficies limpias. Las fotos no se colocan detrás de ningún contenido de trabajo.

**Correcciones de texto en «Fuentes»:** dos frases contradecían la delimitación ya publicada («sin cálculo de polígonos» y «no… calcula el área de tu parcela»). Ahora explican que el área declarada no se reemplaza y que la superficie dibujada es una estimación.

## 2. Fotografías y licencias

Todas son de Wikimedia Commons. Su licencia, autoría y ausencia de restricciones se verificaron con la API `extmetadata` (detalle en [`CREDITOS.md`](../frontend/public/imagenes/CREDITOS.md)).

| Foto | Autor | Licencia | Uso |
| --- | --- | --- | --- |
| [Cotopaxi se cree Fuji](https://commons.wikimedia.org/wiki/File:Cotopaxi_se_cree_Fuji_(46655072001).jpg) | David Ceballos | CC BY 2.0 | Fondo de la portada; cabecera de «Mi espacio» |
| [Road Hacienda La Ciénega to Quito](https://commons.wikimedia.org/wiki/File:Road_Hacienda_La_Cienega_to_Quito_Ecuador_1662.jpg) | Arabsalam | CC BY-SA 4.0 | Composición de la portada; cabecera del detalle del terreno |
| [Road to Quilotoa 1611](https://commons.wikimedia.org/wiki/File:Road_to_Quilotoa_Ecuador_1611.jpg) | Arabsalam | CC BY-SA 4.0 | Imagen predeterminada de las cabeceras |
| [Valle en Latacunga III](https://commons.wikimedia.org/wiki/File:Valle_en_Latacunga_-_Cotopaxi_-_Ecuador_III.jpg) (ya existente) | Gideoraielgave | CC BY-SA 4.0 | «Mis terrenos»; acceso; sección de parcelas |
| [Road to Quilotoa 1614](https://commons.wikimedia.org/wiki/File:Road_to_Quilotoa_Cotopaxi_view_Ecuador_1614.jpg) (ya existente) | Arabsalam | CC BY-SA 4.0 | Panel técnico; sección de parcelas |

- **Cambios en las fotos:** recorte, redimensionado y WebP. La foto de invernaderos recibió además un realce leve de contraste para quitar bruma.
- **Créditos:** cada foto muestra a su lado el autor, un enlace al original y la licencia. «Fuentes» los reúne todos.
- **Carácter:** son ilustrativas y no muestran terrenos de usuarios.

## 3. Rendimiento y accesibilidad

- **Peso:**
  - las fotos nuevas pesan entre 8 y 113 KB y usan `srcset`;
  - en la primera vista, un celular descarga unos 72 KB de fotos y un escritorio unos 198 KB;
  - el JavaScript crece 0,3 KB comprimido; el CSS queda igual.
- **Sin video ni dependencias nuevas:** el movimiento es CSS sobre `transform`.
- **Movimiento** (verificado en 1366, 390, 375 y 320 px):
  - activo por defecto;
  - **pausado** con el botón: todas las animaciones quedan en `paused`;
  - con **movimiento reducido** no hay ninguna animación y el botón se oculta.
- **Contraste medido sobre las fotografías reales:** el método oculta el texto, captura el fondo exacto bajo cada elemento y lo compara con el píxel más desfavorable (percentil 99) según la fórmula WCAG. Se tomaron 29 mediciones por tamaño de pantalla, 116 en total, que incluyen títulos, párrafos, etiquetas, créditos y tarjetas flotantes.
  - Valores mínimos: **4,52:1** en 1366 px, **5,08:1** en 390 y 375 px y **5,03:1** en 320 px. Todas las mediciones superan 4,5:1.
  - Esta medición detectó y permitió corregir dos fallos de la primera versión: los créditos de ancho completo que caían sobre la zona clara, y el degradado horizontal aplicado a la tarjeta estrecha del acceso.
- **Imágenes:** las de fondo son decorativas (`alt=""`, `aria-hidden`). La composición tiene un texto alternativo descriptivo y sus etiquetas, al repetir funciones ya descritas, están ocultas para los lectores de pantalla.
- **Desbordamiento horizontal:** ninguno en portada, acceso, «Mi espacio», terrenos, detalle (completo, con los módulos abiertos) y panel técnico, en los cuatro anchos.

## 4. Archivos modificados

- **Nuevos:**
  - `frontend/src/components/Fotografia.tsx` (cabecera fotográfica y crédito);
  - `frontend/src/lib/fotografias.ts` (registro de fotos y créditos);
  - seis archivos WebP en `frontend/public/imagenes/`.
- **Visuales:**
  - `frontend/src/estilos.css`;
  - `frontend/src/pages/Inicio.tsx`, `EspacioPersonal.tsx`, `Terrenos.tsx`, `DetalleTerreno.tsx`, `PanelTecnico.tsx`, `Acceso.tsx` y `Fuentes.tsx`;
  - `frontend/public/imagenes/CREDITOS.md`.

  En las páginas solo cambian clases y envoltorios: tras quitarlos, el diff de cada línea eliminada reaparece idéntico.
- **Pruebas ampliadas:**
  - `Inicio.test.tsx`: las dos fotos de la sección se comprueban como antes, ahora acotadas a su sección. Se añaden la composición, el fondo decorativo y los créditos CC BY 2.0 y CC BY-SA.
  - `InformacionPublica.test.tsx`: los 6 enlaces oficiales de las fuentes se siguen exigiendo. Se añaden los 10 enlaces de créditos, solo a Wikimedia y Creative Commons y sin credenciales, y sus autores.
  - No se eliminó, desactivó ni relajó ninguna prueba.

## 5. Verificación

`npm.cmd run check` terminó con **código 0**: **798 pruebas aprobadas**, las mismas que antes.

| Suite | Antes | Ahora |
| --- | --- | --- |
| Backend | 401 | 401 |
| Frontend | 195 | 195 |
| PostgreSQL | 158 | 158 |
| E2E (escritorio, 320, 375 y 390 px) | 44 | 44 |

Las E2E recorren todas las funcionalidades:

- registro e inicio de sesión;
- terrenos y mapas;
- **delimitación completa:** dibujar, cerrar, mover un vértice, insertar un punto, guardar, recuperar y eliminar, en escritorio y celular;
- siembras;
- clima, con valores exactos, unidades, fuentes, leyendas y ayuda en las gráficas;
- pronóstico y heladas;
- tendencias;
- calendario;
- rotaciones;
- simulador;
- capas MODIS y SMAP;
- panel técnico;
- **PDF** descargado y leído;
- errores y datos no disponibles;
- contraste, teclado y desbordamiento.

## 6. Capturas

En `.tmp/evidencias/fase4/`, carpeta no versionada, con usuarios y terreno ficticios en la base local de pruebas, que se limpia al terminar:

- **`antes/` y `despues/`:** portada, acceso, «Mi espacio», terrenos, detalle, zona de cultivo, gráfica de clima, calendario, rotación, tendencia y panel técnico, en 1366, 390, 375 y 320 px.
- **`despues/*-01b-portada-pausada.png` y `*-01c-portada-movimiento-reducido.png`.**
- **`despues/*-contrastes.json`:** las 116 mediciones.
- **`comparativas/`:** 24 imágenes antes y después lado a lado.

## 7. Producción

No se modificaron PostgreSQL, Railway ni Vercel y no se hizo push.

**Para publicar** (requiere autorización): solo hace falta desplegar el frontend en Vercel, porque el backend no cambia. Para revertir basta con volver a promover `dpl_BDMF5oNEGABpqcd6yTJ6XwbAuAi5`.
