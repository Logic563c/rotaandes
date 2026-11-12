# RotaAndes

Plataforma de apoyo a la siembra y rotación de cultivos de Cotopaxi. El alcance completo está en `PROYECTO.md` y las convenciones están en `AGENTS.md`.

## Documentación de entrega (noviembre de 2026)

| Documento | Para quién |
| --- | --- |
| [Manual de usuario](docs/GUIA_CLIENTE.md) | Agricultores y técnicos |
| [Manual técnico](docs/MANUAL_TECNICO.md) | Quien mantenga o explique el sistema |
| [Guía para defender RotaAndes](docs/GUIA_DEFENSA_JURADO.md) y [recorrido de demostración](docs/RECORRIDO_DEMOSTRACION.md) | Presentación ante el jurado |
| [Gráficas y delimitación de parcelas](docs/INFORME_GRAFICAS_Y_DELIMITACION.md) | Detalle técnico de la fase del 12-11-2026 |
| [Informe de la fase de entrega](docs/INFORME_FASE_ENTREGA.md) | Portada animada, fotos, paquetes ZIP y verificación final |
| [Respaldo de producción](docs/PROCEDIMIENTO_RESPALDO_PRODUCCION.md) | Responsable de la publicación |

Las secciones siguientes conservan el historial de cada fase; el estado vigente de la publicación está en los informes más recientes.

Esta entrega contiene autenticación y perfil, persistencia PostgreSQL + Prisma, administración de terrenos y siembras, mapa Leaflet/OpenStreetMap, altitud estimada desde Open-Meteo, los diez cultivos referenciales autorizados, climatología histórica NASA POWER, pronóstico de siete días con alertas preventivas, calendario mensual, comparador explicable de rotaciones, simulador visual de escenarios y visor de imágenes satelitales NASA GIBS. La rama local `feat/experiencia-agricultor` conserva tendencias 2005–2024, panel técnico y PDF, y añade la portada completa, el glosario, las fuentes y mejoras de navegación; estas actualizaciones todavía no se publican. El GeoJSON satelital analítico sigue pendiente.

La primera entrega se conserva en la etiqueta local anotada `v0.1.0-primera-entrega` (commit `92a7d2f53ede7fe524cd45e5bd7f8d4e454dd3e9`). El comparador se desarrolla en `feat/rotaciones`; su metodología, verificaciones y límites están en [INFORME_ROTACIONES.md](docs/INFORME_ROTACIONES.md).

**Versión pública verificada:** [rotaandes.vercel.app](https://rotaandes.vercel.app), con [backend HTTPS y salud](https://backend-production-954a9.up.railway.app/api/health). El código está en el repositorio privado [Logic563c/rotaandes](https://github.com/Logic563c/rotaandes), rama `release/publicacion`; la revisión desplegada es `012d6be4ebd2df22dfb3062b8645dfe1c95ec017`, incluidos escenarios y visor NASA GIBS. El [informe de actualización](docs/INFORME_ACTUALIZACION_ESCENARIOS_CAPAS.md) registra el recorrido real de escritorio/celular, las 27 capturas, PostgreSQL y la reversión. [INFORME_DESPLIEGUE.md](docs/INFORME_DESPLIEGUE.md) conserva también la publicación inicial. Railway usa crédito Trial: esta publicación no garantiza alojamiento permanente ni autoriza contratar un plan.

La auditoría del núcleo está en [INFORME_PRIMERA_ENTREGA.md](docs/INFORME_PRIMERA_ENTREGA.md), con un [guion para la demostración local](docs/DEMO_PRIMERA_ENTREGA.md). No acredita una publicación en Internet ni validación agronómica local. Los informes de [calendario](docs/INFORME_CALENDARIO_SIEMBRA.md), [pronóstico y heladas](docs/INFORME_PRONOSTICO_HELADAS.md), [clima NASA](docs/INFORME_CLIMA_NASA.md), [terrenos y siembras](docs/INFORME_TERRENOS_SIEMBRAS.md), [autenticación](docs/INFORME_AUTENTICACION.md) y [persistencia](docs/INFORME_PERSISTENCIA.md) conservan el cierre de las fases anteriores.

## Una experiencia más sencilla para agricultores (actualización local)

- **Portada `/`:** qué hace RotaAndes, tres pasos, cuenta/acceso, fuentes y límites, sin promesas de cosecha ni avales institucionales.
- **Glosario `/glosario`:** quince términos con ejemplos, búsqueda sin distinguir tildes y recuperación cuando no hay coincidencias.
- **Fuentes `/fuentes`:** NASA POWER, MODIS, SMAP, GIBS, Open-Meteo, OpenStreetMap, datos declarados y catálogo referencial. `/acerca-de` lleva a esa misma página. El glosario y las fuentes se pueden leer sin iniciar sesión y sin que responda el backend, siempre que la aplicación web haya cargado; no es una aplicación sin conexión.
- **Mi espacio:** acceso directo a los terrenos del agricultor o al panel del técnico, sin mezclar permisos.
- **Detalle del terreno:** preguntas para llegar al calendario, pronóstico, rotaciones, escenarios, historial e informe PDF. El calendario ofrece un resumen por mes de los resultados calculados, conservando restricciones, estados no determinados y todas las explicaciones.

Los formularios explican la selección en el mapa y conservan coordenadas manuales. Hay foco visible en enlaces, botones, selectores, áreas de texto y desplegables; al navegar se lleva el foco al contenido. Los controles de zoom tienen objetivos de 44 píxeles. Se comprobaron escritorio y celulares emulados de **320, 375 y 390 px**; esto no acredita certificación WCAG ni una evaluación con agricultores o teléfonos físicos.

```powershell
npm.cmd run test:experiencia
```

Este recorrido utiliza PostgreSQL aislado, cuentas temporales, clima controlado y motores reales. Revisa registro, terreno, calendario, rotaciones, glosario, PDF, cierre de sesión y lectura técnica. No modifica producción. El alcance, las capturas y los resultados finales están en [INFORME_EXPERIENCIA_AGRICULTOR.md](docs/INFORME_EXPERIENCIA_AGRICULTOR.md).

## Informes PDF de terrenos (actualización local)

En el detalle de un terreno, pulsar **Descargar informe PDF**. La descarga usa el cliente HTTP autenticado, sin colocar el JWT en la URL. Agricultores: solo terrenos propios. Técnicos: lectura autorizada, sin cambiar registros. El archivo se llama `rotaandes-<UUID>.pdf`.

`GET /api/terrenos/:id/reporte.pdf` genera un documento A4 con portada, características e historial, climatología NASA POWER, pronóstico vigente y alertas, calendario con sus 120 motivos, comparación de tres estrategias y tendencias disponibles. Incluye fuentes, fechas, unidades y limitaciones. Siempre utiliza el **escenario original 0 % / 0 °C**, aunque se hayan movido los controles del simulador. No incluye datos de contacto, contraseñas ni notas privadas.

Reutiliza los servicios y cachés existentes. Los fallos conocidos de proveedores permiten un informe parcial identificado; los datos ausentes no se convierten en cero. Un fallo interno o un exceso de límites devuelve un error JSON y no un PDF engañoso. Límites: 200 siembras sin truncamiento silencioso, 80 páginas, 4 MiB, un informe simultáneo por proceso y tres solicitudes por usuario/minuto. El plazo de preparación es 25 segundos; las operaciones SQL o de proveedor ya iniciadas pueden terminar después, conservando ocupado el cupo y descartando el resultado tardío.

```powershell
# Compilar y ejecutar descarga real en escritorio y celular, con PostgreSQL aislado
npm.cmd run test:pdf
# Validar un PDF local sin imprimir su texto ni datos personales (ruta relativa al backend)
npm.cmd run pdf:verificar --workspace backend -- ../.tmp/evidencias-reportes-pdf/informe-ejemplo-controlado.pdf
```

El ejemplo anterior existe en esta computadora tras la verificación de la fase; los artefactos `.tmp/` no se incluyen en un clon. También se puede indicar la ruta absoluta de otro informe. El verificador comprueba estructura PDF, páginas A4 y texto extraíble. Las pruebas utilizan PDFKit real, PDF.js y datos controlados identificados; no acreditan una consulta meteorológica nueva. El ejemplo completo revisado tiene 37 páginas porque conserva todas las explicaciones. [INFORME_REPORTES_PDF.md](docs/INFORME_REPORTES_PDF.md) documenta arquitectura, evidencias, pruebas y límites. No se ha publicado este módulo.

## Panel de técnicos agrícolas (actualización local)

Con una cuenta autorizada de rol `tecnico`, abrir **Panel técnico** en la navegación o `/tecnico`. Permite consultar terrenos, marcadores, última siembra y alertas preventivas. Los agricultores no ven ese enlace y reciben 403 en `GET /api/tecnico/terrenos`.

- Parroquia: dato del **perfil del propietario**, sin inferir ubicación del terreno.
- Cultivo: coincidencia en **todo el historial**, aunque la última siembra sea otra.
- Mapa/lista: 50 terrenos por página, con acceso a todas las páginas. Resumen y alertas indican su alcance.
- Heladas: solo pronósticos verificados y vigentes en caché Open-Meteo. Sin dato, vencido o cobertura mínima insuficiente: estado desconocido. Abrir el pronóstico en el detalle permite consultar el proveedor; el panel no hace solicitudes externas masivas.
- Consulta de solo lectura, sin publicar datos de contacto ni cambiar registros agrícolas.

Para aprovisionar una cuenta **local** nueva en Windows, el procedimiento preparado es `npm.cmd run tecnico:crear`. Solicita correo, nombre y una contraseña mediante entrada oculta. Rechaza correos existentes, sin promover agricultores ni cambiar sus contraseñas; nunca utiliza claves predeterminadas. El destino está limitado a `rotaandes_dev` local. El modificador `-BasePruebas` selecciona exclusivamente la base aislada para automatización. El asistente rechaza producción; no se ha creado una cuenta técnica permanente. No hacen falta SQL manual, archivos con contraseñas ni secretos en argumentos.

`npm.cmd run test:tecnico` compila y ejecuta el recorrido de escritorio/celular con cuentas temporales y pronósticos controlados. El [informe del panel](docs/INFORME_PANEL_TECNICO.md) documenta contrato, permisos, procedimiento, pruebas, capturas y límites. Producción continúa en `012d6be`, sin publicar este módulo.

## Tendencias históricas 2005–2024 (actualización local)

En el detalle de un terreno, abrir **«¿Cómo ha cambiado el clima?» → «Ver tendencias 2005–2024»**. Se muestran precipitación anual, menor mínima mensual de cada año, días de helada modelados y una tabla accesible con cobertura por variable. El índice superficial GWETTOP también aparece en la tabla. Pendientes y diferencias son descriptivas; no demuestran significancia ni causas.

`GET /api/terrenos/:id/tendencia` requiere sesión y propiedad del terreno, o lectura técnica autorizada. El backend consulta NASA mensual y diaria con las coordenadas guardadas. Guarda ambas series separadamente en `clima_cache` durante 30 días y, ante fallos, identifica el dato anterior del mismo punto como desactualizado. Si tampoco existe, usa la serie NASA archivada de la **misma celda MERRA-2** (`backend/src/data/tendencia/`, estado `respaldo`). No sustituye datos faltantes por cero ni usa otra celda ni el punto más cercano. La consulta se realiza al abrir la sección.

La lluvia requiere doce meses válidos y se calcula como mm/día × días reales; el conteo de heladas exige 365/366 mínimas diarias válidas a ≤0 °C. Este conteo histórico regional es distinto de las alertas preventivas del pronóstico a ≤2 °C. NASA POWER no mide el microclima del lote.

```powershell
npm.cmd run tendencia:verificar --workspace backend
npm.cmd run test:tendencias
```

El primer comando consulta NASA realmente, sin PostgreSQL; necesita Internet. El segundo compila y ejecuta el recorrido de escritorio/celular en la base aislada, con respuestas archivadas y modificaciones de prueba identificadas. La metodología, procedencia y verificaciones están en [INFORME_TENDENCIAS_CLIMATICAS.md](docs/INFORME_TENDENCIAS_CLIMATICAS.md). Las capturas y logs locales se conservan en `.tmp/`, fuera de Git. La versión pública sigue ejecutando `012d6be`.

## Requisitos

- Node.js **24.20.0** (rama 24) y npm 11.
- PostgreSQL **18.4** en `127.0.0.1:5432`, con el rol existente `rotaandes_app`.
- PowerShell y dos terminales si prefieres iniciar cada servicio por separado.

Se usa `npm.cmd` en estos ejemplos porque Windows puede bloquear `npm.ps1`. No hace falta cambiar la política de ejecución de PowerShell. En otros sistemas, usar `npm`.

## Instalar y arrancar

Desde PowerShell:

```powershell
Set-Location C:\Users\DELL\Documents\PROYECTOS\rotaandes
npm.cmd ci
npm.cmd run auth:preparar --workspace backend
npm.cmd run dev
```

En esta computadora PostgreSQL y `backend/.env` ya están preparados. `auth:preparar` generó el secreto JWT y lo reutiliza en posteriores ejecuciones sin mostrarlo ni cambiar contraseñas. En un clon nuevo, preparar primero PostgreSQL con el asistente de la siguiente sección. El backend exige un secreto válido al arrancar; `/api/health` sigue siendo una comprobación HTTP independiente de la base. No sobrescribir archivos `.env` existentes con los ejemplos ficticios. El frontend utiliza por defecto `http://localhost:3000` y puede configurarse con `frontend/.env.example`.

- Página inicial: **http://localhost:5173**.
- Comprobación del backend: **http://localhost:3000/api/health**.
- Para detener los dos servicios: `Ctrl+C`.

La instalación usa workspaces de npm y un único `package-lock.json` en la raíz. Ejecutar `npm.cmd ci` en la raíz al clonar o restaurar dependencias.

Para iniciar los servicios por separado, después de instalar desde la raíz:

```powershell
# Terminal 1
Set-Location C:\Users\DELL\Documents\PROYECTOS\rotaandes\backend
npm.cmd run dev
```

```powershell
# Terminal 2
Set-Location C:\Users\DELL\Documents\PROYECTOS\rotaandes\frontend
npm.cmd run dev
```

## Configuración local

| Archivo | Variable | Valor predeterminado |
| --- | --- | --- |
| `backend/.env` | `PORT` | `3000` |
| `backend/.env` | `CORS_ORIGIN` | `http://localhost:5173` |
| `frontend/.env` | `VITE_API_URL` | `http://localhost:3000` |
| `backend/.env` | `DATABASE_URL` | Sin valor real predeterminado; configuración segura local |
| `backend/.env` | `TEST_DATABASE_URL` | Base aislada creada por el asistente local |
| `backend/.env` | `JWT_SECRET` | Sin valor predeterminado; generado con 48 bytes aleatorios |
| `backend/.env` | `UMBRAL_HELADA_C` | `2` °C, opcional, entre -10 y 10 con hasta dos decimales |

`VITE_API_URL` es el origen del backend, sin `/api`, credenciales, consulta ni fragmento. Las variables `VITE_*` son públicas; no colocar secretos en ellas. Reiniciar Vite después de cambiar su entorno y reconstruir el frontend si cambia su URL de producción.

Las URLs PostgreSQL de esta fase se limitan al servidor, puerto, rol y bases locales autorizados. Solo admiten el parámetro opcional `schema=public`, sin duplicados ni fragmentos; otros parámetros podrían sobrescribir la conexión en pg.

En desarrollo, el backend escucha solo en `127.0.0.1`. CORS permite exactamente el origen configurado: `http://localhost:5173` o, si se elige expresamente, `http://127.0.0.1:5173`, métodos GET/POST/PUT/DELETE y encabezados Content-Type/Authorization. No permite comodines ni otros puertos. El perfil de producción exige un origen HTTPS concreto de Vercel y escucha en `0.0.0.0` con el puerto de Railway. Las solicitudes sin `Origin`, como las de `curl`, pueden consultar el endpoint público. Las rutas privadas exigen Bearer independientemente de CORS.

Vite utiliza el puerto **5173** con `strictPort`: si está ocupado, muestra un error en lugar de cambiar de puerto. El backend informa si no puede abrir el **3000**. Si PowerShell no encuentra `backend/`, comprobar que la terminal está en la raíz indicada arriba.

## Publicación en Railway y Vercel

El usuario autorizó el repositorio privado, los envíos iniciales, los dos servicios Railway, Vercel Hobby, la migración/semillas y la publicación dentro del crédito de prueba. Posteriormente autorizó el envío y despliegue exacto de `012d6be` para escenarios y capas; ambas operaciones se verificaron. Los siguientes envíos, recursos adicionales o cambios con costos conservan su requisito de aprobación. No copiar credenciales ni datos locales a producción; no hay autodeploy de ramas de trabajo.

Ambas plataformas deben utilizar **la raíz del monorepo**, con su único lockfile y sus workspaces:

| Servicio | Instalación / compilación | Arranque / salida |
| --- | --- | --- |
| Railway, backend | `npm ci --include=dev` y `npm run build --workspace backend` | `npm run start --workspace backend`; salud `/api/health` |
| Railway, predeploy autorizado | `npm run produccion:preparar --workspace backend` | `prisma migrate deploy`, verificación y semillas originales de diez cultivos y ocho plantillas |
| Vercel, frontend | `npm ci --include=dev` y `npm run build:publicacion --workspace frontend` | `frontend/dist`; rutas SPA en `vercel.json` |

`.railway/railway.ts` declara PostgreSQL privado y backend, compilación, predeploy, arranque y healthcheck. Railway ya no acepta `railway.json` en servicios nuevos; se sustituyó tras verificar la documentación y el CLI actuales. El SDK oficial `railway@3.16.0` es una dependencia de desarrollo, sin cambios al stack de aplicación. IaC se evalúa localmente; planificar no crea servicios, aplicar sí requiere aprobación y revisar que no haya eliminaciones.

Railpack ejecuta `npm ci --include=dev` una sola vez en su fase de instalación. El comando de build solo compila el backend: repetir `npm ci` allí provocó un error EBUSY sobre su caché de Vite y se corrigió. Las cargas verificadas utilizan una exportación limpia de la revisión aprobada, evitando resultados y archivos privados locales.

`backend/.env.production.example` enumera variables sin secretos: `NODE_ENV`, `TRUST_PROXY_HOPS`, `CORS_ORIGIN`, `DATABASE_URL`, `DATABASE_HOST`, `DATABASE_NAME`, `DATABASE_USER`, `JWT_SECRET` y opciones Railpack. `PORT` lo proporciona Railway. Las variables compartidas privadas `ROTAANDES_APP_PASSWORD`, `ROTAANDES_JWT_SECRET` y el origen público `ROTAANDES_CORS_ORIGIN` se prepararon dentro del entorno autorizado antes de aplicar IaC. Las claves se generaron con criptografía segura, sin utilizar el generador determinista del contexto SDK ni valores versionados. Se fijan Node 24.20.0 y npm 11.19.0; las dependencias de desarrollo se conservan para Prisma CLI/tsx.

El script `backend/scripts/configurarRolProduccion.sql` se ejecutó mediante SSH únicamente en el PostgreSQL nuevo: `rotaandes_app` sin privilegios administrativos y `rotaandes_prod` UTF8. Se verificó su idempotencia sin cambiar contraseñas/propietarios. Recibe la clave del entorno privado y evita registrar la sentencia que la utiliza. Sus guardas devuelven error real de psql y tienen cuatro pruebas locales de solo lectura. El backend referencia la URL de aplicación y no recibe la clave administrativa del proveedor.

El backend de producción no carga `.env` local: solo acepta el PostgreSQL privado de Railway que coincida con host, base y usuario autorizados. Antes de escuchar realiza `SELECT 1`; un fallo detiene el proceso con un mensaje sin credenciales. Se confía únicamente en un salto del proxy. El origen CORS real debe configurarse después de conocer el dominio del frontend.

El modo `publicacion` exige `VITE_API_URL` con un origen HTTPS de Railway válido, sin `/api` ni credenciales. El build local habitual se conserva para desarrollo y pruebas: no usar su `dist` local como artefacto de publicación. Las variables `VITE_*` son públicas. `vercel.json` desactiva despliegues automáticos por Git y configura SPA y encabezados de seguridad; cada publicación debe aprobarse. `.vercelignore` y `.railwayignore` excluyen entornos privados, dependencias y resultados locales de las cargas por CLI.

La publicación inicial superó un recorrido real con cuentas temporales, PostgreSQL, NASA POWER/Open-Meteo, escritorio/celular y persistencia tras reiniciar el backend. La actualización añadió la comprobación pública de escenarios y GIBS. Las cuentas temporales y sus registros se limpiaron, conservando los datos preexistentes, las semillas autorizadas y caché meteorológica genuina. Se verificaron HTTPS, CORS, SPA y ausencia de secretos/resultados locales en el contenedor. Los detalles, capturas y procedimientos de actualización/reversión están en los informes. No hay cuentas demo ni claves conocidas.

## PostgreSQL y Prisma

Desde la raíz, ejecutar el asistente en una terminal local:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\configurarBaseLocal.ps1
```

El asistente también está disponible como tarea **RotaAndes: configurar PostgreSQL local** en la terminal integrada de VS Code. Primero revisa `.env`, variables de PostgreSQL y pgpass. Solo solicita las contraseñas que falten, una vez por rol y con entrada oculta; no enviarlas al chat ni pasarlas como argumentos. Comprueba el rol existente y crea `rotaandes_dev` solo si no existe (propietario `rotaandes_app`, UTF8). Para pruebas reutiliza la base configurada o una base compatible existente del proyecto; únicamente crea una si no hay ninguna disponible. Comprueba ambas conexiones y guarda las URLs codificadas en `backend/.env`, ignorado por Git, mediante escritura atómica. No cambia permisos del rol ni utiliza `postgres` para la aplicación. Si una base configurada tiene otro propietario o codificación, se detiene sin alterarla.

Reejecutar el asistente conserva y reutiliza las bases y la configuración, sin acumular bases temporales ni borrar las existentes. No crea usuarios, semillas ni tablas, y no aplica migraciones. Una vez configurado el entorno, ejecutar los comandos siguientes.

```powershell
npm.cmd run prisma:validate --workspace backend
npm.cmd run prisma:generate --workspace backend
npm.cmd run db:migrate --workspace backend
npm.cmd run db:status --workspace backend
npm.cmd run db:verify --workspace backend
npm.cmd run test:db
```

El catálogo ya está cargado en esta computadora. Para reproducirlo en un clon nuevo, después de aplicar la migración:

```powershell
npm.cmd run db:seed --workspace backend
```

También está configurado `prisma db seed`. La semilla realiza upsert de los diez cultivos exactos de la sección 10 de `PROYECTO.md` en una transacción. Se ejecutó dos veces para verificar su idempotencia. No crea usuarios, terrenos, siembras ni plantillas y no borra filas ajenas. Los valores son referenciales y están pendientes de validación agronómica local; las descripciones sin texto de referencia permanecen nulas. El comando de desarrollo rechaza `NODE_ENV=test`; las pruebas utilizan el mismo catálogo dentro de su aislamiento y lo revierten o limpian.

Se fijan `prisma`, `@prisma/client` y `@prisma/adapter-pg` a **7.10.1**. Prisma 7 usa `backend/prisma.config.ts` para la URL y el adaptador `pg` para el cliente. El cliente se genera explícitamente en `backend/src/generated/prisma/`, excluido de Git, y se compila con el backend. `dev`, `typecheck` y `build` lo generan automáticamente; generar el cliente no conecta a PostgreSQL.

La migración `20261107000100_esquema_inicial` crea las seis tablas en una transacción. Incluye los cuatro `CHECK`, el correo único, la nulabilidad exacta y las acciones de claves foráneas de `PROYECTO.md`. No ejecutar `db push`, `migrate reset` ni editar una migración ya aplicada. En esta etapa se aplica con `migrate deploy`; no necesita shadow database ni conceder `CREATEDB` a la aplicación.

`backend/src/lib/prisma.ts` proporciona una instancia reutilizable y su cierre explícito. Las conexiones Prisma utilizan `TimeZone=UTC` para preservar los instantes TIMESTAMPTZ con el adaptador 7.10.1; no cambia la configuración global de PostgreSQL ni las fechas civiles DATE. `/api/health` conserva `{ "ok": true }` como comprobación del proceso HTTP y funciona de forma independiente de la base. La verificación de PostgreSQL se realiza con `db:verify`, sin añadir endpoints al contrato.

Las pruebas SQL solo aceptan una URL local del rol de aplicación que apunte a `rotaandes_pruebas_<sufijo>`. Primero reproducen las migraciones en esa base aislada y después verifican el esquema, restricciones, relaciones, cascadas, tipos, valores predeterminados, JSONB, arreglos, escritura con Prisma y rechazo de credenciales incorrectas. Toda escritura de prueba se revierte con `ROLLBACK`; las fixtures son sintéticas y no constituyen datos agronómicos ni semillas. `rotaandes_dev` no recibe datos de prueba.

Las utilidades del asistente tienen comprobaciones independientes para PowerShell 5, sin conexiones ni credenciales reales:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tests\scripts\configurarBaseLocal.test.ps1
```

Comprueban lectura del entorno, caracteres reservados en las URLs, interpretación de pgpass, creación/reemplazo atómico de archivos y rechazo de destinos o roles no autorizados. Las fixtures locales se eliminan al finalizar. Para comprobar una configuración ya preparada sin solicitar claves, el asistente admite `-SinInteraccion`.

Para inspeccionar la base desde PowerShell sin exponer la URL ni la contraseña:

```powershell
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -X -W -h 127.0.0.1 -p 5432 -U rotaandes_app -d rotaandes_dev -v ON_ERROR_STOP=1 -f .\backend\scripts\verificarEsquema.sql
```

En pgAdmin, registrar o abrir el servidor `127.0.0.1:5432` con usuario `rotaandes_app`, seleccionar `rotaandes_dev`, abrir **Query Tool** y ejecutar `backend/scripts/verificarEsquema.sql`. El archivo es SQL puro y utiliza una transacción de solo lectura. Actualizar **Schemas → public → Tables** para ver las tablas y `_prisma_migrations`.

## Comprobaciones

Desde la raíz, cada comando verifica ambos paquetes:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:db
npm.cmd run build
```

O ejecutar todo con:

```powershell
npm.cmd run check
```

La auditoría del 8 de noviembre de 2026 ejecutó `check` con código 0: 210 pruebas backend, 63 frontend, 113 PostgreSQL y 18 E2E. También aprobó 14 comprobaciones PowerShell y dos recorridos integrales separados con proveedores meteorológicos reales. `npm audit` completo y de producción informó cero vulnerabilidades conocidas en esa consulta; no equivale a una certificación de seguridad.

La fase de publicación posterior ejecutó `check` con código 0: **262 backend, 85 frontend, 124 PostgreSQL y 20 E2E; 491 en total**. El recorrido adicional sobre Internet usa datos reales y se informa por separado; las 491 pruebas habituales siguen utilizando el aislamiento y las respuestas controladas documentados.

Los mismos scripts `dev`, `build`, `lint`, `typecheck` y `test` están disponibles dentro de `backend/` y `frontend/`. `test` ejecuta las pruebas una vez; `test:watch` las mantiene observando cambios dentro de cada paquete.

Las pruebas del backend usan Vitest y Supertest para comprobar HTTP, salud, CORS, JWT, configuración y errores; `test:db` añade registro, login, perfil, roles y restricciones contra PostgreSQL aislado, con rollback. Las del frontend usan Vitest, jsdom y Testing Library para validar respuestas, sesión, formularios, carga, errores, reintentos y cierre. Sus fixtures son exclusivas de pruebas.

La Fase 2 añade pruebas de CRUD de terrenos y siembras, autorización horizontal, lectura técnica sin escritura, fechas DATE, catálogo idempotente, límites del área y fallos/tiempos de espera de elevación. Los recorridos de navegador prueban el mapa real, marcadores, formularios, edición, eliminación con confirmación y persistencia tras recargar, además de la alternativa manual cuando las teselas fallan. Las cuentas E2E usan claves aleatorias y se limpian por correo exacto en finally; los cultivos insertados para E2E se eliminan al finalizar sin sobrescribir los que ya existieran.

## Probar terrenos y siembras

Con los servicios activos, ingresar en http://localhost:5173 y abrir **Mis terrenos**. **Añadir terreno** permite tocar un punto del mapa o escribir latitud/longitud manualmente. El mapa comienza en Latacunga, Cotopaxi. El área es declarada, opcional, mayor que cero y admite hasta 999999,99 ha con dos decimales; no se calcula con el mapa. Suelo admite franco, arenoso, arcilloso o «No sé».

Al guardar, el backend obtiene la altitud estimada; al cambiar coordenadas la recalcula. Si una estimación anterior quedó nula, guardar nuevamente la ubicación permite reintentar. Si Open-Meteo no responde, se conserva NULL y la interfaz lo informa. Fuente: Open-Meteo / Copernicus DEM GLO-90, resolución de 90 m; no es una medición exacta. La consulta tiene cinco segundos de espera máxima, valida tipos/rango y no sigue redirecciones. Se permiten hasta 20 consultas externas/minuto y dos simultáneas por proceso, con caché acotada; un fallo o falta de cupo no inventa una altitud.

El detalle muestra ubicación, área, riego, suelo, altitud e historial. **Mis siembras** permite escoger del catálogo referencial, indicar fecha de siembra y, opcionalmente, cosecha y notas. Las fechas viajan como `AAAA-MM-DD`; cosecha vacía se envía como NULL, y una fecha inválida o anterior a la siembra se rechaza. El historial se ordena desde la fecha de siembra más reciente.

Los agricultores únicamente consultan y modifican sus propios registros; acceder a UUID ajenos devuelve 404. Un técnico existente puede consultar terrenos e historiales, con controles de escritura ocultos y rechazo 403 del servidor. El panel técnico con filtros y alertas queda pendiente. El catálogo es público. Las eliminaciones piden confirmación; eliminar un terreno elimina sus siembras mediante la relación existente.

| Método | Ruta | Respuesta |
| --- | --- | --- |
| GET | `/api/cultivos` | Arreglo del catálogo, campos originales snake_case |
| GET / POST | `/api/terrenos` | Arreglo de terrenos / terreno creado, 201 |
| GET / PUT / DELETE | `/api/terrenos/:id` | Terreno / terreno actualizado / 204 sin cuerpo |
| GET / POST | `/api/terrenos/:id/siembras` | Historial / siembra creada, 201 |
| PUT / DELETE | `/api/siembras/:id` | Siembra actualizada / 204 sin cuerpo |

PUT admite los campos editables presentes y rechaza cuerpos vacíos o claves adicionales. No acepta propietario, ID, altitud ni una asociación de terreno elegida por el cliente. Los campos omitidos no se reescriben desde una lectura anterior. Coordenadas/altitud y fechas vinculadas tienen comprobación optimista contra cambios concurrentes; ante conflicto se responde 400 para recargar y revisar. No hay versionado general ni detección de toda edición simultánea: sobre un campo enviado explícitamente puede prevalecer la última escritura. `area_ha` se serializa como número o NULL; fechas DATE sin hora y timestamps como ISO. Los errores mantienen `{ error: "mensaje" }`. Guardados de terreno se limitan a 20 por usuario/minuto; el exceso responde 429.

Los datos JSON se consumen únicamente mediante `frontend/src/lib/api.ts`; Open-Meteo se consulta desde el servidor. Leaflet carga las imágenes cartográficas públicas de OpenStreetMap directamente como recurso visual del mapa solicitado, sin enviar JWT ni información de perfiles. Se mantiene atribución visible y el caché HTTP del navegador, sin precarga masiva. Las teselas pueden fallar; las coordenadas y la lista siguen disponibles. Las cachés privadas incorporan el ID del usuario y se limpian al cerrar sesión; las operaciones tardías comprueban que la sesión sigue activa.

Las pruebas de navegador usan Playwright contra los dos servicios compilados, sin simular el backend, con tamaños de escritorio y celular:

```powershell
npm.cmd run test:e2e
```

En Windows utilizan Microsoft Edge instalado. En otros sistemas, instalar primero Chromium con `npx playwright install chromium`. Dejar libres los puertos 3000 y 5173: las pruebas arrancan y detienen sus propios servidores. El backend E2E usa `NODE_ENV=test`, únicamente `TEST_DATABASE_URL` y un secreto JWT efímero. Las cuentas aleatorias se eliminan en `finally`, por correo exacto; las trazas están deshabilitadas para no almacenar credenciales ni Bearer. Las capturas quedan en `test-results/`, ignorado. `npm.cmd run check` incluye las pruebas SQL, las de navegador y el build. El frontend compilado debe usar el valor local predeterminado de `VITE_API_URL` para esta comprobación.

`test:e2e` ejecuta primero los 16 casos anteriores y después los recorridos integrales de primera entrega y rotaciones en escritorio/celular con `playwright.integral.config.ts` (cuatro casos). Este segundo proceso inicia servidores nuevos para conservar los límites reales de registro/login sin consumir los de la suite anterior; no se aumentan ni desactivan los límites. Sus capturas quedan en `test-results/integral/`. `npm.cmd run test:integral` repite esos cuatro casos. Clima/pronóstico se controlan en la base aislada por defecto; cuenta, perfil e historial se persisten. El modo externo separado de primera entrega está descrito en [la guía de demostración](docs/DEMO_PRIMERA_ENTREGA.md); la suite de rotaciones sigue usando datos controlados incluso con esa variable. No ejecutar suites que escriban simultáneamente en la misma base de pruebas.

## Comparar rotaciones agrícolas

En el detalle del terreno, pulsar **Comparar rotaciones**. Muestra el patrón actual del historial y las dos plantillas originales mejor puntuadas que puedan evaluarse y programarse según el calendario. Cada tarjeta incluye secuencia, ciclos y esperas, indicadores, explicación, evidencia, riesgos y vacíos. Las prioridades guardadas del propietario ponderan la comparación; el técnico autorizado consulta con esas mismas prioridades.

`GET /api/terrenos/:id/rotaciones?lluvia_pct=0&temp_delta=0` conserva el contrato original y sus campos `estrategias`, `puntajes`, `por_que`, `evidencia`, `beneficios`, `vacios_informacion`, `riesgos` y `aviso`. Requiere JWT y propiedad o lectura técnica. Usa coordenadas/historial/catálogo de PostgreSQL y comparte el servicio/caché NASA del calendario. No escribe siembras. Los escenarios admiten lluvia -30…30 % y temperatura -2…2 °C; el simulador visual reutiliza esos mismos parámetros.

## Simular escenarios climáticos

En el detalle, pulsar **Abrir simulador de escenarios**. Los deslizadores modifican lluvia entre −30 % y +30 % (pasos de 1 %) y temperatura entre −2 °C y +2 °C (pasos de 0,5 °C). El teclado permite usar flechas, Inicio y Fin. Los valores se muestran inmediatamente y se consulta al backend 600 ms después del último cambio. **Restaurar escenario original** vuelve a 0 % / 0 °C.

El panel compara las 120 celdas originales/simuladas y sus motivos; muestra cambios de estado, cinco índices y las tres posiciones de rotaciones con planificación y advertencias. La comparación numérica corresponde a la misma estrategia por ID, aunque cambie su puesto. Una alternativa que entra o sale no se compara contra otra distinta; los indicadores sin referencia o sin datos conservan su incertidumbre. No se garantiza disponer de dos sugerencias evaluables.

Las llamadas GET siguen centralizadas y validadas en `frontend/src/lib/api.ts`. No hay nuevas rutas, fórmulas agrícolas, tablas ni migraciones. Lluvia × (1 + porcentaje/100) y variación de temperatura se aplican en el motor existente, sin escribir historial o datos climáticos transformados. La caché y cancelación se separan por usuario, terreno y escenario. Se comprueba la coherencia de fuente/fecha/periodo y contexto antes de comparar; **Actualizar ambos escenarios** permite recoger datos recientes.

Es una **simulación hipotética**, sin validez predictiva ni validación agronómica local. Consulta metodología, pruebas y capturas de desarrollo en [INFORME_ESCENARIOS.md](docs/INFORME_ESCENARIOS.md). Se publicó con autorización en `012d6be`; el [informe de actualización](docs/INFORME_ACTUALIZACION_ESCENARIOS_CAPAS.md) documenta la verificación real posterior.

`npm.cmd run test:escenarios` compila y ejecuta el recorrido del simulador en escritorio/celular con PostgreSQL aislado y climatología controlada. `test:e2e` y `check` lo incluyen como tercer proceso, después de las suites anteriores, conservando las cuotas de autenticación. Las evidencias están en `test-results/escenarios/`, ignorado por Git. No ejecutar simultáneamente suites que escriban en la misma base aislada.

El cierre del simulador ejecutó `check` con código 0: **262 backend, 103 frontend, 127 PostgreSQL y 22 E2E; 514 pruebas aprobadas**. Los dos recorridos nuevos verificaron el cálculo real con datos controlados, la ausencia de escrituras de simulación y el aislamiento de cuentas. Esta validación local no publica la actualización.

## Visualizar MODIS y SMAP

En el mapa de **Mis terrenos** o del detalle, abrir **Explorar capas NASA**. Elegir NDVI o humedad superficial SMAP; año 2023/2024, mes y fecha de composición/adquisición. Se muestra una capa a la vez, con opción de volver al mapa base o retirar la cartografía debajo. Los marcadores conservan los terrenos autorizados del usuario.

La alternativa GIBS fue autorizada al comprobar que AppEEARS requiere Earthdata sin acceso local configurado. Se verificaron imágenes NASA reales y sus leyendas: MODIS MOD13Q1 (catálogo 061, 250 m, composición de 16 días) y SMAP SPL3SMP_E (catálogo 006, malla 9 km, capa diurna diaria). La versión es la del catálogo de referencia; el proveedor sirve el alias `best`. El recorte es rectangular sobre Cotopaxi y alrededores, no un límite provincial. Las imágenes pueden tener cobertura parcial, especialmente SMAP en la zona andina.

**No son GeoJSON analíticos ni promedios mensuales.** El mes selecciona fechas originales del catálogo. No se obtienen valores de los colores ni se infieren rendimientos, sequías, plagas o humedad exacta de una parcela. SMAP no es RH2M ni los índices modelados de NASA POWER.

- `GET /api/capas/:tipo?mes=1`: valida tipo/mes y responde **503** porque no hay GeoJSON procesado; no lo sustituye por PNG.
- `GET /api/capas-visuales/:tipo?anio=2023&mes=1&fecha=...`: metadatos, procedencia y visibilidad de la imagen WMS.
- `GET /api/capas-visuales/:tipo/imagen?...`: PNG validado. Las tres rutas exigen JWT; no reciben URL, ruta, coordenadas o propietario arbitrarios.

La descarga se realiza desde backend. El navegador comprueba SHA-256, crea una URL temporal local y la libera al cambiar capa o sesión. Caché de imágenes en memoria durante 24 horas, máximo 32 imágenes/16 MiB, distinta de `clima_cache`; límites de tamaño, tiempo y solicitudes. Un PNG transparente se identifica como **sin píxeles visibles**, sin asignar cero ni otra fecha. El detalle técnico y las limitaciones pendientes están en [INFORME_CAPAS_SATELITALES.md](docs/INFORME_CAPAS_SATELITALES.md).

```powershell
npm.cmd run capas:verificar --workspace backend
npm.cmd run test:capas
```

El primer comando comprueba NASA GIBS en vivo sin SQL y conserva imágenes/metadatos en `.tmp/evidencias-capas/`. El segundo compila y prueba escritorio/celular con respuestas controladas e imágenes NASA archivadas con procedencia. `check` incluye ese recorrido como cuarto proceso Playwright, conservando las cuotas de autenticación. El modo separado `ROTAANDES_E2E_GIBS_REAL=1` de `playwright.capas.config.ts` verifica imágenes reales desde el backend sin interceptarlas; los casos finales de error/ausencia son simulaciones explícitas. Ninguno publica cambios.

Validación local del visor: `check` terminó con código 0, **293 backend + 114 frontend + 130 PostgreSQL + 24 E2E = 561 pruebas aprobadas**. Además pasaron dos E2E con NASA GIBS real y la comprobación independiente de ambas imágenes. La batería completa se repitió en integración antes de publicar `012d6be`; MODIS y SMAP cargaron desde el backend público en escritorio/celular, con metadatos y SHA verificados. Los resultados públicos se informan separados de las pruebas controladas.

Las fórmulas cuantitativas no estaban definidas en el documento original; se diseñaron con autorización explícita del usuario y se documentan como **heurística referencial sin validación agronómica**. Los índices 0–100 no representan litros, dinero, rendimientos o probabilidades. Total: promedio ponderado de agua, suelo, valor de mercado y compatibilidad climática; esta última tiene peso fijo 3, declarado, porque el perfil solo define las otras tres prioridades. Ver fórmulas, normalización y penalización de familias en [el informe](docs/INFORME_ROTACIONES.md).

La estrategia actual usa las tres últimas siembras en orden cronológico; si hay menos, repite el último cultivo con aviso. Sin historial no se inventa un cultivo actual. El horizonte hipotético común comienza el mes completo posterior a hoy en Ecuador o a la última fecha registrada de siembra/cosecha conocida, si es posterior. Cada ciclo usa `ciclo_meses` y espera una ventana permitida por el calendario, conservando sus precauciones. No se supone que una cosecha no registrada ya ocurrió, ni se confirma disponibilidad de la parcela. Las duraciones totales pueden diferir; los puntajes no están anualizados.

Si falta información esencial, los puntajes permanecen nulos. Si hay menos de dos plantillas evaluables, las posiciones restantes indican **No determinada**, con `id: null` y sin una secuencia inventada. Por ejemplo, a 2775 m puede quedar solo una plantilla apta entre las ocho originales. Un fallo NASA sin dato fiable permite ver limitaciones y atributos conocidos, con `clima: null` y sin ranking climático fabricado.

En esta computadora ya se cargaron las ocho plantillas. Para reproducirlas en otro entorno preparado, después del catálogo de cultivos:

```powershell
npm.cmd run db:seed:rotaciones --workspace backend
```

La semilla es transaccional e idempotente y rechaza sustituir una definición existente diferente. Conserva IDs, secuencias y `vicia_avena`, no crea cuentas ni siembras y no modifica migraciones. Consultar el endpoint no ejecuta semillas. Al editar una siembra se invalida la comparación; hay actualización manual, caché por usuario y guardas contra respuestas de una sesión anterior.

## Consultar climatología histórica

Abrir un terreno y pulsar **Ver climatología histórica**. El panel muestra lluvia mensual estimada y temperaturas con Recharts, una tabla accesible de los doce meses, humedad de raíces y riesgo heurístico de helada. Los valores ausentes aparecen como **Sin dato**; las curvas conservan los huecos. La tabla permite desplazamiento horizontal dentro de su contenedor en celular.

`GET /api/terrenos/:id/clima` exige Bearer y utiliza exclusivamente las coordenadas guardadas en PostgreSQL. Agricultores solo leen sus terrenos; técnicos pueden leerlos todos. UUID ajenos e inexistentes responden 404. La ruta no admite parámetros de consulta. Se conservan errores `{ error: "mensaje" }`, con 400/401/404/500 según corresponda y 429 para exceso de consultas (30 por usuario/minuto). No se amplía CORS.

La respuesta conserva `fuente`, `resolucion` y los campos mensuales originales bajo `mensual`; añade metadatos de periodo, consulta, coordenadas, parámetros/unidades, advertencias y estado. NASA se consulta únicamente desde el backend mediante `/api/temporal/climatology/point`, `community=AG`, `format=JSON`. Se verificaron los ocho parámetros: temperaturas en °C, PRECTOTCORR en mm/día, RH2M en %, GWETTOP/GWETROOT como índices 0–1 y radiación en MJ/m²/día. No confundir el índice de suelo con humedad volumétrica ni la mínima climatológica con días de helada observados.

La respuesta real archivada para Latacunga (-0,93; -78,62) declara **2001–2025**. Enero: 11,86 °C de media, mínima 3,97 °C, máxima 21,03 °C y 4 mm/día. La lluvia mensual se estima multiplicando por los días medios del mes del periodo: enero 124 mm y febrero 28,24 días (seis bisiestos). No son acumulados observados exactos de un año concreto. La resolución meteorológica es 0,5° × 0,625°; la solar 1° × 1°. No representa el microclima del lote.

`clima_cache` conserva datos normalizados por coordenadas exactas durante **30 días**. Se distingue consulta NASA, caché, dato anterior desactualizado y respaldo. Un fallo puede reutilizar datos anteriores válidos de la misma ubicación. Después se usa una respuesta NASA real archivada del mismo punto exacto (cinco referencias) o de la **misma celda nativa de NASA POWER** (16 respuestas en `backend/src/data/clima/celdas/`): NASA entrega valores idénticos a todos los puntos de una celda, lo que se verificó en vivo con 48 puntos. El respaldo se identifica en pantalla con su punto de referencia y fecha. No se usa otra celda ni el punto regional más cercano. Si NASA falla y no hay dato fiable, la API responde 503 con una explicación. Sin información fiable se informa indisponibilidad. Los archivos públicos y su procedencia/SHA-256 están en `backend/src/data/clima/`; no se necesitan nuevas variables de entorno, claves NASA ni migraciones.

NASA devuelve el punto solicitado redondeado: en centésimas el 7 de noviembre y en **milésimas** desde POWER API v2.10.1 (por ejemplo, -0,935; -78,616 para -0,934512; -78,615873). Se admite la coincidencia exacta o un redondeo a 2 o 3 decimales con diferencia máxima de media unidad del último decimal, con aviso visible de menor precisión. Rechazar el redondeo a milésimas era la causa de los errores de climatología, calendario, simulador y rotaciones; ver `docs/DIAGNOSTICO_NASA_Y_RECUPERACION.md`. Verificar en vivo los respaldos: `npm run clima:respaldos:verificar --workspace backend`. La solicitud, las coordenadas guardadas, la clave de caché y la selección de respaldo conservan el punto exacto; no se aproximan ubicaciones para reutilizar otros datos.

La comprobación real independiente, sin escribir en la base, es:

```powershell
npm.cmd run clima:verificar --workspace backend
```

Las pruebas habituales no consultan NASA: usan respuestas controladas identificadas como tales. Las pruebas SQL verifican autorización, caché y persistencia con rollback; las E2E climáticas usan una caché temporal en la base aislada, comprueban gráficas reales y fallo sin datos ficticios, y limpian sus registros. Las capturas de escritorio/celular quedan en `test-results/`, ignorado por Git. Véanse metodología, procedencia, resultados y limitaciones en [INFORME_CLIMA_NASA.md](docs/INFORME_CLIMA_NASA.md).

## Consultar pronóstico y alertas

En el detalle del terreno, abrir **Ver pronóstico de siete días**. Incluye hoy y los seis días siguientes en Ecuador continental (`America/Guayaquil`, UTC−5). Se muestran mínima/máxima previstas, precipitación diaria en mm, fecha y día, alertas y fuente. No es la climatología histórica NASA ni una medición exacta del lote.

`GET /api/terrenos/:id/pronostico` exige Bearer y toma la ubicación de PostgreSQL. Agricultores solo leen sus terrenos; técnicos pueden consultarlos todos. Recursos ajenos e inexistentes responden 404; UUID inválidos o parámetros de consulta, 400; sin sesión, 401; falta de pronóstico fiable, 500 controlado. El límite local de 30 consultas por usuario/minuto devuelve 429. No se amplía CORS ni se admiten coordenadas o umbrales desde la petición.

El backend consulta exclusivamente `https://api.open-meteo.com/v1/forecast`, con `daily=temperature_2m_max,temperature_2m_min,precipitation_sum`, `timezone=America/Guayaquil` y `forecast_days=7`. Se verifican unidades °C/mm, siete fechas reales consecutivas, zona/offset, arreglos y valores finitos/coherentes. Se preservan null y se informa **Sin dato**; sin mínima válida no se descarta una helada. Una respuesta totalmente vacía se trata como indisponibilidad.

Con mínima prevista **≤2 °C** se genera una alerta preventiva con fecha y mensaje. `UMBRAL_HELADA_C` permite configurar el umbral del servidor al reiniciarlo; no es necesario añadirlo al `.env` privado para usar el valor predeterminado. No se aplica la corrección por altitud de NASA ni otra corrección propia al pronóstico. Las alertas son reglas de RotaAndes y no avisos oficiales ni confirmaciones de helada.

La caché usa la tabla existente con claves `open_meteo_forecast_v1_<latitud>_<longitud>` y dura **30 minutos**, como máximo hasta medianoche de Ecuador. Es independiente de la caché NASA de 30 días. Los fallos no devuelven pronósticos vencidos ni respaldos estáticos. Se permiten reintentos, con un minuto de espera del servidor tras fallo; **Comprobar actualización** reutiliza una caché que todavía esté vigente. El panel comprueba periódicamente actualizaciones mientras está abierto y retira los datos al vencer.

Tiempo máximo externo 6 s, cuerpo máximo 64 KiB, máximo dos solicitudes simultáneas y presupuestos por proceso de 20/minuto, 200/hora y 2000/día. Las peticiones simultáneas al mismo punto se comparten. No se necesitan nuevas dependencias, migraciones ni claves de API.

Los datos se atribuyen a [Open-Meteo](https://open-meteo.com/) bajo [CC BY 4.0](https://open-meteo.com/en/licence). El servicio gratuito se limita a uso no comercial y tiene cuotas compartidas por IP/aplicación; revisar [sus condiciones](https://open-meteo.com/en/terms) antes de otro tipo de uso o despliegue. La fecha mostrada es la consulta, no una hora de emisión que el proveedor no declara en esta respuesta.

Comprobación real independiente, sin acceder a ninguna base:

```powershell
npm.cmd run pronostico:verificar --workspace backend
```

Las pruebas habituales de pronóstico usan respuestas sintéticas controladas, sin Internet. Las E2E usan el backend compilado y PostgreSQL aislado con caché temporal; sus capturas no representan pronósticos reales. Las pruebas eliminan únicamente sus registros y restauran cualquier entrada previa. Ver metodología, evidencia real, resultados y capturas en [INFORME_PRONOSTICO_HELADAS.md](docs/INFORME_PRONOSTICO_HELADAS.md).

## Consultar el calendario de siembra

En el detalle del terreno, abrir **Ver calendario de siembra**. La matriz tiene doce meses y filas de cultivos compatibles o evaluables por altitud. Cada celda es un botón: tocarla o usar Tab/Enter abre sus motivos completos, con fuente y limitaciones. La matriz tiene desplazamiento propio y encabezados fijos; no ensancha toda la página en celular. Los cultivos fuera del rango de altitud se enumeran aparte y conservan clasificación negativa en la API.

| Resultado | Interpretación |
| --- | --- |
| ✓ Recomendado, verde | Ventana y altitud compatibles, agua suficiente según lluvia o riego y, si tolerancia a heladas ≤2, riesgo bajo en tres meses |
| ! Posible con cuidado, amarillo | Condiciones conocidas parcialmente cumplidas: agua insuficiente sin riego o riesgo medio para cultivo sensible |
| × No recomendado, rojo | Fuera de ventana/altitud, helada alta en alguno de los tres meses para cultivo sensible o brócoli sin riego |
| ? No determinado, gris | Faltan datos esenciales y no hay una exclusión comprobada; no se usa amarillo para ocultar incertidumbre |

Se aplica diciembre→enero→febrero correctamente. Brócoli requiere riego confirmado para la ventana anual; `vicia_avena` sigue siendo el cultivo combinado del catálogo. Altitud desconocida nunca produce verde o amarillo. El riego satisface solo el criterio de agua de la regla, sin medir su caudal; el área declarada no modifica la clasificación porque el proyecto no define una fórmula para ello. Las tolerancias mayores que 2 no reciben un veto por heladas inventado, pero tampoco garantizan resistencia real.

`GET /api/terrenos/:id/calendario?lluvia_pct=0&temp_delta=0` exige JWT. Agricultor solo consulta terrenos propios; técnico puede leerlos todos. Coordenadas, altitud, riego, área y catálogo proceden de PostgreSQL. Se conservan `{ celdas: [{ cultivo_id, mes, estado, motivo }] }` y errores `{ error }`. Metadatos adicionales identifican cultivos, contexto, escenario, procedencia y aviso. El estado `no_determinado` expresa la falta de datos solicitada; el contrato original no fijaba un enum de estados.

Los parámetros son opcionales y valen cero cuando se omiten. Se admiten números decimales finitos: lluvia_pct entre -30 y +30 y temp_delta entre -2 y +2. Valores vacíos, repetidos, fuera de rango o claves adicionales se rechazan con 400. La API aplica lluvia × (1 + porcentaje/100) y suma el delta a temperaturas; recalcula el riesgo mediante la función NASA existente, sin alterar la caché base. El panel de calendario conserva la referencia original; el apartado de simulación permite compararla con otros parámetros.

El calendario comparte el servicio NASA con `/clima`: caché de 30 días, deduplicación y respaldos exactos existentes, sin una nueva caché SQL de recomendaciones. Mantiene origen, periodo, fecha, advertencias y antigüedad, incluso al utilizar un dato anterior identificado. Sin fuente fiable devuelve error y permite reintentar. Las claves de frontend separan usuario, terreno, contexto y escenario.

El catálogo es **referencial y no está validado agronómicamente de forma local**. La climatología regional no es pronóstico ni medición del microclima. El calendario no reemplaza el criterio del agricultor o del técnico.

Comprobación real independiente, sin crear parcelas ni modificar datos:

```powershell
npm.cmd run calendario:verificar --workspace backend
```

Lee los diez cultivos de PostgreSQL en una transacción de solo lectura y consulta NASA para el punto de verificación de Latacunga. Como ese punto no tiene información de altitud, riego o área de una parcela, los deja desconocidos. Las pruebas habituales usan condiciones controladas; E2E usa backend/PostgreSQL reales y caché temporal en la base aislada. Resultados, tabla de decisión, casos especiales y capturas están en [INFORME_CALENDARIO_SIEMBRA.md](docs/INFORME_CALENDARIO_SIEMBRA.md).

## Probar registro, acceso y perfil

Con `npm.cmd run dev` activo, abrir http://localhost:5173/registro. Crear una cuenta con correo válido, nombre y una contraseña de al menos 15 caracteres y hasta 72 bytes UTF-8. No se recorta ni normaliza la contraseña; algunos caracteres ocupan varios bytes. El correo se recorta y convierte a minúsculas, sin eliminar puntos ni sufijos `+`.

Después del registro se abre `/inicio`. Entrar en **Mi perfil**, editar datos y prioridades entre 1 y 5 y guardar. Recargar comprueba la persistencia. **Cerrar sesión** vuelve a `/login`; una visita a `/perfil` exige ingresar nuevamente. No hay cuentas demo ni cuentas técnicas creadas por esta fase.

| Método | Ruta | Resultado |
| --- | --- | --- |
| POST | `/api/auth/registro` | 201, `{ token, usuario }`; solo agricultor |
| POST | `/api/auth/login` | 200, `{ token, usuario }` |
| GET | `/api/auth/yo` | 200, usuario público autenticado |
| PUT | `/api/perfil` | 200, usuario público actualizado |

Se conserva el contrato de `PROYECTO.md`. Los campos públicos usan nombres originales, como `prioridad_agua` y `creado_en`. Nunca se devuelve `password_hash`. Campos adicionales, cambios de rol, ID o contraseña se rechazan. Registro y login tienen límites por IP de 5 y 10 solicitudes por 15 minutos, respectivamente; el exceso devuelve 429 con `{ error }` y Retry-After. Las credenciales incorrectas devuelven el mismo mensaje, exista o no el correo.

La sesión usa JWT HS256 de 15 minutos, emisor/audiencia verificados, `Authorization: Bearer`, y `sessionStorage` por pestaña; no usa localStorage ni cookies. Antes de mostrar una sesión se consulta `/auth/yo`; los permisos se leen de PostgreSQL en cada solicitud. El cierre elimina token y caché local. **No revoca el JWT en el servidor: sigue siendo válido hasta vencer.** No hay renovación automática. sessionStorage es accesible a JavaScript y una vulnerabilidad XSS podría robar el token; cerrar una pestaña normalmente lo elimina, aunque el navegador puede restaurar sesiones. El vencimiento del servidor es el límite definitivo. El limitador actual vive en memoria por proceso y se reinicia con el servidor. HTTPS, despliegue con proxy, revocación, recuperación de contraseña y verificación de correo quedan fuera de esta fase local.

Con el backend arrancado, comprobar manualmente:

```powershell
curl.exe -i http://localhost:3000/api/health
curl.exe -i -H "Origin: http://localhost:5173" http://localhost:3000/api/health
curl.exe -i -H "Origin: https://ejemplo.com" http://localhost:3000/api/health
```

Las dos primeras solicitudes responden `200` con `{"ok":true}`; la tercera responde `403` con `{"error":"Origen no permitido."}`. Las rutas inexistentes devuelven `404` y los fallos inesperados `500`, siempre con `{ "error": "mensaje" }`.

## Ejecutar los artefactos compilados localmente

Después de `npm.cmd run build`, abrir dos terminales en la raíz:

```powershell
# Terminal 1: backend compilado
npm.cmd run start --workspace backend
```

```powershell
# Terminal 2: frontend compilado (solo vista previa local)
npm.cmd run preview --workspace frontend
```

La vista previa también usa http://localhost:5173. Detener los servidores de desarrollo antes de usar los mismos puertos. Estas instrucciones no realizan despliegues.

## Estructura

```text
rotaandes/
├── AGENTS.md
├── PROYECTO.md
├── README.md
├── package.json
├── package-lock.json
├── eslint.config.mjs
├── tsconfig.base.json
├── docs/DECISIONES.md
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── vitest.config.ts
│   ├── vitest.base.config.ts
│   ├── prisma.config.ts
│   ├── prisma.pruebas.config.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/20261107000100_esquema_inicial/migration.sql
│   ├── scripts/
│   │   ├── comprobarConfiguracion.ts
│   │   ├── verificarBase.ts
│   │   ├── verificarNasa.ts
│   │   ├── verificarPronostico.ts
│   │   ├── verificarCalendario.ts
│   │   └── verificarEsquema.sql
│   ├── src/
│   │   ├── index.ts
│   │   ├── aplicacion.ts
│   │   ├── configuracion.ts
│   │   ├── lib/configuracionBase.ts
│   │   ├── lib/prisma.ts
│   │   ├── middleware/       (auth, rol, errores)
│   │   ├── routes/           (salud, auth, perfil, cultivos, terrenos, siembras, clima, pronostico, calendario)
│   │   ├── services/         (autenticacion, validacionAgricola, datosAgricolas, elevacion, nasaPower, clima, openMeteo, pronostico, calendario)
│   │   └── data/             (catalogoCultivos, respaldosClima, clima/)
│   └── tests/base-datos/     (persistencia, autenticacion, terrenosSiembras, clima, pronostico, calendario)
└── frontend/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── vitest.config.ts
    └── src/
        ├── main.tsx
        ├── Aplicacion.tsx
        ├── estilos.css
        ├── pages/            (Inicio, Acceso, EspacioPersonal, Perfil, Terrenos, EditarTerreno, DetalleTerreno)
        ├── components/      (Marco, ProveedorSesion, mapas, siembras, clima y confirmaciones)
        ├── lib/             (api, useSesion, useAgricultura)
        ├── types/api.ts
        └── tests/preparacion.ts
```

El asistente está en `scripts/configurarBaseLocal.ps1`; también se conservan todas las pruebas previas de backend, frontend y navegador. `dist/`, `node_modules/`, cliente generado, coberturas, archivos `.env` y pgpass quedan ignorados. Los ejemplos contienen únicamente valores ficticios y configuración pública local. Los módulos posteriores se implementarán cuando se soliciten y revisen.

La actualización conjunta de escenarios y visor NASA GIBS fue autorizada, enviada y desplegada como `012d6be`. El [informe de actualización](docs/INFORME_ACTUALIZACION_ESCENARIOS_CAPAS.md) registra las comprobaciones y el plan de reversión. El visor de imágenes conserva el GeoJSON analítico indisponible; no genera medias mensuales ni mediciones por parcela.
