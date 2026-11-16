# Mejora de comprensión de las gráficas

> **Registro histórico de esta fase.** Se conservan sus fechas, versiones, cifras y resultados; las menciones a publicación pendiente o a repositorio privado describen ese momento. Para la versión vigente, las instrucciones actuales y las evidencias verificadas el 15-11-2026, consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los comandos de publicación, migración o reversión de este registro no son instrucciones para la auditoría documental actual.

Fecha: 13 de noviembre de 2026. Solicitud: facilitar la lectura a primera vista para Steeven y agricultores sin conocimientos técnicos.

## Versión y alcance

- Base: `69f925be012ccbf28e537fecd870c8aeb0bebc20`.
- Rama local: `feat/comprension-graficas`.
- Estado: cambios preparados para revisión, sin push ni despliegue. El ZIP final permanece sin modificaciones.
- Se conservan las funcionalidades de la versión base. No se modifican backend, autenticación, PostgreSQL, contratos, cliente HTTP, cálculos agrícolas ni configuración de producción.

## Cambio visible

Se añade una explicación «Para leerla» junto a cada gráfica. Es visible sin abrir la ayuda y orienta la comparación antes de interpretar los resultados. Ejemplo para lluvia mensual:

> Cada barra es un mes: más alta significa más lluvia y más baja, menos, cuando hay datos. Compara los meses habitualmente más lluviosos o secos; no indica cuánto lloverá este año.

No se eliminan ni reescriben los títulos, descripciones anteriores, leyendas, unidades, escalas, colores, fuentes, periodos, resúmenes calculados, tooltips o ayudas desplegables. Se mantienen las series incompletas, huecos y estados no determinados.

| Gráfica o indicador | Qué aclara la explicación nueva |
| --- | --- |
| Lluvia de cada mes | Cada barra es un mes; altura mayor/menor significa más/menos lluvia habitual, sin predecir este año. |
| Temperaturas de cada mes | Cada línea sigue máxima, media o mínima; arriba/abajo significa más calor/frío; permite comparar meses habitualmente fríos. |
| Humedad mensual | Cada barra representa el índice regional de raíces: cerca de 1, más húmedo; cerca de 0, más seco; no mide el agua del lote. |
| Temperaturas previstas | Cada punto es un día; naranja/morada son máxima/mínima; la referencia roja sirve para reconocer alertas preventivas, sin confirmar heladas. |
| Lluvia prevista | Cada barra es un día del pronóstico; mayor altura indica más lluvia prevista; no se confunde con el promedio mensual NASA. |
| Lluvia anual | Cada barra es un año completo; permite comparar años lluviosos/secos, sin deducir una tendencia de un solo año. |
| Mes más frío anual | Cada punto es el promedio de mínimas del mes más frío; no es una temperatura mínima absoluta ni un pronóstico. |
| Días de helada anuales | Recuentos modelados de mínima ≤ 0 °C; una barra alta significa más días; los huecos no equivalen a cero. |
| Humedad superficial anual | Compara promedios regionales entre años, en índice 0–1; no son porcentajes ni mediciones de la parcela. |
| Indicadores de rotación | Comparar la misma fila entre opciones; barras largas/cortas son más/menos favorables en el modelo, incluida compatibilidad climática; no representan cosechas ni dinero. |
| Comparación del simulador | Gris = original; amarilla rayada = hipotético. Comparar la misma rotación y leer los cambios como puntajes, no como un pronóstico o garantía. |

La explicación de rotaciones se reutiliza también en las tarjetas originales y simuladas. No se altera el calendario ni la lógica de selección, clasificación o comparación de estrategias.

## Presentación y accesibilidad

- Texto HTML de lectura normal, con etiqueta destacada y fondo claro; no requiere pasar el cursor.
- Tamaño de 14 px, interlineado 1,6 y ajuste de línea, sin ancho fijo ni truncamiento.
- Contraste calculado entre los colores CSS de texto y fondo del bloque nuevo: 9,91:1. Este resultado no constituye por sí solo una auditoría WCAG completa.
- Cada figura relaciona su orientación mediante `aria-describedby`; las listas de indicadores de rotación hacen lo mismo.
- Las ayudas detalladas y sus precauciones conservan apertura/cierre por teclado.
- Las verificaciones de navegador comprueban orientaciones, leyendas y ayuda conservada en las nueve figuras, además de rotaciones y simulador.

## Pruebas y evidencias

`npm.cmd run check` terminó con código de salida **0**. Reunió lint, comprobación estricta de tipos, pruebas, PostgreSQL, compilación y los recorridos de navegador. Resultado: **824 pruebas aprobadas, las 810 anteriores más 14 nuevas**, sin eliminar pruebas previas.

| Comprobación | Resultado verificado |
| --- | --- |
| ESLint | Aprobado, sin advertencias de lint. |
| TypeScript | Aprobado, incluidos frontend, backend y herramientas de pruebas. |
| Backend | 401 pruebas aprobadas. |
| Frontend | 217 pruebas aprobadas: 203 anteriores y 14 nuevas. |
| PostgreSQL aislado | 158 pruebas aprobadas; dos migraciones existentes, sin pendientes. |
| Build de backend y frontend | Aprobado. |
| Playwright completo | 48 pruebas aprobadas, incluidos los recorridos finales de escritorio y móviles de 320, 375 y 390 px. |
| `npm.cmd run check` | Código 0; total 824 = 401 + 217 + 158 + 48. |

Los seis recorridos finales usados para las capturas (tres antes y tres después) son comprobaciones adicionales y no se suman a las 824 de `check`. No se detectaron errores JavaScript en esos recorridos y se verificaron lectura técnica, PDF auténtico y persistencia agrícola intacta.

La compilación conserva el aviso existente de Vite sobre un chunk mayor de 500 kB (principal de aproximadamente 561 kB sin comprimir). El ejecutor también avisa de `NO_COLOR`/`FORCE_COLOR`; son avisos no bloqueantes, no fallos de la aplicación. No se amplía el alcance con una reorganización del bundle.

Los casos nuevos verifican orientación visible con la ayuda cerrada, descripción accesible, interpretación de barras/líneas, umbral recibido sin reemplazarlo por una constante, días de helada ausentes, lluvia nula y separación de índices/simulaciones frente a datos reales. Las pruebas anteriores se conservan; el recorrido integral añade comprobaciones de ayuda por teclado y de las nueve figuras, tres tarjetas y simulador.

Durante la validación se acotaron dos selectores nuevos que encontraban el mismo texto en la orientación y en la ayuda detallada. Fue una ambigüedad de las pruebas nuevas, sin necesidad de cambiar datos o funcionalidades. También se corrigió el encuadre de capturas para evitar encabezados y tooltips sobre las curvas.

Las capturas de referencia se tomaron con el frontend de `69f925b` y se regeneraron desde una exportación limpia de ese commit para mejorar el encuadre. Las posteriores usan la compilación de los cambios locales. Los tres recorridos finales de referencia y los tres posteriores terminaron correctamente en escritorio de 1366 px y móviles emulados de 390 y 320 px.

La galería contiene 33 pares (66 PNG), once grupos por vista. La tarjeta de rotación es representativa de una orientación reutilizada en las tres opciones; la captura del simulador conserva el contexto completo de ese módulo y puede desplazarse en la galería. Se oculta el encabezado fijo únicamente durante la captura para evitar que tape los títulos y se retira el puntero del área de las curvas; esto no cambia la aplicación ni elimina sus tooltips.

La comparación estructural con el commit base verifica que 53 nodos gráficos/ayudas y los atributos originales de los marcos permanecen iguales. También confirma que backend, librerías de cálculo, tipos, APIs, dependencias, documentos protegidos, `main`, `release/publicacion` y la etiqueta de la primera entrega no se han modificado. La evidencia está en `.tmp/evidencias/comprension-graficas/auditoria-conservacion.json`.

Se utiliza PostgreSQL local aislado, cuentas temporales y los motores existentes. Los valores meteorológicos proceden de fixtures sintéticos controlados; las imágenes NASA del recorrido son archivos de prueba ya existentes. Las evidencias sirven para comparar la presentación, no para afirmar disponibilidad actual de proveedores ni validez agronómica nueva.

Ubicación local de las evidencias, excluida de Git:

- Galería comparativa: `.tmp/evidencias/comprension-graficas/comparativa.html`.
- Comparativas completas de lluvia, listas para revisar juntas: `.tmp/evidencias/comprension-graficas/comparacion-lluvia-escritorio-1366.png` y `comparacion-lluvia-celular-390.png`.
- Antes: `.tmp/evidencias/comprension-graficas/antes/<vista>/`.
- Después: `.tmp/evidencias/comprension-graficas/despues/<vista>/`.
- Vistas: `escritorio-1366`, `celular-390`, `celular-320`.
- Grupos: `climatologia-1..3.png`, `pronostico-1..2.png`, `tendencia-1..4.png`, `rotacion.png`, `simulador.png`.
- Registro de la batería completa: `.tmp/check-comprension-graficas.log`.
- Resumen verificado de resultados: `.tmp/evidencias/comprension-graficas/validacion.json`.
- Inventario de capturas y SHA-256: `.tmp/evidencias/comprension-graficas/capturas.json`.

La galería se abrió en Edge sin conexiones HTTP; se verificaron sus 33 pares, 66 imágenes referenciadas, decodificación de las comparativas y ausencia de desbordamiento en escritorio y celular. La verificación está en `.tmp/evidencias/comprension-graficas/verificacion-galeria.json`.

## Base de datos, seguridad y Git

La comprobación posterior, con transacciones exclusivamente de lectura, confirma que las seis tablas del modelo en `rotaandes_pruebas_36cbc85c` quedaron sin registros residuales. Las dos migraciones existentes siguen aplicadas en desarrollo y pruebas. No se cambió el esquema ni se accedió a PostgreSQL de producción. Evidencia: `.tmp/evidencias/comprension-graficas/estado-bases.json`.

Se revisaron las adiciones y los catorce archivos modificados o creados. No se encontraron credenciales ni cambios fuera del alcance; `.env`, capturas, logs, exportación de referencia y resultados generados siguen ignorados por Git. `git diff --check` no detecta errores de espacios.

Los cambios quedan locales, sin commit, para revisión en `feat/comprension-graficas`; `HEAD` continúa en `69f925b`. No hubo push, despliegue ni modificación del ZIP final. Las ramas protegidas y la etiqueta permanecen intactas.

## Archivos de implementación y pruebas

- `frontend/src/components/AyudaGrafica.tsx`: bloque visible reutilizable y descripción accesible.
- `frontend/src/components/GraficasClima.tsx`, `GraficasPronostico.tsx`, `GraficasTendencia.tsx`: textos de orientación.
- `frontend/src/components/ComparadorRotaciones.tsx`, `SimuladorEscenarios.tsx`: orientación para barras de puntajes.
- `frontend/src/estilos.css`: estilo exclusivo del bloque nuevo.
- `frontend/src/components/LecturaGraficas.test.tsx`: doce casos nuevos de lectura visible, límites y datos ausentes.
- `frontend/src/components/ComparadorRotaciones.test.tsx`, `SimuladorEscenarios.test.tsx`: dos casos nuevos, conservando los anteriores.
- `tests/navegador/entregaFinal.spec.ts`: amplía el recorrido existente con comprobaciones de lectura y ayuda por teclado.
- `README.md`, `docs/DECISIONES.md` y este informe: documentación de la mejora local.

## Límites y revisión pendiente

La explicación ayuda a comparar; no cambia el significado científico ni acredita mediciones del terreno. Se conservan las advertencias regionales, el catálogo referencial y la incertidumbre de los modelos. No se introducen recomendaciones de manejo agrícola.

La comprensión efectiva por Steeven todavía debe revisarse con él. Las pruebas técnicas y las capturas no sustituyen esa evaluación con el cliente. La publicación y la actualización del ZIP no forman parte de esta tarea.
