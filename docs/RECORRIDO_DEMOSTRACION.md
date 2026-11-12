# Recorrido de demostración (guion de 10 minutos)

Para quien presente RotaAndes ante el jurado. Sigue el orden de la historia de `PROYECTO.md` §2 («Don Luis, agricultor de Pujilí») con datos ficticios. Las respuestas a preguntas difíciles están en la [guía de defensa](GUIA_DEFENSA_JURADO.md).

## Preparación (el día anterior)

| Opción | Cuándo usarla | Cómo |
| --- | --- | --- |
| **A. Versión publicada** | Si la publicación con la delimitación ya está autorizada y desplegada | Crear una cuenta de demostración nueva en https://rotaandes.vercel.app y registrar el «Lote Pujilí» en vivo |
| **B. Versión local con datos de demostración** | Si no hay conexión estable o la publicación sigue pendiente | Restaurar el paquete `rotaandes-base-datos-demo` (ver su `LEEME.md`), arrancar `npm run dev` e ingresar con `demo.agricultor@example.invalid` |

En ambos casos:

- [ ] Abrir una vez la climatología y las tendencias del terreno de demostración, para que queden en caché.
- [ ] Descargar el PDF y guardarlo como respaldo.
- [ ] Tener un celular con la aplicación abierta para mostrar el dibujo táctil.
- [ ] Cerrar las demás pestañas y subir el zoom del navegador al 110 %.

## Guion

| Minuto | Pantalla | Qué hacer | Qué decir |
| --- | --- | --- | --- |
| 0:00 | Portada | Mostrar el fondo en movimiento y las fotos de la sierra | «Herramienta de apoyo para Latacunga y Cotopaxi, con datos de la NASA. El fondo puede pausarse y se detiene si el equipo pide menos movimiento.» |
| 0:45 | Mis terrenos y Lote Pujilí | Abrir el detalle | «Cada terreno es un punto en el mapa; la altitud se estima sola (3150 m).» |
| 1:30 | Zona de cultivo | Delimitar: tocar 5 esquinas, cerrar en el punto 1, arrastrar un punto y guardar | «El agricultor dibuja su zona. Vemos el área aproximada y la diferencia con lo que declaró. No es catastral.» |
| 3:00 | Climatología | Tocar una barra de lluvia y abrir «¿Cómo interpretar esta gráfica?» | «Cada gráfica dice si es dato histórico, de dónde viene, sus unidades, y explica cómo leerla.» |
| 4:00 | Climatología, temperaturas | Señalar la línea roja de 2 °C | «Si la mínima se acerca a 2 °C, hay riesgo alto de helada según la regla del proyecto.» |
| 4:30 | Pronóstico | Abrir los 7 días | «Esto es pronóstico de Open-Meteo, separado del histórico NASA, con alerta si la mínima es ≤ 2 °C.» |
| 5:15 | Calendario | Resumen del mes y tocar una celda | «Cada color trae su motivo; lo amarillo dice qué falta.» |
| 6:15 | Rotaciones | Comparar las 3 tarjetas | «Papa, papa, papa frente a dos alternativas. Las barras son índices de 0 a 100 de un modelo explicable, no rendimientos.» |
| 7:30 | Simulador | Lluvia −20 % | «Gris es el original, amarillo rayado es el escenario hipotético. Vemos qué meses dejan de ser recomendados.» |
| 8:30 | Informe PDF | Descargar y mostrar la página 4 | «El informe incluye el croquis de la zona, el resumen para el agricultor y todas las fuentes.» |
| 9:15 | Panel técnico (opcional) | Entrar con la cuenta técnica | «El técnico ve todos los terrenos y alertas, pero no puede modificarlos.» |
| 9:45 | Cierre | — | «No reemplaza al agricultor ni al técnico: ordena información para conversar mejor.» |

## Si algo falla en vivo

| Problema | Respuesta |
| --- | --- |
| NASA no responde | La aplicación usa la caché o el respaldo de la misma celda y lo indica. Mostrar esa etiqueta como ventaja. |
| No carga el mapa base | Las coordenadas y la lista de puntos siguen funcionando, y el croquis del PDF no depende del mapa. |
| No hay Internet | Usar la opción B (local) o el PDF guardado. |
| El jurado pide otro lugar | Crear un terreno nuevo tocando el mapa: la climatología se consulta en vivo para esas coordenadas. |
