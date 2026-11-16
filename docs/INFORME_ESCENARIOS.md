# Simulador de escenarios climáticos — Prompt 14

> **Registro histórico de esta fase.** Se conservan sus fechas, versiones, cifras y resultados; las menciones a publicación pendiente o a repositorio privado describen ese momento. Para la versión vigente, las instrucciones actuales y las evidencias verificadas el 15-11-2026, consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los comandos de publicación, migración o reversión de este registro no son instrucciones para la auditoría documental actual.

Fecha: 8 de noviembre de 2026. Rama `feat/escenarios-climaticos`, creada desde `749c67280f3b9f015b8bf8eef834e15b0001a2cb` con Git limpio. La versión pública permanece sin actualizar: aplicación `ec413ca`, cierre documental `749c672`. Esta fase termina con commit local, sin push, merge o despliegue.

## Implementación y datos

Se añade el simulador al detalle del terreno, conservando los paneles anteriores. Controles accesibles de lluvia −30…+30 %, paso 1 %, y temperatura −2…+2 °C, paso 0,5 °C; valores visibles, agrupación de cambios durante 600 ms, restauración al original y actualización de ambos resultados.

Se reutilizan exclusivamente estas rutas autenticadas:

```http
GET /api/terrenos/:id/calendario?lluvia_pct=-30&temp_delta=2
GET /api/terrenos/:id/rotaciones?lluvia_pct=-30&temp_delta=2
```

El original usa cero/cero. `obtenerResultadosEscenario`, en el cliente central, valida ambos JSON con los esquemas existentes y comprueba el eco exacto de los parámetros. No hay rutas nuevas ni modificaciones del contrato, motores, catálogo, semillas, esquema o migraciones. No se instalan dependencias. La ubicación, historial y prioridades siguen procediendo del servidor autenticado; los controles no envían propietario, altitud ni coordenadas.

El backend ya implementaba las fórmulas originales:

```text
lluvia simulada = lluvia histórica × (1 + lluvia_pct / 100)
temperatura simulada mínima/máxima = temperatura histórica + temp_delta
```

El motor existente recalcula riesgos, calendario y rotaciones. No se añaden correcciones por altitud, heurísticas, predicciones o reglas agronómicas. Se conservan ventanas, transiciones de año, condición de brócoli/riego, altitud, heladas, incertidumbre y catálogo combinado de vicia-avena.

Solo se hacen GET para simular. No se guardan escenarios en siembras ni se reemplaza NASA por datos transformados. El servicio climático puede renovar normalmente su caché base cuando corresponde; cambiar parámetros no cambia su clave o vigencia. Open-Meteo continúa mostrando el pronóstico real independiente, sin aplicar los deslizadores.

## Comparación explicable

- Matriz de diez cultivos × doce meses, con estado original y simulado dentro de cada celda, etiquetas/símbolos y marca de cambio. El resumen cuenta únicamente diferencias de estado, no cambios de redacción.
- Diálogo por teclado/tacto con ambos motivos exactos del backend, incluyendo valores, restricciones y avisos. Incluye cultivos incompatibles, que conservan sus estados negativos.
- Cinco indicadores de rotaciones: original, simulado y diferencia en puntos de la escala 0–100. La misma estrategia se identifica por ID, aunque cambie de posición.
- Si entra o sale una plantilla del grupo de tres no se resta el puntaje de otra distinta ni se inventan sus indicadores ausentes. Se informa «No comparable» y se explica la entrada/salida. La API publica fichas completas únicamente para las tres seleccionadas.
- Tres posiciones del escenario seleccionado y las tres originales desplegables, reutilizando las tarjetas, planificación, evidencias, riesgos y vacíos existentes. Las posiciones no determinadas y los índices nulos permanecen explícitos.

`cambios_vs_base` es opcional en el contrato; esta fase no modifica el JSON. Las diferencias de presentación se calculan de los dos resultados validados, sin duplicar la clasificación agrícola ni las puntuaciones del servidor. Las restas usan los índices publicados y se redondean a dos decimales; no son porcentaje de mejora ni una magnitud económica.

Se verifican fuente/fecha/periodo/resolución climática, catálogo, contexto, horizonte y metodología/prioridades antes de comparar. Si cambian, se oculta la comparación y se pide actualizar ambos. NASA reciente y caché pueden corresponder al mismo dato. Los dos endpoints no comparten una transacción de lectura ni incorporan versionado global: no se garantiza una instantánea serializable de ediciones simultáneas desde otras sesiones. Se puede actualizar explícitamente; los cambios propios de siembras invalidan la caché del simulador.

## Seguridad, UX y rendimiento

TanStack Query separa usuario, terreno, contexto, prioridades y escenario; caché visual de 60 s y cancelación/guardas de sesión existentes. No se usa el token como clave ni se reutilizan resultados anteriores como placeholder. Durante espera, carga, error o referencia inconsistente se ocultan resultados para no atribuirlos a otros parámetros. Las respuestas de sesiones cerradas o cambiadas se descartan.

Se mantienen JWT, filtros de propietario, 404 ajeno/inexistente y lectura del técnico con prioridades del propietario. El backend conserva validación estricta y límites de treinta consultas por minuto/usuario/ruta. La agrupación de movimientos y reutilización del original reducen peticiones, sin prometer que un uso intensivo no alcance esa cuota; el error permite reintentar.

Diseño verde/tierra, controles nativos, valores/unidades, avisos, botones de restauración/reintento y foco visible. La matriz desplaza su propio contenido horizontal/verticalmente y mantiene encabezados; el documento no debe desbordarse. No se depende solo del color. Los diálogos se enfocan al inicio, se recorren con teclado y se cierran con Escape.

## Verificaciones

`npm.cmd run check` terminó con **código 0** el 8 de noviembre de 2026. Se ejecutaron todas sus etapas, sin omitir las suites anteriores:

| Comprobación | Resultado ejecutado |
| --- | --- |
| Lint | Código 0, sin advertencias ESLint |
| TypeScript | Código 0, herramientas/backend/frontend estrictos |
| Backend | 262 pruebas, 17 archivos |
| Frontend | 103 pruebas, 11 archivos |
| PostgreSQL aislado | 127 pruebas, diez archivos; migración sin pendientes |
| Build | Ambos paquetes compilados, Prisma Client 7.10.1 |
| Playwright anterior | 16 casos y cuatro integrales, escritorio/celular |
| Playwright del simulador | Dos casos, escritorio y celular, aprobados |
| Total | **514 pruebas aprobadas; ninguna fallida en el cierre** |

Se conservan las 491 anteriores y se añaden 23: 18 de interfaz/comparación, tres SQL y dos E2E. El bundle principal observado fue 484,32 kB, 143,10 kB gzip; mapa y gráficas conservan sus chunks separados. No hubo advertencia de tamaño de bundle.

Durante la construcción se corrigió la presentación de un error del original cuando el usuario movía controles antes de terminar su carga, cubierta por regresión. La invalidación de escenarios al cambiar siembras se incorporó al flujo existente. El primer E2E falló al buscar el botón de login con el nombre incorrecto de la prueba; se corrigió el selector a «Ingresar a mi cuenta» y el recorrido completo se repitió con éxito en ambos tamaños. No se declaró aprobado aquel intento ni se cambió la pantalla de acceso para acomodar la prueba.

Pruebas nuevas:

- Comparación pura: diferencias por ID/mes, determinismo, no mutación, nulos, cambios de ranking y referencias incompatibles.
- Interfaz: límites, consultas con parámetros reales, restauración/caché, cambios rápidos, errores/reintento, datos insuficientes, escenario recibido incorrecto y cambio/cierre de sesión durante consultas.
- PostgreSQL/HTTP: nueve combinaciones −30/0/+30 % y −2/0/+2 °C, repetidas; validación, permisos de agricultores/técnico y comparación de terreno, siembras, catálogo, plantillas y caché antes/después. Transacciones revertidas.
- Navegador: cálculo real del backend y PostgreSQL aislado, controles nativos con Inicio/Fin, 120 celdas, tres posiciones, motivos idénticos al JSON, restauración, ausencia de POST/PUT/DELETE durante la simulación, error controlado/reintento, nueva cuenta sin acceso ajeno y ausencia de desbordamiento.

El recorrido adicional usa `playwright.escenarios.config.ts` con procesos nuevos, después de las suites previas. No se amplían cuotas de autenticación. Ejecutar `npm.cmd run test:escenarios` permite repetirlo solo; `test:e2e` y `check` incluyen las tres suites.

La meteorología/altitud de las pruebas nuevas son **controladas y etiquetadas**, no observaciones nuevas ni predicciones reales. PostgreSQL, HTTP, cálculos y componentes son reales. Se bloquean las teselas externas en este recorrido para no depender de Internet. Solo se simula el error HTTP deliberado en su caso; los resultados exitosos proceden de los motores del servidor. El recorrido nuevo no consulta proveedores; las suites anteriores mantienen sus integraciones de mapa/elevación. No se realizó una nueva verificación climática independiente ni se consultó producción en esta fase.

## Capturas y limpieza

Cada tamaño genera controles-escenarios.png, calendario-comparado.png, explicacion-escenarios.png, simulador-escenarios.png y escenario-no-disponible.png en `test-results/escenarios/`. evidencia-escenarios.json registra parámetros, número de cambios y puntuaciones sin contraseñas ni JWT. Son evidencias locales ignoradas por Git, con datos controlados.

Se conservaron copias fuera del directorio que Playwright limpia, en `.tmp/evidencias-escenarios/`: escritorio (`../.tmp/evidencias-escenarios/escritorio-simulador-escenarios.png`, artefacto local no versionado), celular (`../.tmp/evidencias-escenarios/celular-simulador-escenarios.png`, artefacto local no versionado) y controles/explicaciones de ambos tamaños. En ambos recorridos, −30 % de lluvia y +2 °C cambiaron **cinco de las 120 celdas** para la fixture utilizada. No es un resultado universal ni una predicción para una parcela real. El registro final informa cero errores de página/consola y ninguna escritura HTTP de simulación; el fallo HTTP deliberado y el 404 ajeno forman parte de las verificaciones.

Las cuentas tienen correos/contraseñas aleatorios. El `finally` elimina únicamente esas cuentas, filas de catálogo/plantillas insertadas por el recorrido y restaura su clave de caché anterior. No se borran bases, alteran contraseñas o tocan registros de terceros. Las pruebas SQL usan rollback. Desarrollo y producción no reciben los datos de estas pruebas.

Consulta local de cierre en solo lectura: `rotaandes_dev` conserva cero usuarios/terrenos/siembras, diez cultivos, ocho plantillas y caché vacía; `rotaandes_pruebas_36cbc85c` conserva las seis tablas sin filas. Ambas mantienen aplicada la única migración original. No quedan registros temporales ni se han creado bases adicionales. Los hashes de PROYECTO.md y AGENTS.md coinciden con los originales; esquema, migraciones y lockfile permanecen sin cambios.

## Archivos

Nuevos: SimuladorEscenarios.tsx y su prueba; lib/compararEscenarios.ts y su prueba; tests/escenariosPruebas.ts; backend/tests/base-datos/escenarios.integration.test.ts; tests/navegador/escenarios.spec.ts; playwright.escenarios.config.ts; este informe.

Modificados: cliente api.ts, DetalleTerreno.tsx, exportación de TarjetaEstrategia en ComparadorRotaciones.tsx, invalidación en SiembrasTerreno.tsx, package.json, exclusión del nuevo E2E en playwright.config.ts, README.md y DECISIONES.md.

## Limitaciones

La climatología NASA es histórica/regional, no microclima ni clima futuro. El catálogo y las fórmulas de rotación son referenciales sin validación agronómica local. El simulador no acredita rendimientos, fertilidad, rentabilidad, caudales o probabilidad de éxito. Puede conservar recomendaciones no determinadas y menos de dos alternativas evaluables; no se relajan restricciones para fabricar resultados.

La prueba móvil es emulación Edge 390×844, no un teléfono físico ni certificación integral de accesibilidad. El presupuesto y caducidad de los servicios públicos de la fase anterior no se alteran. Esta actualización requiere una revisión y autorización de publicación posterior. No se inicia ningún otro módulo.
