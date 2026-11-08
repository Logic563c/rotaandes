# Preparación de publicación de RotaAndes

Fecha de comprobación local: 8 de noviembre de 2026.

**Estado: preparado y comprobado localmente; no publicado.** No existe todavía una URL pública verificada del frontend ni del backend. No se han creado repositorios remotos ni servicios, enviado código, migrado producción o activado despliegues en esta fase. No se presenta la autenticación de una plataforma como evidencia de publicación.

## Origen y protección

- Base: `54645c960915f273a9e8cb4f7e0432e768c6928e`, comparador ya implementado.
- Rama de preparación: `release/publicacion`, sin modificar `feat/rotaciones`.
- `main` permanece en `ee4f8c8542744ddecf64a5f2ab58d6993e6e3431`.
- Etiqueta local anotada `v0.1.0-primera-entrega`: objeto `9d5f716dcf9c4cd357066404879bf5e767409dd3`, commit `92a7d2f53ede7fe524cd45e5bd7f8d4e454dd3e9`.
- `PROYECTO.md`, `AGENTS.md`, esquema y migración original no se modifican. No se implementan nuevos módulos agrícolas.

El commit local de preparación se identifica en el historial de `release/publicacion` con el mensaje `Preparar publicacion segura en Railway y Vercel`. **No hay un commit de producción publicado.** Este informe no incluye su propio hash para evitar una referencia circular.

## Plataformas y permisos

| Plataforma | Comprobación realizada | Situación pendiente |
| --- | --- | --- |
| GitHub | Usuario eligió `Logic563c`; autenticación oficial y verificación de esa identidad. No se encontró un repositorio RotaAndes propio; Git local no tiene remote. | Aprobar creación de `Logic563c/rotaandes` privado y envío de la rama revisada; la selección de cuenta no autoriza esas acciones. |
| Vercel | Sesión oficial completada; contexto `logic563`; listado sin un proyecto RotaAndes. | Revisar recursos/condiciones, aprobar proyecto y publicación, asignar URL y variables reales. |
| Railway | CLI oficial 5.71.0 consultado; intento de autorización expirado. | Completar sesión oficial y revisar proyectos autorizados antes de crear nada. No se ha verificado el inventario de la cuenta. |

No se han contratado recursos ni verificado un plan/costo de producción. Cualquier PostgreSQL persistente, volumen, backend o recurso adicional requiere aprobación previa. No se seleccionan proyectos ajenos ni se duplican servicios existentes. No se guardan contraseñas o tokens en la documentación.

## Arquitectura preparada

```text
Navegador --HTTPS--> Vercel: React/Vite
         --HTTPS + Bearer--> Railway: Express/Node
                              |-- red privada --> PostgreSQL de producción
                              |-- HTTPS --> NASA POWER / Open-Meteo
```

Es una arquitectura propuesta, todavía sin infraestructura creada. El navegador consume la API mediante `frontend/src/lib/api.ts`; las teselas públicas OpenStreetMap mantienen su atribución y carga visual habitual. Las APIs científicas se consultan desde backend. No se copian las bases locales ni se altera su configuración.

### Compilación y arranque

Los dos servicios utilizan **la raíz del monorepo**: `package-lock.json` y workspaces de raíz. Seleccionar solamente `backend/` o `frontend/` como raíz de instalación perdería ese contexto.

| Destino | Configuración preparada |
| --- | --- |
| Railway | `railway.json`, builder Railpack, Node 24.20.0, npm 11.19.0 |
| Instalación/backend | `npm ci --include=dev` y `npm run build --workspace backend`; generación Prisma 7.10.1 y TypeScript |
| Predeploy | `npm run produccion:preparar --workspace backend`, exclusivamente tras autorización |
| Arranque | `npm run start --workspace backend`, servidor compilado, `0.0.0.0`, PORT de Railway |
| Healthcheck | `/api/health`, 60 segundos; una réplica, reinicios limitados ON_FAILURE |
| Vercel | `vercel.json`, instalación desde raíz, `npm run build:publicacion --workspace frontend`, salida `frontend/dist` |
| SPA | Rewrite a `/index.html`, pendiente comprobar recargas de `/registro`, `/login` y detalle en URL real |
| Publicación Git | Automática desactivada en Vercel; elegir únicamente `release/publicacion` para las publicaciones aprobadas y desactivar autodeploy en Railway al vincularlo |

Railpack conserva devDependencies porque el predeploy utiliza Prisma CLI/tsx; no se cargan dependencias locales ni binarios Windows. No se ha ejecutado todavía una compilación Linux/Railpack o Vercel real. Las verificaciones aquí reportadas son de Windows local.

### Variables privadas y públicas

| Variable | Uso |
| --- | --- |
| `NODE_ENV=production` | Perfil de producción, sin cargar `.env` local |
| `PORT` | Inyectado por Railway |
| `TRUST_PROXY_HOPS=1` | Un salto de proxy; comprobar IP efectiva/límites en la infraestructura real |
| `CORS_ORIGIN` | Un origen HTTPS exacto del frontend Vercel, sin comodines |
| `DATABASE_URL` | Referencia privada al PostgreSQL autorizado; nunca URL local/pública ni valor VITE |
| `DATABASE_HOST`, `DATABASE_NAME`, `DATABASE_USER` | Pines del destino autorizado; deben coincidir con la URL privada |
| `JWT_SECRET` | Aleatorio y robusto, generado para producción; no reutilizar el local |
| `UMBRAL_HELADA_C` | Configuración opcional existente; predeterminado 2 °C |
| `RAILPACK_NODE_VERSION=24.20.0` | Versión de Node |
| `RAILPACK_NODE_NPM_INSTALL=npm ci --include=dev` | Instalación reproducible con herramientas del predeploy |
| `RAILPACK_NO_SPA=true` | Backend sin servidor SPA automático |
| `RAILPACK_PRUNE_DEPS=false` | Mantener herramientas requeridas en el predeploy |
| `VITE_API_URL` | Origen HTTPS real del backend Railway; es información pública compilada |

Las plantillas `backend/.env.production.example` y `frontend/.env.production.example` contienen campos vacíos/configuración pública, sin secretos. Las referencias entre servicios deben configurarse dentro de Railway. El rol y privilegios reales deben inspeccionarse al seleccionar la base; no se declara aplicado mínimo privilegio antes de esa comprobación. Deshabilitar exposición pública innecesaria de PostgreSQL y verificar persistencia/volumen antes de aprobar producción.

## Persistencia y migraciones

Se conserva Prisma CLI/Client/adapter **7.10.1**, la migración **20261107000100_esquema_inicial** y las seis tablas `usuarios`, `terrenos`, `cultivos`, `siembras`, `plantillas_rotacion`, `clima_cache`.

`backend/prisma.produccion.config.ts` acepta únicamente producción y el destino privado fijado. `prepararProduccion.ts` consulta las tablas existentes y se detiene si encuentra otras en public; ejecuta `prisma migrate deploy`, comprueba las siete tablas contando `_prisma_migrations`, los cuatro CHECK de usuarios y las tres claves foráneas. Después ejecuta las funciones originales de semilla en transacción: diez cultivos y ocho plantillas. No crea usuarios ni siembras; no utiliza reset, migrate dev o db push ni cambia credenciales. El migrador captura su salida y devuelve mensajes controlados para evitar revelar conexiones.

**Ejecución de producción pendiente de autorización y base seleccionada.** No se afirma que la nueva utilidad haya aplicado migraciones en Railway. El healthcheck conserva `{ "ok": true }`; el arranque de producción comprueba PostgreSQL mediante una consulta real antes de escuchar.

Verificación local posterior a las pruebas:

| Base | Usuarios | Terrenos | Cultivos | Siembras | Plantillas | Caché |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `rotaandes_dev` | 0 | 0 | 10 | 0 | 8 | 0 |
| `rotaandes_pruebas_36cbc85c` | 0 | 0 | 0 | 0 | 0 | 0 |

Ambas mantienen la migración original aplicada. No se borraron/recrearon bases ni se dejaron cuentas/registros de las pruebas. No se usaron datos locales de personas para una publicación.

## Seguridad y defectos corregidos

1. El servidor y validación de base admitían exclusivamente loopback/local: se creó un perfil explícito de producción con host/puerto, CORS exacto, red privada y pines de destino, conservando las restricciones locales.
2. Una comprobación real del proceso mostró que `$connect()` podía inicializar el pool sin validar PostgreSQL y permitir escuchar con base inaccesible. Se añadió `SELECT 1`; la regresión falla antes de corregirlo y pasa después. El proceso compilado ahora termina con código 1 sin escuchar ni revelar el destino.
3. La compilación local del frontend permitía conservar localhost: se añadió modo `publicacion` con validación del origen HTTPS. Se reprodujo además que la comprobación inicial de sufijos aceptaba dominios con comodín; los dos validadores ahora exigen nombres concretos y las regresiones correspondientes pasan. Los builds habituales siguen siendo locales para las pruebas, y no deben usarse para publicar.
4. Se añadieron encabezados de seguridad y configuración SPA. La CSP permite estilos inline requeridos por Leaflet y teselas OpenStreetMap; scripts permanecen propios. CORS no admite comodines. Validar los encabezados efectivos en la URL real sigue pendiente.
5. `.gitignore`, `.vercelignore` y `.railwayignore` excluyen metadatos de proveedores, entornos, claves y artefactos. ESLint excluye artefactos de `.tmp` y resultados generados que aparecieron durante una comprobación del bundle, sin desactivar análisis del código.

Se conserva el almacenamiento de sesión, JWT, autorización por propietario, lectura técnica, contraseñas hash y límites de rutas existentes. Las pruebas anteriores continúan pasando. Falta verificar IP/proxy/límites, HTTPS, acceso entre usuarios y errores en producción; no equivalen a una auditoría de un servicio ya desplegado.

## Comprobaciones ejecutadas

| Comprobación | Resultado real local |
| --- | --- |
| `npm.cmd run check` | Código 0; incluye lint, typecheck, pruebas, PostgreSQL, build y Playwright |
| Backend | 258 pruebas aprobadas, 16 archivos |
| Frontend | 85 pruebas aprobadas, 9 archivos |
| PostgreSQL aislado | 120 pruebas aprobadas, 8 archivos |
| Playwright | 20 E2E: 16 casos y 4 recorridos integrales, escritorio/celular |
| Total | **483 pruebas aprobadas** |
| `npm.cmd audit --omit=dev` | Código 0, cero vulnerabilidades conocidas en esa consulta |
| Proceso compilado de producción, destino inaccesible de prueba | Código 1 controlado; no abre puerto; no vuelca conexión |
| Fábrica HTTP configurada para producción | Escucha localmente en `0.0.0.0`/puerto asignado, health 200 y CORS exacto |
| Build de publicación con localhost | Rechazo esperado |
| Build de publicación con origen HTTPS controlado | Código 0; sin fallback local ni valores privados reales en el bundle |
| Git | Diff revisado; archivos privados ignorados; historial previo de 9 commits/259 blobs sin coincidencias de secretos reales |

El dominio HTTPS usado para compilar en la prueba es ficticio, no se consulta y no se presenta como dirección de RotaAndes. Las URLs con credenciales detectadas en dos pruebas nuevas corresponden exclusivamente a fixtures explícitas sin credenciales reales, revisadas manualmente. No se instalaron dependencias de aplicación ni se alteró el lockfile.

Los E2E preservan autenticación, terrenos/siembras, NASA, pronóstico, calendario y rotaciones con respuestas climáticas **controladas**, SQL real aislado y limpieza. No acreditan un recorrido de producción con NASA/Open-Meteo reales. Las capturas locales permanecen en `test-results/` y `test-results/integral/`, ignoradas por Git; incluyen escritorio/celular del recorrido y comparador. **No existen capturas ni pruebas de un despliegue público en esta fase.** Los informes previos conservan las comprobaciones externas históricas; no se presentan como realizadas nuevamente en producción.

## Archivos de esta preparación

- Plataforma: `railway.json`, `vercel.json`, `.railwayignore`, `.vercelignore`, `.gitignore`.
- Backend: `package.json`, `prisma.config.ts`, nuevo `prisma.produccion.config.ts`, plantilla de entorno de producción y `scripts/prepararProduccion.ts`.
- Servidor: `src/index.ts`, `src/aplicacion.ts`, `src/configuracion.ts`, `src/lib/configuracionBase.ts`, `src/lib/prisma.ts`.
- Pruebas backend: `tests/configuracion.test.ts`, `tests/produccion.test.ts`, `tests/arranqueProduccion.test.ts`.
- Frontend: `package.json`, `vite.config.ts`, `src/lib/api.ts`, `src/lib/configuracionPublicacion.ts` y su prueba, plantilla de entorno de producción.
- Raíz/documentación: `package.json`, `eslint.config.mjs`, `README.md`, `docs/DECISIONES.md` y este informe.

## Pasos pendientes para publicar

1. Revisar y aprobar el commit local, la creación del repositorio privado `Logic563c/rotaandes` y el envío de `release/publicacion` con su historia y etiqueta de primera entrega. Verificar el propietario antes de crear; no sobrescribir un remoto existente.
2. Completar el inicio de sesión oficial Railway y consultar proyectos/servicios. Presentar el proyecto y los recursos concretos y solicitar aprobación de costos antes de crear PostgreSQL/backend. Reutilizar recursos autorizados si existen.
3. Preparar la base privada nueva y sus referencias, secreto JWT nuevo, perfil de proxy, dominio backend y origen frontend. Verificar rol/privilegios, volumen y ausencia de acceso público PostgreSQL innecesario. No copiar datos o claves locales.
4. Obtener autorización de migración de esa base y de activación pública. Ejecutar el predeploy reproducible, verificar esquema, semillas y estado de migraciones.
5. Crear/configurar Vercel autorizado con URL backend real y rama estable; no activar autodeploy de ramas de trabajo. Verificar health, CORS y SPA por HTTPS, sin confundir un build aprobado con una aplicación utilizable.
6. Ejecutar el recorrido real en escritorio/celular: registro aleatorio, login, prioridades, terreno, dos siembras, NASA, pronóstico, calendario, rotaciones, nuevo login/persistencia y aislamiento frente a una segunda cuenta. Vigilar consola/red y atribuciones. Eliminar solo filas de esas cuentas por identificadores exactos, sin tocar datos de terceros. No guardar credenciales en capturas/trazas.
7. Reiniciar el backend y verificar persistencia; volver a comprobar permisos y errores. Documentar URLs/commit/evidencias reales y sus limitaciones antes de declarar la publicación operativa.

## Actualización y reversión previstas

Para actualizar: trabajar en rama, ejecutar check, revisar contenido/historial/secretos, aprobar el commit y el push, y publicar únicamente la revisión aprobada. Mantener migraciones aditivas revisadas y respaldos propios del proveedor; no usar una base local ni ejecutar semillas de prueba. Reconstruir frontend si cambia `VITE_API_URL` y actualizar CORS exacto si cambia el origen.

Para revertir código: seleccionar el último despliegue funcional en cada proveedor y comprobar sus variables/compatibilidad con el esquema persistente. No revertir una base mediante reset ni eliminar registros para acomodar código anterior. Una migración futura incompatible necesita un plan específico de respaldo/recuperación y aprobación. Estas operaciones todavía no se han ejecutado en producción.

Vigilar consumo/costos, cuotas de APIs científicas, almacenamiento/respaldos, memoria del backend, latencia y registros sin secretos. Las cachés, deduplicación y límites actuales son por proceso o PostgreSQL según el módulo; no se ha realizado una prueba de carga distribuida. Los indicadores agrícolas siguen siendo referenciales, sin validación agronómica local ni garantías de resultados.

Referencias oficiales: [monorepos Railway](https://docs.railway.com/deployments/monorepo), [configuración Railway](https://docs.railway.com/config-as-code/reference), [red privada Railway](https://docs.railway.com/networking/private-networking), [Railpack Node](https://railpack.com/languages/node/), [Git Vercel](https://vercel.com/docs/project-configuration/git-configuration), [rewrites Vercel](https://vercel.com/docs/routing/rewrites), [exclusiones Vercel](https://vercel.com/docs/deployments/vercel-ignore).
