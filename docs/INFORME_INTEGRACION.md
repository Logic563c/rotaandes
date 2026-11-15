# Integración: calendario agronómico y comprensión de gráficas (15-11-2026)

Versión candidata para revisión del cliente. Sin push, sin merge a `release/publicacion` y sin despliegues; producción no se consultó ni se modificó.

## Ramas y commits

| Commit | Rama | Contenido |
| --- | --- | --- |
| `007e189` | `feat/calendario-agronomico` | Calendario por ciclo, 19 cultivos nuevos (29 en total), migración `20261115000100_catalogo_ampliado`, PDF agrupado. Ver [INFORME_CALENDARIO_AGRONOMICO.md](INFORME_CALENDARIO_AGRONOMICO.md). |
| `c33c1bf` | `feat/comprension-graficas` | Confirma los 14 cambios que estaban sin commit: «Para leerla» en 9 gráficas, rotaciones y simulador. Ver [INFORME_COMPRENSION_GRAFICAS.md](INFORME_COMPRENSION_GRAFICAS.md). Antes del commit, `npm run check` dio 824 pruebas aprobadas. |
| `bfe28d2`, `b5b25af` | `integracion/calendario-graficas` | Fusiones `--no-ff` de ambas ramas sobre `release/publicacion` (`69f925b`). El único conflicto fue en `docs/DECISIONES.md`: se conservan las dos secciones en orden cronológico. El simulador, la prueba final de navegador y los estilos se fusionaron sin conflicto. |
| `eb8f349` | `integracion/calendario-graficas` | Coherencia tras la integración (detalle abajo) |
| Commit siguiente a este informe | `integracion/calendario-graficas` | La portada, la página de fuentes, el mensaje de la semilla y el README hablaban de «diez cultivos»; ahora dicen 29. Solo cambian textos. |

## Ajustes de coherencia (`eb8f349`)

Ninguno cambia un estado ni una regla agrícola. La comparación antes/después da los mismos totales que en la rama del calendario.

- **Cuatro estados con el mismo nombre en todo el sistema:** Recomendado, Posible con precaución, No recomendado y No determinado. Antes, las tarjetas de rotación decían «Compatible según la regla referencial», «Restricción comprobada» o «Información insuficiente»; el simulador y el PDF decían «Posible con cuidado».
- **Cuando faltan datos:** el resumen dice en lenguaje llano qué se desconoce, por ejemplo «no se sabe cuánta agua necesita sin riego» o «no se sabe cuánto resiste las heladas». Justo debajo aparece «Qué puedes hacer», con una acción concreta: indicar el riego, revisar la ubicación o consultar a un técnico. En las casillas con precaución se sugiere cómo manejar el riesgo (proteger de heladas, riego de apoyo, confirmar la época). El PDF incluye la acción en los tramos no determinados.
- **Sin texto duplicado:**
  - La descripción de la gráfica de lluvia ya no repite «Cada barra es un mes», que está en «Para leerla».
  - La tarjeta de rotación ya no repite la regla de la barra, que también está en «Para leerla».
- **Eje de meses a 320 px:** omite las etiquetas que no caben en vez de encimarlas. El valor exacto sigue en el cuadro emergente.
- **PDF:** sus dos gráficas de barras llevan la misma orientación «Para leerla» que la aplicación.

## Verificación

- **`npm.cmd run check`** sobre la integración: código 0. Detalle en el reporte de verificaciones de la entrega.
- **Revisión visual** en escritorio (1366 px) y en celulares de 320, 375 y 390 px:
  - calendario de 29 cultivos, búsqueda, filtros y explicación;
  - las 5 gráficas de clima y tendencias;
  - rotaciones y simulador;
  - PDF.

  Resultado: 0 px de desbordamiento horizontal y 0 errores de JavaScript.
- **Migración:** probada en esquemas desechables de PostgreSQL. Las huellas de usuarios, terrenos y siembras no cambian. El procedimiento está en la entrega.
