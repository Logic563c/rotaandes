# Guía para defender RotaAndes ante el jurado

Guía actualizada el **15 de noviembre de 2026**, después de la revisión prevista originalmente para el sábado 14. No acredita que esa presentación se haya realizado. Prepara la explicación de **qué hace RotaAndes, cómo se desarrolló y cuáles son los límites de sus resultados**. Versiones de producción y pruebas verificables: [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md).

Documentos de apoyo:

- [RECORRIDO_DEMOSTRACION.md](RECORRIDO_DEMOSTRACION.md): guion minuto a minuto.
- [GUIA_CLIENTE.md](GUIA_CLIENTE.md): manual de usuario.
- [MANUAL_TECNICO.md](MANUAL_TECNICO.md): manual técnico.
- [INFORME_GRAFICAS_Y_DELIMITACION.md](INFORME_GRAFICAS_Y_DELIMITACION.md): detalle técnico de las gráficas y la delimitación.

## Mensaje central (30 segundos)

«RotaAndes ayuda a un agricultor de Cotopaxi a ver el clima de su zona con datos de la NASA, saber qué meses conviene sembrar y comparar su rotación actual con dos alternativas. Cada resultado dice de dónde viene y por qué. No reemplaza al agricultor ni al técnico: ordena la información para decidir mejor.»

## Cómo se desarrolló (2 minutos)

1. **Requisitos:**
   - del cliente: registro, interactividad, clima, cuándo sembrar y enfoque en Latacunga;
   - del reto NASA: usar POWER, MODIS y SMAP, y comparar 3 rotaciones con su porqué, evidencia, beneficios, vacíos y riesgos.
2. **Contrato primero:** se definieron el modelo de datos y la API en `PROYECTO.md` antes de programar. El frontend y el backend se construyeron contra ese contrato.
3. **Por módulos:** cada módulo se implementó, se probó y se documentó antes del siguiente: autenticación, terrenos, clima, pronóstico, calendario, rotaciones, escenarios, capas, tendencias, panel técnico, PDF, gráficas y delimitación.
4. **Reglas explicables en lugar de inteligencia artificial opaca:** cada celda del calendario y cada puntaje trae su motivo en texto, de modo que un técnico puede auditarlo.
5. **Calidad verificada:** en esta auditoría aprobaron **704 unitarias (479 backend + 225 frontend)** y la compilación. El último `check` completo respaldado por registros es de `bf3ff2b`: **908 pruebas**, incluidas 163 PostgreSQL y 50 de navegador. No se atribuye ese total a v4 ni se afirma una nueva ejecución completa. Los resultados y sus revisiones están separados en [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md).
6. **Robustez:** si NASA no responde, la aplicación usa la caché o un respaldo verificado de la misma celda de la cuadrícula. Nunca inventa valores.

**Arquitectura en una frase:** React consulta los datos agrícolas y climáticos mediante nuestra API (Node y Express), que usa PostgreSQL, NASA y Open-Meteo, calcula y genera el PDF. El mapa base carga teselas de OpenStreetMap con atribución. La aplicación está publicada en Vercel y Railway.

## Antes de la presentación

- [x] Publicación con delimitación y catálogo ampliado comprobada por consultas de solo lectura el 15-11-2026: tres migraciones aplicadas, 29 cultivos y motor v4. Esto no requiere volver a publicar ni migrar para la demostración.
- [ ] Comprobar disponibilidad de las URL el día de la presentación y revisar las versiones indicadas en el estado actual.
- [ ] Preparar una cuenta de demostración con un terreno de ejemplo, que no sea de una persona real.
- [ ] Abrir de antemano el detalle del terreno y la climatología, para que los datos queden en caché.
- [ ] Tener a mano un celular para mostrar el dibujo táctil.
- [ ] Llevar un PDF ya descargado por si falla la conexión.

## Recorrido sugerido (8–10 minutos)

### 1. Registrar un terreno

1. Abrir "Mis terrenos", luego "Ubica tu terreno".
2. Tocar el mapa: aparece el marcador y las coordenadas se completan solas.
3. Escribir el nombre, el área declarada, el riego y el tipo de suelo, y guardar.
4. Mensaje clave: la altitud se estima automáticamente (Open-Meteo / Copernicus DEM, 90 m).

### 2. Delimitar la zona agrícola

1. En el detalle del terreno, elegir "Delimitar mi zona de cultivo" y luego "Delimitar zona de cultivo".
2. Tocar las esquinas de la parcela. Las líneas unen los puntos.
3. Tocar el punto 1 para cerrar. El interior se pinta de verde y el exterior se oscurece.
4. Mostrar el área en m² y en ha, y la diferencia con el área declarada.
5. Arrastrar un punto o tocar un «+» para añadir un vértice. Mostrar cómo cambia el área al instante.
6. Guardar y recargar la página: la zona sigue ahí.
7. Optativo: dibujar un contorno cruzado («moño») para mostrar que el sistema lo explica y no lo guarda.

### 3. Consultar el clima

1. Abrir "Climatología histórica". Señalar la etiqueta "Dato histórico", la fuente NASA POWER y el periodo.
2. Abrir "Pronóstico y posibles heladas". Señalar la etiqueta "Pronóstico" (Open-Meteo) y el umbral preventivo de helada.

### 4. Interpretar las gráficas

1. Tocar una barra de lluvia: aparece el valor exacto en mm.
2. Leer el recuadro "En pocas palabras" (mes más lluvioso y más seco, calculados con los datos mostrados).
3. Abrir "¿Cómo interpretar esta gráfica?" y recorrer: ejes, colores, valores altos y bajos, precauciones y ejemplo.
4. En temperaturas, señalar la línea roja de 2 °C (límite de riesgo alto de helada según la regla del proyecto).
5. Mencionar los colores fijos por variable: azul = lluvia, morado = mínima y heladas, marrón = humedad del suelo.

### 5. Usar el calendario

1. "¿Qué puedo sembrar?" muestra el resumen del mes actual.
2. En la matriz, tocar una celda para leer su motivo (lluvia frente a la que necesita el cultivo, helada, ventana de siembra).
3. Mostrar **29 cultivos × 12 meses = 348 casillas**, búsqueda y filtros. Explicar los cuatro estados: recomendado, posible con precaución, no recomendado y no determinado. El gris expresa información faltante o conflicto de fuentes; una exclusión independiente tiene prioridad.
4. Explicar v4: el riego declarado no confirma agua ilimitada. Con lluvia bajo el mínimo del ciclo o del mes se informa dependencia del riego. No se calculan caudales ni turnos; sin parámetro o lluvia se declara la limitación sin inventar una dependencia. En berro falta confirmar agua permanente. La época referencial se informa sin imponer por sí sola un estado.

### 6. Comparar rotaciones

1. Mostrar las tres tarjetas: la rotación actual y dos alternativas.
2. Explicar la escala de 0 a 100 de las barras: una barra más larga es más favorable dentro del modelo.
3. Abrir "Evidencia, ventajas y límites".

### 7. Simular escenarios

1. Mover la lluvia a −20 %.
2. Señalar la etiqueta "Escenario hipotético" y las barras grises (original) frente a las amarillas rayadas (simulado).
3. Mostrar qué celdas del calendario cambian y su motivo.

### 8. Generar el informe PDF

1. Pulsar "Descargar informe PDF".
2. Mostrar la portada, el resumen para el agricultor, la sección «1. El terreno» con el croquis de la zona delimitada y las advertencias.

### 9. Explicar las fuentes NASA

- **NASA POWER** (climatología y tendencias): datos del reanálisis MERRA-2 en celdas de 0,5° × 0,625° (unos 50 km) y radiación solar en celdas de 1°. Se consultan mediante la API oficial, se guardan en caché 30 días y, si NASA no responde, se usa un respaldo verificado de la misma celda.
- **MODIS NDVI y SMAP** (capas satelitales): imágenes regionales servidas por NASA GIBS.
- **Open-Meteo** no es de la NASA. Se usa para el pronóstico porque NASA POWER no ofrece pronósticos.
- **Recomendaciones:** NASA POWER proporciona el clima; RotaAndes aplica reglas propias con fuentes agronómicas INIAP/FAO y otras referencias identificadas. NASA no recomienda directamente qué sembrar ni avala los resultados.

### 10. Limitaciones técnicas y científicas

- El clima es regional: no describe el microclima de cada parcela ni el interior exacto de la zona dibujada.
- El catálogo de cultivos y las reglas son referenciales y no cuentan con validación agronómica local.
- Los puntajes de rotación son índices de una heurística explicable. No son probabilidades, rendimientos ni ingresos.
- El simulador aplica variaciones simples a la climatología. No es un modelo climático ni un pronóstico.
- La superficie dibujada es aproximada y no es una medición catastral.
- La aplicación es una herramienta de apoyo y no reemplaza al agricultor ni al técnico.

## Preguntas frecuentes del jurado

**¿Cómo se dibuja el polígono? ¿Usan una biblioteca externa?**
El dibujo usa Leaflet y React Leaflet, que ya estaban en el proyecto, sin bibliotecas de dibujo adicionales. Cada toque añade un vértice. Los vértices son marcadores que se pueden arrastrar, y los «+» insertan puntos intermedios. Se evaluaron Leaflet.draw, sin mantenimiento activo desde 2018, y Leaflet-Geoman, que añade peso y tiene una interfaz en inglés. Se prefirió un editor propio, más pequeño y accesible.

**¿Funciona en celular y sin ratón?**
Sí. El dibujo responde a toques, y los puntos son grandes para el dedo. Las pruebas automáticas dibujan con toques en un celular de 390 px y con el ratón en escritorio. Sin ratón, se mueve el mapa con las flechas y se usa "Añadir punto en el centro". También se pueden escribir las coordenadas a mano.

**¿En qué formato se guarda?**
Como GeoJSON `Polygon` (RFC 7946): coordenadas WGS84 en orden [longitud, latitud], un único contorno cerrado y en sentido antihorario. Se guarda en la columna opcional `poligono` (JSONB) de la tabla `terrenos`. Los terrenos antiguos quedan con `NULL` y siguen funcionando como un punto.

**¿Qué validaciones hay?**
Se validan en el navegador y otra vez en el servidor, que es quien decide:

- de 3 a 100 vértices, sin repetidos;
- coordenadas en rango;
- contorno cerrado y sin lados que se crucen;
- todos los puntos a menos de 10 km del terreno;
- superficie entre 10 m² y 10 000 ha.

**¿Cómo calculan la superficie y con qué precisión?**
Se usa el área geodésica sobre una esfera de 6 378 137 m de radio, con la fórmula de Chamberlain y Duquette (2007), la misma que usan las herramientas GeoJSON habituales. Para parcelas pequeñas, la diferencia con el elipsoide WGS84 es menor al 0,5 %. Las pruebas comprueban 1 ha ± 0,5 % para un cuadrado de 100 m. El error dominante es el dibujo: el mapa base y la precisión del dedo pueden desplazar cada vértice varios metros. Por eso se presenta como aproximada.

**¿Reemplaza el área declarada?**
No. Se muestran las dos y su diferencia en hectáreas y en porcentaje. El agricultor decide si corrige su área declarada.

**¿Puede un agricultor modificar la parcela de otro?**
No. Las rutas `PUT` y `DELETE /api/terrenos/:id/delimitacion` filtran por el usuario del token y responden 404 si el terreno no es suyo. El técnico puede ver la zona, pero recibe 403 si intenta modificarla. Hay pruebas automáticas de estos permisos.

**¿El clima corresponde al interior del polígono?**
No. NASA POWER entrega valores de una celda de unos 50 km. La delimitación no cambia ningún cálculo de NASA, del calendario ni de las rotaciones. La aplicación y el PDF lo advierten.

**¿Por qué los datos de NASA y no una estación local?**
El reto pide usar observaciones de la Tierra de la NASA. Además, NASA POWER ofrece series largas y homogéneas para cualquier punto. Una estación local sería un buen complemento futuro.

**¿Qué pasa si NASA no responde durante la demo?**
Se usa la caché de 30 días o un respaldo verificado de la misma celda de la cuadrícula, y siempre se indica cuál se usó. Si no hay datos fiables, no se muestran cifras inventadas.

**¿Las gráficas pueden engañar?**
Se cuidó que no:

- las barras empiezan en 0;
- la humedad del suelo usa siempre la escala completa de 0 a 1;
- ninguna gráfica mezcla unidades en un mismo eje;
- los datos ausentes no se dibujan como cero;
- cada gráfica indica si muestra un dato histórico, un pronóstico, un escenario hipotético o un índice.

Solo las líneas de temperatura ajustan su escala a los valores para que se lean bien. Por eso conviene leer los números del eje o del cuadro emergente.

**¿Las fotos y animaciones tienen derechos de uso?**
Sí:

- la portada y el paisaje fotográfico interior son estáticos; las antiguas animaciones y el botón de pausa pertenecen a fases anteriores;
- las fotografías son de Wikimedia Commons con licencias CC BY 2.0 y CC BY-SA 4.0, según cada imagen;
- cada foto muestra a su autor y su licencia en pantalla, y los detalles están en `frontend/public/imagenes/CREDITOS.md`.

Se conserva el ajuste de movimiento reducido para las transiciones restantes. Las licencias y las pruebas de contraste no equivalen a una certificación WCAG completa.

**¿Cómo se protegen los datos de los agricultores?**
- Las contraseñas se guardan con bcrypt y nunca se envían de vuelta.
- La sesión usa JWT de 15 minutos.
- Cada consulta se filtra en el servidor por el usuario del token.
- Hay límites de intentos en el inicio de sesión.
- El PDF no incluye teléfono, notas privadas ni datos de contacto.

**¿Qué se entrega al cliente?**
- Un ZIP con el código fuente, sin credenciales.
- Un ZIP con el esquema de la base de datos, las migraciones y datos ficticios restaurables.
- Los manuales de usuario y técnico.
- Esta guía, el recorrido de demostración y los informes de cada fase con sus capturas.

Los ZIP y capturas de las fases anteriores son artefactos externos/locales, no archivos descargables del repositorio público. Un ZIP histórico puede contener diez cultivos y dos migraciones; no presentarlo como un paquete actualizado a v4 sin regenerarlo y verificarlo en otra tarea autorizada. Esta auditoría actualiza documentación, sin regenerar esos paquetes.

