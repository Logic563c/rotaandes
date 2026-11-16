# Recorrido de demostración (guion de 10 minutos)

Para quien presente RotaAndes ante el jurado. Sigue el orden de la historia de `PROYECTO.md` §2 («Don Luis, agricultor de Pujilí») con datos ficticios. Las respuestas a preguntas difíciles están en la [guía de defensa](GUIA_DEFENSA_JURADO.md).

Actualizado el **15-11-2026** para el motor v4. La aplicación ya tiene delimitación y catálogo ampliado; no desplegar ni migrar para seguir el guion. Consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md) antes de atribuir una versión o un número de pruebas.

## Preparación (el día anterior)

| Opción | Cuándo usarla | Cómo |
| --- | --- | --- |
| **A. Versión publicada** | Aplicación vigente en Internet | Usar una cuenta propia de demostración o registrar una con datos ficticios en https://rotaandes.vercel.app; no mostrar datos de agricultores reales |
| **B. Versión local preparada** | Si no hay conexión estable | Seguir la instalación del [README](../README.md), preparar antes una cuenta y un terreno ficticios y arrancar `npm run dev`. La semilla actual no crea usuarios demo. Un ZIP histórico requiere revisar su `LEEME.md`, versión y catálogo antes de restaurarlo |

En ambos casos:

- [ ] Abrir una vez la climatología y las tendencias del terreno de demostración, para que queden en caché.
- [ ] Descargar el PDF y guardarlo como respaldo.
- [ ] Tener un celular con la aplicación abierta para mostrar el dibujo táctil.
- [ ] Cerrar las demás pestañas y subir el zoom del navegador al 110 %.

## Guion

| Minuto | Pantalla | Qué hacer | Qué decir |
| --- | --- | --- | --- |
| 0:00 | Portada | Mostrar las fotografías estáticas y sus créditos | «Herramienta de apoyo para Latacunga y Cotopaxi. NASA POWER aporta el clima; RotaAndes aplica reglas agronómicas referenciales.» |
| 0:45 | Mis terrenos y Lote Pujilí | Abrir el detalle | «Cada terreno es un punto en el mapa; la altitud se estima sola (3150 m).» |
| 1:30 | Zona de cultivo | Delimitar: tocar 5 esquinas, cerrar en el punto 1, arrastrar un punto y guardar | «El agricultor dibuja su zona. Vemos el área aproximada y la diferencia con lo que declaró. No es catastral.» |
| 3:00 | Climatología | Tocar una barra de lluvia y abrir «¿Cómo interpretar esta gráfica?» | «Cada gráfica dice si es dato histórico, de dónde viene, sus unidades, y explica cómo leerla.» |
| 4:00 | Climatología, temperaturas | Señalar la línea roja de 2 °C | «Si la mínima se acerca a 2 °C, hay riesgo alto de helada según la regla del proyecto.» |
| 4:30 | Pronóstico | Abrir los 7 días | «Esto es pronóstico de Open-Meteo, separado del histórico NASA, con alerta si la mínima es ≤ 2 °C.» |
| 5:15 | Calendario | Cambiar mes, mostrar 29 cultivos, filtros y abrir una casilla | «Son 348 casillas: recomendado, precaución, no recomendado y no determinado. Amarillo indica riesgo manejable; gris, información faltante o conflicto. El riego puede ser necesario sin que conozcamos su caudal.» |
| 6:15 | Rotaciones | Comparar las 3 tarjetas | «Papa, papa, papa frente a dos alternativas. Las barras son índices de 0 a 100 de un modelo explicable, no rendimientos.» |
| 7:30 | Simulador | Lluvia −20 %; revisar filtro de cultivos con cambios y motivos | «En las barras, gris es el original y amarillo rayado el escenario. Los cambios dependen del terreno y los datos; no se garantiza que un control cambie un color.» |
| 8:30 | Informe PDF | Descargar y localizar la sección del terreno | «Incluye croquis, calendario completo y fuentes. Siempre usa el escenario original; la paginación depende de los datos.» |
| 9:15 | Panel técnico (opcional) | Entrar con la cuenta técnica | «El técnico ve todos los terrenos y alertas, pero no puede modificarlos.» |
| 9:45 | Cierre | — | «No reemplaza al agricultor ni al técnico: ordena información para conversar mejor.» |

## Si algo falla en vivo

| Problema | Respuesta |
| --- | --- |
| NASA no responde | La aplicación usa la caché o el respaldo de la misma celda y lo indica. Mostrar esa etiqueta como ventaja. |
| No carga el mapa base | Las coordenadas y la lista de puntos siguen funcionando, y el croquis del PDF no depende del mapa. |
| No hay Internet | Usar la opción B previamente preparada o el PDF guardado. El inicio local requiere PostgreSQL y respaldos/cachés disponibles; no garantiza mapas o pronósticos sin conexión. |
| El jurado pide otro lugar | Crear un terreno nuevo tocando el mapa: la climatología se consulta en vivo para esas coordenadas. |
