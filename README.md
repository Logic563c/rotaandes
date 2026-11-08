# RotaAndes

Base local de la plataforma de apoyo a la siembra y rotación de cultivos de Cotopaxi. El alcance completo está en `PROYECTO.md` y las convenciones están en `AGENTS.md`.

Esta entrega contiene la página inicial, persistencia PostgreSQL + Prisma, registro de agricultores, inicio y cierre local de sesión, perfil y autorización por roles. No incluye CRUD agrícola, semillas ni integraciones externas.

El estado local y los resultados están en [el informe de autenticación](docs/INFORME_AUTENTICACION.md). El [informe de persistencia](docs/INFORME_PERSISTENCIA.md) conserva el cierre de la fase anterior.

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

El backend escucha solo en `127.0.0.1`. CORS permite exactamente el origen configurado: `http://localhost:5173` o, si se elige expresamente, `http://127.0.0.1:5173`, métodos GET/POST/PUT y encabezados Content-Type/Authorization. No permite comodines, dominios externos ni otros puertos. Las solicitudes sin `Origin`, como las de `curl`, pueden consultar el endpoint público. Las rutas privadas exigen Bearer independientemente de CORS.

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

Se fijan `prisma`, `@prisma/client` y `@prisma/adapter-pg` a **7.10.1**. Prisma 7 usa `backend/prisma.config.ts` para la URL y el adaptador `pg` para el cliente. El cliente se genera explícitamente en `backend/src/generated/prisma/`, excluido de Git, y se compila con el backend. `dev`, `typecheck` y `build` lo generan automáticamente; generar el cliente no conecta a PostgreSQL.

La migración `20261107000100_esquema_inicial` crea las seis tablas en una transacción. Incluye los cuatro `CHECK`, el correo único, la nulabilidad exacta y las acciones de claves foráneas de `PROYECTO.md`. No ejecutar `db push`, `migrate reset` ni editar una migración ya aplicada. En esta etapa se aplica con `migrate deploy`; no necesita shadow database ni conceder `CREATEDB` a la aplicación.

`backend/src/lib/prisma.ts` proporciona una instancia reutilizable y su cierre explícito. `/api/health` conserva `{ "ok": true }` como comprobación del proceso HTTP y funciona de forma independiente de la base. La verificación de PostgreSQL se realiza con `db:verify`, sin añadir endpoints al contrato.

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

Las pruebas de navegador usan Playwright contra los dos servicios compilados, sin simular el backend, con tamaños de escritorio y celular:

```powershell
npm.cmd run test:e2e
```

En Windows utilizan Microsoft Edge instalado. En otros sistemas, instalar primero Chromium con `npx playwright install chromium`. Dejar libres los puertos 3000 y 5173: las pruebas arrancan y detienen sus propios servidores. El backend E2E usa `NODE_ENV=test`, únicamente `TEST_DATABASE_URL` y un secreto JWT efímero. Las cuentas aleatorias se eliminan en `finally`, por correo exacto; las trazas están deshabilitadas para no almacenar credenciales ni Bearer. Las capturas quedan en `test-results/`, ignorado. `npm.cmd run check` incluye las pruebas SQL, las de navegador y el build. El frontend compilado debe usar el valor local predeterminado de `VITE_API_URL` para esta comprobación.

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
│   │   └── migrations/20261107000100_esquema_inicial/migration.sql
│   ├── scripts/
│   │   ├── comprobarConfiguracion.ts
│   │   ├── verificarBase.ts
│   │   └── verificarEsquema.sql
│   ├── src/
│   │   ├── index.ts
│   │   ├── aplicacion.ts
│   │   ├── configuracion.ts
│   │   ├── lib/configuracionBase.ts
│   │   ├── lib/prisma.ts
│   │   ├── middleware/errores.ts
│   │   └── routes/salud.ts
│   └── tests/base-datos/persistencia.integration.test.ts
└── frontend/
    ├── .env.example
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── vitest.config.ts
    └── src/
        ├── main.tsx
        ├── estilos.css
        ├── pages/Inicio.tsx
        ├── lib/api.ts
        ├── types/api.ts
        └── tests/preparacion.ts
```

El asistente está en `scripts/configurarBaseLocal.ps1`; también se conservan todas las pruebas previas de backend, frontend y navegador. `dist/`, `node_modules/`, cliente generado, coberturas, archivos `.env` y pgpass quedan ignorados. Los ejemplos contienen únicamente valores ficticios y configuración pública local. Los módulos posteriores se implementarán cuando se soliciten y revisen.
