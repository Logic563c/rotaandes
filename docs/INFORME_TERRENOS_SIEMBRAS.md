# Informe de terrenos, cultivos y siembras — Fase 2

> **Registro histórico de esta fase.** Se conservan sus fechas, versiones, cifras y resultados; las menciones a publicación pendiente o a repositorio privado describen ese momento. Para la versión vigente, las instrucciones actuales y las evidencias verificadas el 15-11-2026, consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los comandos de publicación, migración o reversión de este registro no son instrucciones para la auditoría documental actual.

Estado: fase implementada, comprobada y lista para revisión en `feat/base-datos-autenticacion`, sobre `b28051b0631dd5695677721ce8474dd5d93dbd71`. Se continuaron los archivos de la fase interrumpida, sin rehacer autenticación ni persistencia. El cierre utiliza el mensaje `Implementar gestion de terrenos y siembras`; su hash se entrega al finalizar y se consulta con `git log -1 --oneline`.

## Rutas implementadas y comprobadas

| Método | Ruta | Acceso y respuesta |
| --- | --- | --- |
| GET | `/api/cultivos` | Público, arreglo de cultivos con campos originales |
| GET | `/api/terrenos` | Agricultor: propios; técnico: todos; arreglo |
| POST | `/api/terrenos` | Solo agricultor; propietario desde JWT; 201 con terreno |
| GET | `/api/terrenos/:id` | Propietario o técnico; terreno |
| PUT | `/api/terrenos/:id` | Solo propietario agricultor; terreno actualizado |
| DELETE | `/api/terrenos/:id` | Solo propietario agricultor; 204 sin cuerpo |
| GET | `/api/terrenos/:id/siembras` | Propietario o técnico; historial ordenado |
| POST | `/api/terrenos/:id/siembras` | Solo propietario agricultor; 201 con siembra |
| PUT | `/api/siembras/:id` | Solo propietario agricultor; siembra actualizada |
| DELETE | `/api/siembras/:id` | Solo propietario agricultor; 204 sin cuerpo |

Se conservan campos snake_case y las rutas del contrato. PUT permite cambios parciales, rechaza cuerpos vacíos y claves no editables. El agricultor no puede cambiar propietario, altitud calculada ni asociaciones de siembras. Un registro ajeno responde 404 igual que uno inexistente; el técnico recibe 403 ante toda escritura. Las consultas no incluyen datos de contacto ni hashes del propietario.

La autorización vuelve a consultar el usuario y su rol en PostgreSQL. Los filtros de propietario se aplican en consultas y mutaciones, incluidas las relaciones. El catálogo es la única ruta pública nueva. Salud, registro, login, sesión y perfil conservan sus pruebas anteriores.

## Modelo y cambios de datos

- Ningún cambio al esquema, tipos, tablas, relaciones o restricciones. No se agregan geometrías ni se modifican migraciones existentes.
- Se conserva `20261107000100_esquema_inicial`, aplicada en las dos bases. Prisma 7.10.1 no tiene migraciones pendientes.
- Se cargaron los diez cultivos autorizados en `rotaandes_dev` mediante semilla transaccional por upsert, ejecutada dos veces para comprobar idempotencia.
- No se crearon usuarios demo, cuentas técnicas, terrenos, siembras ni plantillas persistentes. No se cambiaron credenciales y no se borró o recreó ninguna base.

| Identificador | Cultivo referencial cargado |
| --- | --- |
| `papa` | Papa |
| `haba` | Haba |
| `chocho` | Chocho |
| `quinua` | Quinua |
| `cebada` | Cebada |
| `maiz` | Maíz suave |
| `avena` | Avena forrajera |
| `brocoli` | Brócoli |
| `oca` | Oca |
| `vicia_avena` | Vicia + avena (abono verde) |

Todos los campos y valores se comparan automáticamente contra la sección 10 de `PROYECTO.md`. No se inventaron descripciones: permanecen NULL. Los datos se identifican en la interfaz como referenciales, pendientes de validación local. Los meses de brócoli 1–12 conservan su contexto «con riego» en la documentación y no se convierten en una recomendación automática.

Inspección posterior a la validación, mediante transacciones de solo lectura:

| Base | Usuarios | Terrenos | Cultivos | Siembras | Plantillas | Clima |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `rotaandes_dev` | 0 | 0 | 10 | 0 | 0 | 0 |
| `rotaandes_pruebas_36cbc85c` | 0 | 0 | 0 | 0 | 0 | 0 |

La base de pruebas quedó sin registros residuales. Las pruebas HTTP usan transacciones revertidas; las E2E eliminan exclusivamente sus cuentas aleatorias y los cultivos que hayan insertado, sin reemplazar entradas previas.

## Validaciones y elevación

Se validan UUID, nombre de 2–120 caracteres sin controles, coordenadas numéricas finitas, área positiva hasta 999999,99 ha con dos decimales, booleanos y suelo permitido. El área es declarada, opcional y no se calcula con el mapa. Se preserva nulabilidad del modelo.

Las fechas deben ser reales, de cuatro dígitos de año y formato AAAA-MM-DD. Cosecha opcional o NULL y no anterior a siembra. Se escriben valores DATE a medianoche UTC y se serializan sin hora; la interfaz no aplica conversiones de zona horaria. Notas hasta 2000 caracteres, sin NUL. Cultivo debe existir. Los cambios parciales validan el par de fechas completo antes de persistirlo.

Open-Meteo se verificó con curl antes de integrarlo: el punto (-0.93, -78.62) respondió `{"elevation":[2775.0]}`. La integración vive en backend y valida un arreglo con un único número, rango -12000 a 9000 m, redondeado al entero del modelo. Timeout real de 5 segundos, cuerpo máximo 4096 bytes y redirecciones rechazadas. Errores, valores ausentes y saturación devuelven NULL sin inventar altitudes.

Caché de hasta 500 puntos, 24 horas para éxito y 30 segundos para nulos; deduplicación simultánea, dos solicitudes concurrentes y hasta 20 externas/minuto por proceso. Guardados de terrenos se limitan a 20 por usuario/minuto. El exceso de guardados devuelve 429 con `{ error }`; la saturación del proveedor permite guardar sin altitud.

Se calcula al crear, se recalcula al cambiar coordenadas y se puede reintentar guardando una ubicación que tenga altitud nula. Fuente visible: Open-Meteo / Copernicus DEM GLO-90, resolución de 90 m; se informa que es estimada. Los recorridos reales guardaron 2822 m al editar al punto (-0.94, -78.63), sin simular el proveedor.

## Frontend y evidencias

- `/terrenos`: lista, estado vacío, mapa con marcadores numerados, ventanas informativas y acceso a detalle, alta, edición y confirmación de eliminación.
- `/terrenos/nuevo` y `/terrenos/:id/editar`: selección por clic/toque o coordenadas manuales, nombre, área declarada, suelo, riego y estados de guardado/error. En celular el mapa aparece primero.
- `/terrenos/:id`: ubicación, altitud/fuente, datos, mapa e historial de siembras con registro, edición y eliminación confirmada. Los técnicos tienen consulta sin controles de escritura.
- Navegación integrada con la sesión actual; etiquetas, foco, botones amplios, diálogo modal nativo, carga, vacío, error/reintento y éxito. El formulario conserva entradas si falla el servidor.
- Cachés privadas con ID de usuario y comprobación de sesión antes de usar respuestas tardías. Logout cancela y limpia cachés. El mapa se carga de forma diferida y las respuestas JSON se validan en ejecución mediante el cliente central `lib/api.ts`.

Se inspeccionaron capturas de escritorio y celular (390 × 844); se comprobó ausencia de desbordamiento horizontal, selección real, zoom/atribución, marcador y ventana con enlace. Se repitió el recorrido con las teselas bloqueadas y las coordenadas manuales siguieron disponibles.

Evidencias locales, excluidas de Git; cada carpeta contiene el tamaño indicado por su sufijo:

```text
test-results/terrenosSiembras-recorrido-b391c-mbras-con-persistencia-real-escritorio/crear-terreno.png
test-results/terrenosSiembras-recorrido-b391c-mbras-con-persistencia-real-escritorio/detalle-terreno.png
test-results/terrenosSiembras-recorrido-b391c-mbras-con-persistencia-real-escritorio/mis-terrenos.png
test-results/terrenosSiembras-recorrido-b391c-mbras-con-persistencia-real-celular/crear-terreno.png
test-results/terrenosSiembras-recorrido-b391c-mbras-con-persistencia-real-celular/detalle-terreno.png
test-results/terrenosSiembras-recorrido-b391c-mbras-con-persistencia-real-celular/mis-terrenos.png
test-results/terrenosSiembras-el-mapa-s-8ce64-iva-de-coordenadas-manuales-escritorio/mapa-sin-conexion.png
test-results/terrenosSiembras-el-mapa-s-8ce64-iva-de-coordenadas-manuales-celular/mapa-sin-conexion.png
```

Las capturas contienen fixtures sintéticas, sin contraseñas visibles. Las trazas siguen deshabilitadas para no registrar Bearer ni credenciales.

## Resultados reales

`npm.cmd run check` terminó con **código 0**. Ejecutó toda la cadena de lint, tipos, pruebas unitarias, PostgreSQL, build y Playwright:

| Comprobación | Resultado |
| --- | --- |
| ESLint | Aprobado, cero errores y warnings de lint |
| TypeScript estricto | Aprobado en herramientas, frontend y backend |
| Backend unitario | 95 aprobadas, 7 archivos |
| Frontend | 38 aprobadas, 4 archivos |
| PostgreSQL / HTTP | 92 aprobadas, 3 archivos |
| Build | Backend y frontend aprobados; Prisma Client 7.10.1 |
| E2E Edge | 10 aprobadas en 25,2 segundos, escritorio y celular |
| **Total de check** | **235 aprobadas, cero fallidas** |
| Migraciones desarrollo y pruebas | Actualizadas, sin pendientes |
| Auditoría npm | Cero vulnerabilidades reportadas |
| Semilla de desarrollo | Dos ejecuciones aprobadas, diez cultivos |

También se ejecutaron lint, typecheck, test y build por separado. Las pruebas unitarias cubren incluso el timeout real del proveedor, límites, concurrencia, respuestas ausentes y JSON inválido. Las SQL/HTTP prueban CRUD, acceso horizontal cambiando UUID, permiso técnico, tipos/rangos, campos protegidos, fechas, referencias, persistencia y cascada. Las de interfaz cubren cambio de cuenta con respuesta pendiente y conservan las anteriores de autenticación.

El primer recorrido de navegador detectó una etiqueta de selector que no tenía un nombre accesible inequívoco; se corrigió con asociación explícita label/for. Se corrigió asimismo el nombre accesible del botón de eliminación y el borrado prematuro del formulario de siembra ante errores. Las capturas finales esperan a que termine la carga del mapa para documentar la vista real. Los avisos restantes de NO_COLOR/FORCE_COLOR provienen del runner y no fallan las pruebas.

## Archivos de la fase

42 archivos: 24 agregados y 18 modificados respecto a `b28051b`.

```text
M README.md
M backend/package.json
M backend/prisma.config.ts
A backend/prisma/seed.ts
M backend/src/aplicacion.ts
A backend/src/data/catalogoCultivos.ts
M backend/src/middleware/errores.ts
A backend/src/routes/cultivos.ts
A backend/src/routes/siembras.ts
A backend/src/routes/terrenos.ts
A backend/src/services/datosAgricolas.ts
A backend/src/services/elevacion.ts
A backend/src/services/validacionAgricola.ts
A backend/tests/base-datos/terrenosSiembras.integration.test.ts
A backend/tests/catalogoCultivos.test.ts
A backend/tests/elevacion.test.ts
M backend/tests/salud.test.ts
A backend/tests/validacionAgricola.test.ts
M backend/tsconfig.json
M docs/DECISIONES.md
A docs/INFORME_TERRENOS_SIEMBRAS.md
M frontend/package.json
M frontend/src/Aplicacion.tsx
A frontend/src/TerrenosSiembras.test.tsx
A frontend/src/components/ConfirmarEliminacion.tsx
A frontend/src/components/EstadoConsulta.tsx
M frontend/src/components/Marco.tsx
A frontend/src/components/MapaDiferido.tsx
A frontend/src/components/MapaTerrenos.tsx
M frontend/src/components/ProveedorSesion.tsx
A frontend/src/components/SiembrasTerreno.tsx
M frontend/src/estilos.css
M frontend/src/lib/api.ts
A frontend/src/lib/useAgricultura.ts
M frontend/src/lib/useSesion.ts
A frontend/src/pages/DetalleTerreno.tsx
A frontend/src/pages/EditarTerreno.tsx
A frontend/src/pages/Terrenos.tsx
M frontend/src/types/api.ts
M package-lock.json
M playwright.config.ts
A tests/navegador/terrenosSiembras.spec.ts
```

## Auditoría y límites

Se revisaron los contenidos nuevos/modificados, el esquema y las migraciones, permisos, scripts de semilla, dependencias, pruebas y documentación. No se detectaron secretos en los archivos versionables. `.env`, cliente generado, dependencias, builds, capturas y temporales permanecen ignorados. Las nuevas dependencias son Leaflet 1.9.4, React Leaflet 5.0.0, sus tipos 1.9.22 y la declaración de Zod 4.6.7 en frontend; no se actualizan paquetes anteriores ni Prisma.

`PROYECTO.md` y `AGENTS.md` conservan sus hashes y las migraciones no tienen cambios. `main` permanece en `ee4f8c8542744ddecf64a5f2ab58d6993e6e3431`. El cierre solo registra esta fase; no hace push, merge o despliegue.

Limitaciones: altitud estimada de un modelo digital de elevación, disponibilidad externa de Open-Meteo/teselas, caché y limitación en memoria por proceso, consulta técnica básica sin panel avanzado, ausencia deliberada de polígonos o cálculo de área y valores agronómicos pendientes de validación local. Las teselas se cargan como imágenes públicas del mapa autorizado con atribución y caché HTTP; los datos JSON y elevación pasan por el backend. Las limitaciones anteriores de JWT sin revocación siguen vigentes.

Para revisar localmente, `npm.cmd run dev`, iniciar sesión y abrir http://localhost:5173/terrenos. El catálogo ya está cargado; no hace falta ejecutar SQL ni preparar archivos manualmente. La fase se detiene aquí, sin iniciar el módulo climático.
