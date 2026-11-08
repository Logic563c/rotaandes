# RotaAndes

Base local de la plataforma de apoyo a la siembra y rotación de cultivos de Cotopaxi. El alcance completo está en `PROYECTO.md` y las convenciones están en `AGENTS.md`.

Esta entrega contiene autenticación y perfil, persistencia PostgreSQL + Prisma, administración de terrenos y siembras, mapa Leaflet/OpenStreetMap, altitud estimada desde Open-Meteo, los diez cultivos referenciales autorizados y climatología histórica NASA POWER. Pronósticos, tendencias, calendario, rotaciones, capas satelitales y reportes siguen pendientes.

La entrega actual está documentada en [el informe de clima NASA](docs/INFORME_CLIMA_NASA.md). Los informes de [terrenos y siembras](docs/INFORME_TERRENOS_SIEMBRAS.md), [autenticación](docs/INFORME_AUTENTICACION.md) y [persistencia](docs/INFORME_PERSISTENCIA.md) conservan el cierre de las fases anteriores.

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

`VITE_API_URL` es el origen del backend, sin `/api`, credenciales, consulta ni fragmento. Las variables `VITE_*` son públicas; no colocar secretos en ellas. Reiniciar Vite después de cambiar su entorno y reconstruir el frontend si cambia su URL de producción.

Las URLs PostgreSQL de esta fase se limitan al servidor, puerto, rol y bases locales autorizados. Solo admiten el parámetro opcional `schema=public`, sin duplicados ni fragmentos; otros parámetros podrían sobrescribir la conexión en pg.

El backend escucha solo en `127.0.0.1`. CORS permite exactamente el origen configurado: `http://localhost:5173` o, si se elige expresamente, `http://127.0.0.1:5173`, métodos GET/POST/PUT/DELETE y encabezados Content-Type/Authorization. No permite comodines, dominios externos ni otros puertos. Las solicitudes sin `Origin`, como las de `curl`, pueden consultar el endpoint público. Las rutas privadas exigen Bearer independientemente de CORS.

Vite utiliza el puerto **5173** con `strictPort`: si está ocupado, muestra un error en lugar de cambiar de puerto. El backend informa si no puede abrir el **3000**. Si PowerShell no encuentra `backend/`, comprobar que la terminal está en la raíz indicada arriba.

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

PUT admite los campos editables presentes y rechaza cuerpos vacíos o claves adicionales. No acepta propietario, ID, altitud ni una asociación de terreno elegida por el cliente. `area_ha` se serializa como número o NULL; fechas DATE sin hora y timestamps como ISO. Los errores mantienen `{ error: "mensaje" }`. Guardados de terreno se limitan a 20 por usuario/minuto; el exceso responde 429.

Los datos JSON se consumen únicamente mediante `frontend/src/lib/api.ts`; Open-Meteo se consulta desde el servidor. Leaflet carga las imágenes cartográficas públicas de OpenStreetMap directamente como recurso visual del mapa solicitado, sin enviar JWT ni información de perfiles. Se mantiene atribución visible y el caché HTTP del navegador, sin precarga masiva. Las teselas pueden fallar; las coordenadas y la lista siguen disponibles. Las cachés privadas incorporan el ID del usuario y se limpian al cerrar sesión; las operaciones tardías comprueban que la sesión sigue activa.

Las pruebas de navegador usan Playwright contra los dos servicios compilados, sin simular el backend, con tamaños de escritorio y celular:

```powershell
npm.cmd run test:e2e
```

En Windows utilizan Microsoft Edge instalado. En otros sistemas, instalar primero Chromium con `npx playwright install chromium`. Dejar libres los puertos 3000 y 5173: las pruebas arrancan y detienen sus propios servidores. El backend E2E usa `NODE_ENV=test`, únicamente `TEST_DATABASE_URL` y un secreto JWT efímero. Las cuentas aleatorias se eliminan en `finally`, por correo exacto; las trazas están deshabilitadas para no almacenar credenciales ni Bearer. Las capturas quedan en `test-results/`, ignorado. `npm.cmd run check` incluye las pruebas SQL, las de navegador y el build. El frontend compilado debe usar el valor local predeterminado de `VITE_API_URL` para esta comprobación.

## Consultar climatología histórica

Abrir un terreno y pulsar **Ver climatología histórica**. El panel muestra lluvia mensual estimada y temperaturas con Recharts, una tabla accesible de los doce meses, humedad de raíces y riesgo heurístico de helada. Los valores ausentes aparecen como **Sin dato**; las curvas conservan los huecos. La tabla permite desplazamiento horizontal dentro de su contenedor en celular.

`GET /api/terrenos/:id/clima` exige Bearer y utiliza exclusivamente las coordenadas guardadas en PostgreSQL. Agricultores solo leen sus terrenos; técnicos pueden leerlos todos. UUID ajenos e inexistentes responden 404. La ruta no admite parámetros de consulta. Se conservan errores `{ error: "mensaje" }`, con 400/401/404/500 según corresponda y 429 para exceso de consultas (30 por usuario/minuto). No se amplía CORS.

La respuesta conserva `fuente`, `resolucion` y los campos mensuales originales bajo `mensual`; añade metadatos de periodo, consulta, coordenadas, parámetros/unidades, advertencias y estado. NASA se consulta únicamente desde el backend mediante `/api/temporal/climatology/point`, `community=AG`, `format=JSON`. Se verificaron los ocho parámetros: temperaturas en °C, PRECTOTCORR en mm/día, RH2M en %, GWETTOP/GWETROOT como índices 0–1 y radiación en MJ/m²/día. No confundir el índice de suelo con humedad volumétrica ni la mínima climatológica con días de helada observados.

La respuesta real archivada para Latacunga (-0,93; -78,62) declara **2001–2025**. Enero: 11,86 °C de media, mínima 3,97 °C, máxima 21,03 °C y 4 mm/día. La lluvia mensual se estima multiplicando por los días medios del mes del periodo: enero 124 mm y febrero 28,24 días (seis bisiestos). No son acumulados observados exactos de un año concreto. La resolución meteorológica es 0,5° × 0,625°; la solar 1° × 1°. No representa el microclima del lote.

`clima_cache` conserva datos normalizados por coordenadas exactas durante **30 días**. Se distingue consulta NASA, caché, dato anterior desactualizado y respaldo. Un fallo puede reutilizar datos anteriores válidos de la misma ubicación; cinco respuestas reales archivadas solo sirven de respaldo si coinciden exactamente sus coordenadas. No se sustituye un terreno por el punto regional más cercano. Sin información fiable se informa indisponibilidad. Los archivos públicos y su procedencia/SHA-256 están en `backend/src/data/clima/`; no se necesitan nuevas variables de entorno, claves NASA ni migraciones.

La comprobación real independiente, sin escribir en la base, es:

```powershell
npm.cmd run clima:verificar --workspace backend
```

Las pruebas habituales no consultan NASA: usan respuestas controladas identificadas como tales. Las pruebas SQL verifican autorización, caché y persistencia con rollback; las E2E climáticas usan una caché temporal en la base aislada, comprueban gráficas reales y fallo sin datos ficticios, y limpian sus registros. Las capturas de escritorio/celular quedan en `test-results/`, ignorado por Git. Véanse metodología, procedencia, resultados y limitaciones en [INFORME_CLIMA_NASA.md](docs/INFORME_CLIMA_NASA.md).

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
│   │   └── verificarEsquema.sql
│   ├── src/
│   │   ├── index.ts
│   │   ├── aplicacion.ts
│   │   ├── configuracion.ts
│   │   ├── lib/configuracionBase.ts
│   │   ├── lib/prisma.ts
│   │   ├── middleware/       (auth, rol, errores)
│   │   ├── routes/           (salud, auth, perfil, cultivos, terrenos, siembras, clima)
│   │   ├── services/         (autenticacion, validacionAgricola, datosAgricolas, elevacion, nasaPower, clima)
│   │   └── data/             (catalogoCultivos, respaldosClima, clima/)
│   └── tests/base-datos/     (persistencia, autenticacion, terrenosSiembras, clima)
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
