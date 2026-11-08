# Informe de autenticación y perfiles de RotaAndes

Fase implementada y verificada el 7 de noviembre de 2026 en `feat/base-datos-autenticacion`, sobre `ddff93a5554a1d45baeee9a31fdfc2bfbb275c1e`. El cierre usa el mensaje `Implementar autenticacion y perfiles de RotaAndes`. El hash se comunica en la entrega y puede consultarse con `git log -1 --oneline`.

## Resultado y contrato

| Método | Ruta | Comportamiento comprobado |
| --- | --- | --- |
| GET | `/api/health` | Conserva 200 y `{ ok: true }` |
| POST | `/api/auth/registro` | 201, agricultor persistido, `{ token, usuario }` |
| POST | `/api/auth/login` | 200 con credenciales verificadas, `{ token, usuario }` |
| GET | `/api/auth/yo` | 200 con usuario público; exige Bearer y usuario existente |
| PUT | `/api/perfil` | 200 con datos públicos guardados; exige Bearer |

No se modifican campos, tablas, tipos, restricciones ni migraciones. No se implementan CRUD agrícola, NASA, siembras, rotaciones, nuevas cuentas técnicas ni datos demo. El middleware de roles está preparado y probado, sin rutas demostrativas en producción.

Registro normaliza el correo por recorte y minúsculas; valida formato y longitud, rechaza duplicados y campos adicionales. La contraseña exige 15 caracteres como mínimo y hasta 72 bytes UTF-8, sin NUL y sin truncamiento o normalización. bcrypt utiliza coste 12 y sal por clave. Login responde con el mismo error ante correo desconocido o clave incorrecta, y realiza una comparación bcrypt también cuando no existe el usuario.

Perfil admite exclusivamente nombre, parroquia, teléfono y tres prioridades enteras 1–5. Rechaza rol, ID, contraseña y cualquier campo ajeno. Los campos opcionales vacíos se convierten en NULL. Las respuestas mantienen nombres como `prioridad_agua` y `creado_en`; excluyen `password_hash` y `passwordHash`.

## Sesión, permisos y secretos

- JWT HS256, vencimiento de 15 minutos, UUID en `sub`, emisor y audiencia verificados. Se rechazan firma alterada, expiración, otro algoritmo/audiencia y usuarios inexistentes o eliminados.
- Usuario y rol se consultan en PostgreSQL en cada petición privada. El registro público siempre asigna agricultor; un claim `rol` no concede permisos. Las cuentas técnicas autorizadas existentes pueden ingresar. Los filtros de propietario de futuros recursos se implementarán con el CRUD, no en esta fase.
- El navegador guarda el Bearer corto en sessionStorage por pestaña. `/auth/yo` debe confirmar la sesión antes de mostrar datos privados. TanStack Query mantiene usuario/caché; Context proporciona token y acciones.
- Logout elimina token y caché local. Las respuestas tardías no pueden repoblarla ni cerrar una cuenta distinta que haya iniciado sesión después. El JWT continúa siendo válido en el servidor hasta vencer; no hay revocación ni renovación automática.
- Se generó `JWT_SECRET` con 48 bytes criptográficamente aleatorios únicamente en `backend/.env`, sin mostrarlo. Su reejecución validó y conservó el valor. No se modificaron contraseñas PostgreSQL. El arranque exige configuración válida.
- CORS restringido al origen local configurado, GET/POST/PUT y Content-Type/Authorization. JSON hasta 16 KB, validación Zod estricta, errores centralizados en español y respuestas privadas sin caché.
- Límites por IP/proceso: 5 registros y 10 logins cada 15 minutos; exceso 429 con `{ error }` y Retry-After. No se confía en encabezados de proxy sin configurar.

Limitaciones documentadas: sessionStorage es accesible a JavaScript y una vulnerabilidad XSS podría sustraer el token; algunos navegadores restauran sesiones. El limitador reside en memoria y se reinicia con el proceso. Revocación, refresh tokens, recuperación de claves, validación de correo, HTTPS y configuración de hosting quedan fuera del alcance local actual. No se afirma que el sistema ya esté listo para un despliegue público sin esa revisión.

## Pantallas y comprobación visual

Rutas públicas `/`, `/registro` y `/login`; privadas `/inicio` y `/perfil`. Incluyen navegación, cierre de sesión, estados de espera/error/éxito, control para mostrar contraseña, etiquetas accesibles, foco visible, botones amplios y prioridades operables con teclado. Se conserva la identidad verde/tierra y el aviso de herramienta de apoyo.

Playwright recorrió registro, edición, recarga con persistencia, cierre, protección de perfil y nuevo login contra los servicios compilados reales. Se ejecutó en Edge a tamaño de escritorio y celular de 390 × 844. Se verificó ausencia de desbordamiento horizontal. Las capturas de registro y perfil se inspeccionaron visualmente.

Capturas locales, excluidas de Git:

```text
test-results/autenticacion-formularios--f6cd7-es-y-validación-en-pantalla-celular/registro.png
test-results/autenticacion-formularios--f6cd7-es-y-validación-en-pantalla-escritorio/registro.png
test-results/autenticacion-registro-per-8dfab-tente-cierre-y-login-reales-celular/perfil.png
test-results/autenticacion-registro-per-8dfab-tente-cierre-y-login-reales-escritorio/perfil.png
```

Las trazas del navegador están deshabilitadas para no registrar contraseñas ni Bearer. Las capturas utilizan datos sintéticos y no muestran contraseñas.

## Verificación final ejecutada

`npm.cmd run check` terminó con **código 0** después de la última corrección de sesiones. Ejecutó toda esta secuencia:

| Paso | Resultado real |
| --- | --- |
| `npm run lint` | Aprobado, cero errores y warnings de ESLint |
| `npm run typecheck` | Aprobado en herramientas, backend y frontend; strict activo |
| `npm run test` backend | 50 aprobadas en 4 archivos |
| `npm run test` frontend | 28 aprobadas en 3 archivos |
| `npm run test:db` | 58 aprobadas en 2 archivos; sin migraciones pendientes |
| `npm run build` backend | Prisma Client 7.10.1 generado y TypeScript compilado |
| `npm run build` frontend | Tipos y Vite 8.3.6 aprobados |
| Playwright | 6 aprobadas, escritorio y celular; 11,3 segundos |
| Total automatizado de `check` | **142 pruebas aprobadas, cero fallidas** |

También se ejecutaron por separado lint, typecheck, test y build. La auditoría npm de producción informó cero vulnerabilidades. Los únicos avisos del recorrido final de navegador fueron de precedencia entre NO_COLOR y FORCE_COLOR; no afectan las comprobaciones ni constituyen errores de la aplicación.

Las 58 pruebas SQL/HTTP comprenden las 32 de persistencia previas y 26 de autenticación: registro, entradas inválidas, duplicados, bcrypt, límite UTF-8, login, JWT, prioridades, perfil, aislamiento de usuarios, roles, no exposición de hash, CORS y tamaño/JSON. Las pruebas de interfaz incluyen sesión pendiente, errores, reintentos, cierre, validación de `/yo`, formularios, prioridades y respuestas tardías de una sesión anterior.

## Aislamiento y estado de PostgreSQL

Las pruebas HTTP de escritura se ejecutaron con Prisma inyectado en una transacción sobre `rotaandes_pruebas_36cbc85c` y finalizaron en rollback. Las E2E arrancan el backend con `NODE_ENV=test`, secreto efímero y exclusivamente TEST_DATABASE_URL validada. Sus cuentas aleatorias se eliminan en finally por correo exacto, sin borrar bases ni datos ajenos.

La inspección posterior, en transacciones de solo lectura, confirmó **cero registros en las seis tablas de dominio de ambas bases**. No quedaron cuentas ni datos de prueba y no se añadieron semillas.

`prisma migrate status` confirmó que `rotaandes_dev` y `rotaandes_pruebas_36cbc85c` siguen operativas y actualizadas. Ambas conservan solamente `20261107000100_esquema_inicial`, aplicada. La carpeta Prisma no tiene diferencias respecto al commit anterior. No se ejecutó reset, db push ni operaciones destructivas de migración.

## Archivos de esta fase

38 archivos: 18 agregados y 20 modificados respecto al commit anterior.

```text
M README.md
M backend/.env.example
M backend/package.json
A backend/scripts/prepararAutenticacion.ts
M backend/src/aplicacion.ts
M backend/src/index.ts
M backend/src/lib/prisma.ts
A backend/src/middleware/auth.ts
M backend/src/middleware/errores.ts
A backend/src/middleware/rol.ts
A backend/src/routes/auth.ts
A backend/src/routes/perfil.ts
A backend/src/services/autenticacion.ts
A backend/tests/autenticacion.test.ts
A backend/tests/base-datos/autenticacion.integration.test.ts
M backend/tests/salud.test.ts
M docs/DECISIONES.md
A docs/INFORME_AUTENTICACION.md
M frontend/package.json
A frontend/src/Aplicacion.test.tsx
A frontend/src/Aplicacion.tsx
A frontend/src/components/Marco.tsx
A frontend/src/components/ProveedorSesion.tsx
M frontend/src/estilos.css
M frontend/src/lib/api.test.ts
M frontend/src/lib/api.ts
A frontend/src/lib/useSesion.ts
M frontend/src/main.tsx
A frontend/src/pages/Acceso.tsx
A frontend/src/pages/EspacioPersonal.tsx
M frontend/src/pages/Inicio.test.tsx
M frontend/src/pages/Inicio.tsx
A frontend/src/pages/Perfil.tsx
M frontend/src/types/api.ts
M package-lock.json
M package.json
M playwright.config.ts
A tests/navegador/autenticacion.spec.ts
```

## Correcciones y auditoría Git

Se actualizó la expectativa anterior de preflight para admitir los métodos de autenticación. Se corrigió el nombre accesible del control de contraseña y se separó la simulación jsdom del teclado real de los sliders, que sí se probó en Edge. Se añadieron validaciones de caracteres de control para evitar errores PostgreSQL ante NUL y protección de caché frente a respuestas posteriores al cierre/cambio de cuenta.

La revisión de contenido y el escaneo de secretos no detectaron el secreto JWT, URLs privadas, claves o tokens reales en archivos versionables. Se verificaron integridades y origen del registro npm en el lockfile y no hubo actualizaciones de versiones de paquetes previamente instalados. Git ignora backend/.env, cliente generado, dependencias, builds, capturas y temporales. El ejemplo JWT permanece vacío. No se registran contraseñas ni Bearer en logs.

`PROYECTO.md` y `AGENTS.md` conservan sus hashes; `main` permanece en `ee4f8c8542744ddecf64a5f2ab58d6993e6e3431`. El commit se limita a esta fase y no incluye push, merge ni despliegue. La fase queda preparada para revisión; no se inicia automáticamente otro módulo.

## Probar localmente

El entorno local ya está preparado. Desde la raíz, `npm.cmd run dev` inicia ambos servicios. Abrir http://localhost:5173/registro, crear una cuenta propia, revisar Mi perfil y guardar prioridades. Cerrar sesión e ingresar de nuevo desde http://localhost:5173/login. No es necesario ejecutar SQL ni configurar archivos manualmente. No se dejaron servicios de pruebas ocupando los puertos al finalizar.
