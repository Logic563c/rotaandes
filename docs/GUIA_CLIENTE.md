# GUIA DE USO - ROTAANDES

## ¿Qué es RotaAndes?

RotaAndes es una herramienta para conocer mejor las
condiciones de un terreno y explorar opciones de siembra.

No sustituye la experiencia de los agricultores ni el
asesoramiento de un técnico agrícola.

## 1. Ingresar a la plataforma

Abrir:
https://rotaandes.vercel.app/

Seleccionar "Crear mi cuenta" o "Iniciar sesión".

## 2. Registrar un terreno

Ingresar a "Mis terrenos" y seleccionar la opción para
añadir un terreno.

Indicar su nombre, ubicación y características.

La ubicación puede seleccionarse en el mapa o introducirse
mediante coordenadas cuando corresponda.

## 2.1. Delimitar la zona de cultivo (opcional)

Sirve para marcar en el mapa el contorno exacto de la zona que se cultiva.

1. Abrir el terreno y elegir "Delimitar mi zona de cultivo" (o bajar hasta
   el apartado "Zona de cultivo").
2. Pulsar **"Delimitar zona de cultivo"**.
3. Tocar o hacer clic en cada esquina de la zona, siguiendo el borde.
   Las líneas rojas unen los puntos en orden.
4. Para cerrar la zona, tocar el punto 1 (aparece el aviso "Toca aquí para
   cerrar") o pulsar **"Cerrar zona"**.
5. El interior se pinta de verde y el exterior se oscurece. Debajo del mapa
   aparecen los puntos, el **área aproximada** en hectáreas y metros
   cuadrados y la **diferencia con el área declarada**.
6. Para corregir: arrastrar los puntos numerados, tocar un "+" para añadir
   un punto entre dos esquinas, o seleccionar un punto y pulsar
   "Eliminar punto".
7. Pulsar **"Guardar delimitación"**. Al volver a abrir el terreno, la zona
   aparece sola.
8. Para borrarla: **"Eliminar delimitación"** y confirmar. El terreno, su
   área declarada y sus siembras no cambian.

Sin ratón o con teclado: mover el mapa con las flechas, acercar con "+",
y pulsar **"Añadir punto en el centro"** (la mira en cruz marca el centro).
También se pueden escribir o corregir las coordenadas en
"Coordenadas de los puntos".

Si el contorno se cruza, si un punto está a más de 10 km del terreno o si
la zona es demasiado pequeña, RotaAndes lo explica y no permite guardar.

La superficie es **aproximada**: no es una medición catastral ni un
levantamiento topográfico, y **no reemplaza** el área que usted declaró.
El clima de NASA POWER sigue siendo regional (unos 50 km): no describe solo
el interior de la zona dibujada.

## 3. Registrar los cultivos

Abrir el terreno y agregar las siembras realizadas.

Seleccionar el cultivo y la fecha de siembra.

Los registros ayudan a contextualizar las recomendaciones.

## 4. Consultar el clima

Abrir la información climática del terreno.

La plataforma presenta datos históricos de NASA POWER
y pronósticos de Open-Meteo cuando están disponibles.

Las alertas de heladas son preventivas.

Cada resultado indica de dónde viene el dato:

- **Consulta reciente a NASA:** se acaba de pedir a NASA POWER.
- **Caché verificada:** consulta NASA de los últimos 30 días.
- **Datos anteriores:** NASA no respondió y se muestra la última consulta
  guardada para ese mismo terreno, con su fecha.
- **Respaldo verificado:** NASA no respondió y se usan datos NASA
  descargados antes para la misma zona (misma celda de la cuadrícula
  de NASA, unos 50 km). Son los mismos valores que NASA da para el terreno.
- **No disponible:** no hay datos fiables. La plataforma no muestra
  cifras inventadas; vuelva a intentarlo en unos minutos.

Los datos de NASA POWER describen la zona, no el microclima exacto del lote.

### Cómo leer las gráficas

Cada gráfica tiene las mismas partes:

- **Título y etiqueta del tipo de dato:** "Dato histórico" (NASA POWER,
  promedio de muchos años), "Pronóstico" (Open-Meteo, próximos 7 días),
  "Escenario hipotético" (simulador) o "Índice del modelo" (rotaciones).
- **Fuente y periodo**, debajo del título.
- **Eje vertical (↑)** con su unidad: milímetros (mm), grados (°C),
  días o índice de 0 a 1.
- **Eje horizontal (→):** meses, años o días.
- **Leyenda** con el color de cada variable. Los colores son siempre
  los mismos: azul = lluvia, morado = temperatura mínima y heladas,
  naranja = temperatura máxima, verde oscuro = temperatura media,
  marrón = humedad del suelo.
- **"En pocas palabras":** un resumen calculado con los datos mostrados
  (por ejemplo, el mes más lluvioso y el más seco). No es una recomendación.
- **"¿Cómo interpretar esta gráfica?":** al abrirlo explica qué muestran
  las barras o líneas, cada eje, cada color, cómo leer valores altos o
  bajos, las precauciones y un ejemplo.

Al pasar el cursor o tocar una barra o un punto aparece el **valor exacto**
con su unidad. Si falta un dato, la barra no se dibuja o la línea se corta
y se indica "Sin dato": nunca se muestra como cero.

## 5. Consultar el calendario

Seleccionar "¿Qué puedo sembrar?" o acceder al calendario.

Revisar los meses y las recomendaciones referenciales.

Un resultado no determinado significa que falta información
esencial para ofrecer una orientación.

## 6. Comparar rotaciones

Abrir la comparación de rotaciones.

Revisar las tres alternativas, sus beneficios potenciales,
riesgos y limitaciones.

Las puntuaciones son orientativas y no representan
rendimientos ni ingresos garantizados.

## 7. Explorar escenarios

Modificar los controles de lluvia y temperatura.

Comparar los resultados originales con los hipotéticos.

Estos escenarios no son pronósticos del futuro.

## 8. Consultar datos satelitales

Activar las capas NASA MODIS o SMAP.

Las imágenes permiten observar información regional.
No equivalen a mediciones exactas dentro de cada parcela.

## 9. Revisar tendencias

Consultar las tendencias climáticas históricas disponibles
entre 2005 y 2024.

Los resultados son descriptivos y deben interpretarse
junto con el contexto local.

## 10. Descargar el informe PDF

Abrir el detalle de un terreno y seleccionar
"Descargar informe PDF".

El archivo incluye información del terreno, clima,
calendario, rotaciones y tendencias disponibles.

Si el terreno tiene una zona delimitada, el PDF incluye un croquis de la
zona, su superficie aproximada, el número de vértices, la comparación con
el área declarada y la advertencia de que es una estimación.

## 11. Glosario y fuentes

El glosario explica términos agrícolas y climáticos.
La sección de fuentes identifica el origen de los datos.

## 12. Ayuda y recomendaciones

Antes de tomar decisiones de siembra importantes,
contrastar la información con las condiciones reales del
terreno y, cuando sea posible, consultar a un técnico.

El panel técnico está reservado a cuentas autorizadas.
