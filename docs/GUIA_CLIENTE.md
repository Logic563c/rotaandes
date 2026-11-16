# MANUAL DE USUARIO - ROTAANDES

Guía de uso para agricultores y técnicos. Para la parte técnica ver
[MANUAL_TECNICO.md](MANUAL_TECNICO.md) y, para la demostración,
[RECORRIDO_DEMOSTRACION.md](RECORRIDO_DEMOSTRACION.md).

Actualizado el **15 de noviembre de 2026** para el calendario v4. La versión
de cada servicio y las evidencias están en [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md).

## ¿Qué es RotaAndes?

RotaAndes es una herramienta para conocer mejor las
condiciones de un terreno y explorar opciones de siembra.

No sustituye la experiencia de los agricultores ni el
asesoramiento de un técnico agrícola.

## 1. Ingresar a la plataforma

Abrir:
https://rotaandes.vercel.app/

Seleccionar "Crear mi cuenta" o "Iniciar sesión".

La portada tiene fotografías estáticas de Cotopaxi, con sus créditos.
El glosario y las fuentes se pueden consultar sin iniciar sesión.
La cuenta nueva es de agricultor; el acceso técnico requiere una cuenta
autorizada. No hay contraseña demo predeterminada en la instalación actual.

## 2. Registrar un terreno

Ingresar a "Mis terrenos" y seleccionar la opción para
añadir un terreno.

Indicar su nombre, ubicación y características.

La ubicación puede seleccionarse en el mapa o introducirse
mediante coordenadas cuando corresponda.

## 2.1. Delimitar la zona de cultivo (opcional)

Sirve para dibujar en el mapa un contorno aproximado de la zona que se cultiva.

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

El catálogo tiene **29 cultivos**: papa, haba, chocho, quinua, cebada,
maíz suave, avena forrajera, brócoli, oca, vicia + avena, col, remolacha,
lechuga, cilantro, apio, perejil, zanahoria, cebolla colorada, cebolla blanca,
coliflor, papa nabo, col china, rábano, fréjol, zapallo, zambo, berro,
acelga y melloco. Los nombres e identificadores se detallan en el
[catálogo vigente](ESTADO_ACTUAL.md). Algunos parámetros no tienen fuente
suficiente y se muestran como no determinados.

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
NASA POWER proporciona información climática; las recomendaciones agrícolas
son reglas de RotaAndes con fuentes agronómicas y pendientes de validación local.

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

Seleccionar "¿Qué puedo sembrar?" para el resumen mensual o abrir
"Ver calendario de siembra" para la matriz completa. Elegir el mes del
resumen: cuenta los mismos resultados de la matriz para los 29 cultivos.
El botón "Actualizar calendario" permite volver a consultar los resultados;
también se informa la fecha de consulta.

La matriz evalúa los **doce meses**, de enero a diciembre, para cada cultivo:
**348 casillas** en total. Los filtros pueden mostrar menos filas. Se puede
buscar un cultivo y filtrar por categoría, hortalizas o ciclo corto
(máximo de referencia de 120 días). El cálculo considera todos los meses
del ciclo, incluso si termina al año siguiente; para trasplantes, el mes
indica cuándo se lleva la planta al terreno, con semillero preparado antes.

| Resultado | Cómo leerlo |
| --- | --- |
| Verde: Recomendado | Las condiciones evaluadas favorecen la siembra; confirmar variedad y manejo local |
| Amarillo: Posible con precaución | Hay un riesgo que debe atender, por ejemplo asegurar agua de riego |
| Rojo: No recomendado | Hay una incompatibilidad según los criterios y las fuentes mostradas |
| Gris: No determinado | Falta un dato esencial o las fuentes no coinciden, sin otra incompatibilidad que obligue a rojo |

Tocar una casilla, o abrirla con Tab y Enter, muestra el resumen, los
motivos, las fuentes y "Qué puedes hacer". Si existe una incompatibilidad
independiente, puede aparecer rojo aunque además falten otros datos.
El gris no significa que el cultivo sea favorable ni desfavorable.

**Tener riego no equivale a agua ilimitada.** Cuando la lluvia NASA no
cubre el mínimo de agua de referencia durante el ciclo o en sus meses secos,
el criterio de agua avisa "depende del riego". Confirme caudal, turnos y
disponibilidad durante todo el ciclo con quien administra el agua: RotaAndes
no los conoce ni calcula volúmenes. Sin un parámetro con fuente o sin lluvia
válida, el motor conserva el criterio ordinario del riego declarado y explica
que no pudo hacer esa comparación; eso no demuestra agua suficiente.
Otros motivos pueden tener prioridad y dar rojo o gris.

En el berro, indicar riego no confirma agua permanente y limpia o suelo
saturado: esa condición queda sin determinar. Una época referencial fuera
de ventana se informa para consultarla localmente, sin prohibir por sí sola
la siembra. Que varios meses tengan el mismo color puede ser correcto: lea
"Condiciones que se repiten durante el año" y los motivos de cada casilla.

## 6. Comparar rotaciones

Abrir la comparación de rotaciones.

Revisar las tres alternativas, sus beneficios potenciales,
riesgos y limitaciones.

Se muestra la estrategia actual y dos espacios para alternativas. Si no hay
dos opciones evaluables, un espacio se muestra como no determinado; no se
inventa una alternativa. Los cultivos nuevos sin índices de rotación pueden
dejar la estrategia actual sin puntaje.

Las puntuaciones son orientativas y no representan
rendimientos ni ingresos garantizados.

## 7. Explorar escenarios

Modificar los controles de lluvia y temperatura.

Los rangos son de −30 % a +30 % de lluvia y de −2 °C a +2 °C.
El filtro de cultivos con cambios permite revisar qué estados varían.

Comparar los resultados originales con los hipotéticos.

Estos escenarios no son pronósticos del futuro.

## 8. Consultar datos satelitales

Activar las capas NASA MODIS o SMAP.

Las imágenes permiten observar información regional.
No equivalen a mediciones exactas dentro de cada parcela.
El selector usa imágenes disponibles de 2023 y 2024. Elegir un mes no
produce un promedio mensual; las áreas transparentes no significan humedad
cero ni ausencia de vegetación. El GeoJSON analítico sigue sin estar disponible.

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

El informe usa siempre el escenario original (0 % de lluvia y 0 °C de cambio),
aunque haya movido el simulador. Incluye el calendario de 29 cultivos con
motivos agrupados; la cantidad de páginas depende de los datos. Si alguna
fuente no está disponible, identifica la sección parcial y sus limitaciones.

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

El técnico consulta terrenos y alertas, con filtros por parroquia del
propietario y cultivo del historial, sin editar registros. Las alertas del
panel requieren pronósticos vigentes; "sin dato" no descarta una helada.
Para cambiar nombre, parroquia, teléfono o prioridades, entrar en "Mi perfil".
Las sesiones vencen a los 15 minutos y pueden requerir volver a ingresar.
Cerrar sesión borra el acceso guardado en esa pestaña.
