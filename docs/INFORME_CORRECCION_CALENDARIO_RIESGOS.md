# Corrección de riesgos del calendario (15-11-2026)

## Diagnóstico previo a los cambios

Base publicada: `500077b`. Rama de corrección: `feat/calendario-riesgos-justificados`.

- Una consulta de solo lectura encontró **11 climatologías en producción; 10 sin `elevacion_celda_m`**. La caché sigue siendo vigente durante 30 días y el servicio no intenta completar ese metadato. `evaluarTemperatura` convierte su ausencia en `precaucion` en todos los meses, aun sin una incompatibilidad demostrada.
- `evaluarHelada` aplica `precaucion` con riesgo medio y tolerancia desconocida. Además, infiere tolerancia de la frase de INIAP «siembra todo el año», que no documenta resistencia a heladas por especie.
- El indicador de helada del calendario conserva el máximo entre un indicador regional que ya sube un nivel desde 3400 m y el ajuste térmico al terreno. La corrección regional sigue imponiéndose incluso cuando se conoce la diferencia de altitud; puede dominar los doce meses.
- Berro: declarar riego no confirma suelo saturado o agua permanente y limpia. Esa información ausente se representa como amarillo permanente; no hay campo para confirmar esa condición.
- Las ventanas y altitudes referenciales producen precaución por sí mismas, pese a que sus textos reconocen que no están validadas; no identifican un riesgo climático adicional demostrado.
- Los ciclos largos sí alcanzan meses fríos desde muchas fechas de inicio. Eso puede justificar resultados uniformes: no se acortarán ciclos ni se repartirán colores para cambiar esa uniformidad.

Reproducción inicial: `.tmp/correccion-calendario/antes.json`, con los 29 cultivos, diez escenarios ficticios (2750–3650 m, con/sin riego), más dos escenarios del punto público de la revisión anterior. Se conservan entradas y resultados completos antes de modificar reglas. No se leen ni modifican usuarios, terrenos o siembras para este diagnóstico.

## Criterios técnicos para la corrección

- Ausencia de un dato esencial o conflicto de fuentes: no determinado. Una exclusión independiente y documentada sigue teniendo precedencia.
- Ajustar la temperatura una sola vez cuando existe altitud de la celda; no confundir el indicador regional preventivo con un daño observado en el cultivo.
- No deducir resistencia al frío de la posibilidad de sembrar durante todo el año. Usar fuentes por especie y conservar desconocido lo que no está documentado.
- Mantener el ciclo máximo documentado, el riego declarado y las necesidades de agua existentes; no inventar capacidades, tolerancias ni consumos.

Fuentes consultadas: [INIAP, Yugsi 2011](https://repositorio.iniap.gob.ec/items/cc17f928-17fa-4ff8-a44e-ed9dfc740196), [NASA POWER, climatología](https://power.larc.nasa.gov/docs/services/api/temporal/climatology/), [FAO, protección contra heladas, capítulo 4](https://www.fao.org/4/y7223e/y7223e0a.htm), [Iowa State University, tolerancia a heladas leves por hortaliza](https://www.extension.iastate.edu/smallfarms/frost-management-vegetables). La fuente de Iowa describe heladas leves en sus condiciones, no inmunidad a heladas fuertes ni una validación local de Cotopaxi. No se usarán temperaturas de almacenamiento de productos cosechados como umbrales de cultivos vivos.

## Corrección y comparación reproducible

Versión `calendario_ciclo_v3`: renovación de metadatos, ajuste térmico único, resistencia al frío por especie y clasificación honesta de incertidumbre. Sin cambios de esquema, semillas, credenciales ni datos agrícolas existentes. Los ciclos máximos y las 29 especies se conservan.

Mismas 3480 casillas (29 cultivos × 12 meses × 5 altitudes × con/sin riego), con las mismas observaciones NASA archivadas. La renovación de la caché no interviene en esta comparación: todas estas entradas ya tenían elevación.

| Estado | Antes (`500077b`) | Después |
| --- | ---: | ---: |
| Recomendado | 431 | 1047 |
| Posible con precaución | 1472 | 704 |
| No recomendado | 458 | 433 |
| No determinado | 1119 | 1296 |

Los grises aumentan donde faltan condiciones esenciales o las fuentes discrepan; no todos los amarillos pasan a verde. A 3150 m con riego, los rojos aumentan de 11 a 19 al reconocer la sensibilidad documentada de lechuga. El informe local `.tmp/correccion-calendario/comparacion.json` conserva el detalle de los 29 cultivos y sus doce estados por escenario, incluidos apio, berro y col china.
