# Preparación de publicación de RotaAndes

Fecha de comprobación local: 8 de noviembre de 2026.

**Estado: repositorio privado creado y verificado; aplicación todavía no publicada.** No existe una URL pública verificada del frontend ni del backend. El usuario aprobó crear [Logic563c/rotaandes](https://github.com/Logic563c/rotaandes) y enviar `b81cda83b7f9d31b799f70cc1d4114f62cc0ed7a` y la etiqueta original: se verificaron sus 172 archivos, diez commits de historia, privacidad y rama predeterminada `release/publicacion`. GitHub Pages está desactivado. No se han creado servicios, migrado producción ni activado despliegues. La adaptación posterior a Railway IaC requiere un nuevo envío aprobado.

## Origen y protección

- Base: `54645c960915f273a9e8cb4f7e0432e768c6928e`, comparador ya implementado.
- Rama de preparación: `release/publicacion`, sin modificar `feat/rotaciones`.
- `main` permanece en `ee4f8c8542744ddecf64a5f2ab58d6993e6e3431`.
- Etiqueta local anotada `v0.1.0-primera-entrega`: objeto `9d5f716dcf9c4cd357066404879bf5e767409dd3`, commit `92a7d2f53ede7fe524cd45e5bd7f8d4e454dd3e9`.
- `PROYECTO.md`, `AGENTS.md`, esquema y migración original no se modifican. No se implementan nuevos módulos agrícolas.

El commit inicial de preparación es `b81cda8`, `Preparar publicacion segura en Railway y Vercel`, ya enviado con autorización. **No hay un commit de producción desplegado.** La adaptación posterior se identifica con `Actualizar infraestructura Railway y estado de publicacion`; este informe no incluye su propio hash para evitar una referencia circular.

## Plataformas y permisos

| Plataforma | Comprobación realizada | Situación pendiente |
| --- | --- | --- |
| GitHub | Creación y push aprobados y ejecutados; origen `https://github.com/Logic563c/rotaandes.git`, privado, rama `release/publicacion`, `b81cda8` y etiqueta original comprobados por API. | Autorizar cualquier nuevo envío; no se publicó `main` ni otras ramas. |
| Vercel | Sesión completada; contexto `logic563`, rol OWNER, plan Hobby; sin proyecto RotaAndes. | Aprobar proyecto/publicación para la demostración no comercial, asignar URL y variables reales. |
| Railway | Sesión completada; único espacio personal `414c64a6-756d-4ba8-8a67-c43ffe979595`, cero proyectos. API: HOBBY en prueba, 30 días restantes y 5 USD de crédito; consumo y factura actuales cero. | Aprobar recursos dentro del crédito, migración y activación. No se contrata una suscripción ni se aceptan cargos adicionales automáticamente. |

No se han contratado recursos. La prueba y su crédito no garantizan disponibilidad permanente: vigilar consumo, vencimiento y persistencia del volumen. Cualquier PostgreSQL persistente, volumen, backend o recurso adicional requiere aprobación previa. No se seleccionan proyectos ajenos ni se duplican servicios existentes. No se guardan contraseñas o tokens en la documentación.

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
| Railway | `.railway/railway.ts`, builder Railpack, Node 24.20.0, npm 11.19.0 |
| Instalación/backend | `npm ci --include=dev` y `npm run build --workspace backend`; generación Prisma 7.10.1 y TypeScript |
| Predeploy | `npm run produccion:preparar --workspace backend`, exclusivamente tras autorización |
| Arranque | `npm run start --workspace backend`, servidor compilado, `0.0.0.0`, PORT de Railway |
| Healthcheck | `/api/health`, 60 segundos; una réplica, reinicios limitados ON_FAILURE |
| Vercel | `vercel.json`, instalación desde raíz, `npm run build:publicacion --workspace frontend`, salida `frontend/dist` |
| SPA | Rewrite a `/index.html`, pendiente comprobar recargas de `/registro`, `/login` y detalle en URL real |
| Publicación Git | Automática desactivada en Vercel; backend IaC sin source GitHub para no activar autodeploy, carga por CLI solo de revisiones limpias/aprobadas de `release/publicacion` |

Railpack conserva devDependencies porque el predeploy utiliza Prisma CLI/tsx; no se cargan dependencias locales ni binarios Windows. No se ha ejecutado todavía una compilación Linux/Railpack o Vercel real. Las verificaciones aquí reportadas son de Windows local.

La consulta del CLI 5.71.0 y la documentación actual detectó que `railway.json` solo se conserva para servicios antiguos y deja de leerse el 1 de diciembre de 2026. Se retiró el archivo inicial antes de crear servicios. La configuración TypeScript utiliza el SDK oficial `railway@3.16.0` como herramienta de desarrollo, fija proyecto `rotaandes`/entorno `production` y rechaza otros contextos. Declara únicamente PostgreSQL privado y backend (una réplica, límite de 512 MiB/1 CPU). Primero se revisa el plan: ninguna eliminación está autorizada. No se aplica IaC sin aprobación.

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
| `ROTAANDES_APP_PASSWORD` | Variable compartida privada, referencia únicamente desde PostgreSQL para inicializar el rol y componer su URL |
| `ROTAANDES_JWT_SECRET` | Variable compartida privada referenciada por el JWT_SECRET del backend |
| `ROTAANDES_CORS_ORIGIN` | Variable compartida con el origen público exacto del frontend |

Las plantillas `backend/.env.production.example` y `frontend/.env.production.example` contienen campos vacíos/configuración pública, sin secretos. Las referencias entre servicios deben configurarse dentro de Railway. Generar las dos claves con `node:crypto`, guardarlas selladas en la plataforma y no pasarlas como argumentos ni registrarlas. No usar el generador determinista del contexto SDK para secretos. Los privilegios y el aislamiento reales todavía deben comprobarse en la base seleccionada. Verificar red privada, ausencia de TCP público y persistencia/volumen antes de migrar.

## Persistencia y migraciones

Se conserva Prisma CLI/Client/adapter **7.10.1**, la migración **20261107000100_esquema_inicial** y las seis tablas `usuarios`, `terrenos`, `cultivos`, `siembras`, `plantillas_rotacion`, `clima_cache`.

`backend/prisma.produccion.config.ts` acepta únicamente producción y el destino privado fijado. `prepararProduccion.ts` consulta las tablas existentes y se detiene si encuentra otras en public; ejecuta `prisma migrate deploy`, comprueba las siete tablas contando `_prisma_migrations`, los cuatro CHECK de usuarios y las tres claves foráneas. Después ejecuta las funciones originales de semilla en transacción: diez cultivos y ocho plantillas. No crea usuarios ni siembras; no utiliza reset, migrate dev o db push ni cambia credenciales. El migrador captura su salida y devuelve mensajes controlados para evitar revelar conexiones.

Antes del predeploy, `backend/scripts/configurarRolProduccion.sql` se ejecutará por SSH únicamente dentro del PostgreSQL nuevo autorizado. Requiere versión 18, obtiene la clave privada desde el entorno, suprime registro de sentencias sensibles en esa sesión y crea `rotaandes_app` sin SUPERUSER/CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS y `rotaandes_prod` UTF8 si faltan. Reutiliza recursos compatibles y se detiene ante diferencias; no cambia contraseñas ni propietarios existentes. El backend referencia la URL del rol de aplicación y no recibe credenciales administrativas. Esta preparación no es una migración del modelo y todavía no se ha ejecutado.

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
| Backend | 262 pruebas aprobadas, 17 archivos |
| Frontend | 85 pruebas aprobadas, 9 archivos |
| PostgreSQL aislado | 120 pruebas aprobadas, 8 archivos |
| Playwright | 20 E2E: 16 casos y 4 recorridos integrales, escritorio/celular |
| Total | **487 pruebas aprobadas** |
| `npm.cmd audit --omit=dev` | Código 0, cero vulnerabilidades conocidas en esa consulta |
| Proceso compilado de producción, destino inaccesible de prueba | Código 1 controlado; no abre puerto; no vuelca conexión |
| Fábrica HTTP configurada para producción | Escucha localmente en `0.0.0.0`/puerto asignado, health 200 y CORS exacto |
| Build de publicación con localhost | Rechazo esperado |
| Build de publicación con origen HTTPS controlado | Código 0; sin fallback local ni valores privados reales en el bundle |
| IaC, sin aplicar | Cuatro pruebas: rechazo de contextos ajenos, PostgreSQL sin TCP público, referencias privadas y backend sin autodeploy; TypeScript y ESLint del archivo verificados |
| Git | Diff revisado; archivos privados ignorados; historia enviada de diez commits/287 blobs sin coincidencias de secretos reales |

El dominio HTTPS usado para compilar en la prueba es ficticio, no se consulta y no se presenta como dirección de RotaAndes. Las URLs con credenciales detectadas en dos pruebas nuevas corresponden a fixtures explícitas sin credenciales reales, revisadas manualmente. La URL IaC contiene referencias privadas de Railway, nunca una clave literal. No se instalaron dependencias de aplicación; el lockfile añade únicamente el SDK de infraestructura y sus dos dependencias, con origen/integridad revisados.

Los E2E preservan autenticación, terrenos/siembras, NASA, pronóstico, calendario y rotaciones con respuestas climáticas **controladas**, SQL real aislado y limpieza. No acreditan un recorrido de producción con NASA/Open-Meteo reales. Las capturas locales permanecen en `test-results/` y `test-results/integral/`, ignoradas por Git; incluyen escritorio/celular del recorrido y comparador. **No existen capturas ni pruebas de un despliegue público en esta fase.** Los informes previos conservan las comprobaciones externas históricas; no se presentan como realizadas nuevamente en producción.

## Archivos de esta preparación

- Plataforma: `.railway/railway.ts` (sustituye `railway.json`), `vercel.json`, `.railwayignore`, `.vercelignore`, `.gitignore`.
- Backend: `package.json`, `prisma.config.ts`, nuevo `prisma.produccion.config.ts`, plantilla de entorno de producción y `scripts/prepararProduccion.ts`.
- Servidor: `src/index.ts`, `src/aplicacion.ts`, `src/configuracion.ts`, `src/lib/configuracionBase.ts`, `src/lib/prisma.ts`.
- Pruebas backend: `tests/configuracion.test.ts`, `tests/produccion.test.ts`, `tests/arranqueProduccion.test.ts`, `tests/infraestructura.test.ts`; bootstrap de rol/base: `scripts/configurarRolProduccion.sql`.
- Frontend: `package.json`, `vite.config.ts`, `src/lib/api.ts`, `src/lib/configuracionPublicacion.ts` y su prueba, plantilla de entorno de producción.
- Raíz/documentación: `package.json`, `package-lock.json`, `tsconfig.herramientas.json`, `eslint.config.mjs`, `README.md`, `docs/DECISIONES.md` y este informe.

## Pasos pendientes para publicar

1. Aprobar el envío de la adaptación IaC posterior a `b81cda8`. El repositorio privado, su identidad y la etiqueta original ya están verificados; no sobrescribirlos ni forzar historia.
2. Aprobar el proyecto `rotaandes` en el espacio personal Railway comprobado, PostgreSQL 18 privado y backend, sin contratar planes, dentro de los 5 USD de crédito de prueba. Revisar el plan de recursos antes de aplicarlo; no hay autorización para eliminaciones. Aprobar también el proyecto Vercel Hobby de demostración y la activación pública correspondiente.
3. Preparar la base privada `rotaandes_prod` y el rol `rotaandes_app` mediante el script revisado, referencias privadas, secreto JWT nuevo, perfil de proxy, dominio backend y origen frontend. Verificar privilegios, volumen y ausencia de acceso público PostgreSQL. No copiar datos o claves locales.
4. Obtener autorización de migración de esa base y de activación pública. Ejecutar el predeploy reproducible, verificar esquema, semillas y estado de migraciones.
5. Crear/configurar Vercel autorizado con URL backend real y rama estable; no activar autodeploy de ramas de trabajo. Verificar health, CORS y SPA por HTTPS, sin confundir un build aprobado con una aplicación utilizable.
6. Ejecutar el recorrido real en escritorio/celular: registro aleatorio, login, prioridades, terreno, dos siembras, NASA, pronóstico, calendario, rotaciones, nuevo login/persistencia y aislamiento frente a una segunda cuenta. Vigilar consola/red y atribuciones. Eliminar solo filas de esas cuentas por identificadores exactos, sin tocar datos de terceros. No guardar credenciales en capturas/trazas.
7. Reiniciar el backend y verificar persistencia; volver a comprobar permisos y errores. Documentar URLs/commit/evidencias reales y sus limitaciones antes de declarar la publicación operativa.

## Actualización y reversión previstas

Para actualizar: trabajar en rama, ejecutar check, revisar contenido/historial/secretos, aprobar el commit y el push, y publicar únicamente la revisión aprobada. Mantener migraciones aditivas revisadas y respaldos propios del proveedor; no usar una base local ni ejecutar semillas de prueba. Reconstruir frontend si cambia `VITE_API_URL` y actualizar CORS exacto si cambia el origen.

Para revertir código: seleccionar el último despliegue funcional en cada proveedor y comprobar sus variables/compatibilidad con el esquema persistente. No revertir una base mediante reset ni eliminar registros para acomodar código anterior. Una migración futura incompatible necesita un plan específico de respaldo/recuperación y aprobación. Estas operaciones todavía no se han ejecutado en producción.

Vigilar consumo/costos, cuotas de APIs científicas, almacenamiento/respaldos, memoria del backend, latencia y registros sin secretos. Las cachés, deduplicación y límites actuales son por proceso o PostgreSQL según el módulo; no se ha realizado una prueba de carga distribuida. Los indicadores agrícolas siguen siendo referenciales, sin validación agronómica local ni garantías de resultados.

Referencias oficiales: [monorepos Railway](https://docs.railway.com/deployments/monorepo), [IaC Railway](https://docs.railway.com/infrastructure-as-code), [referencia IaC](https://docs.railway.com/infrastructure-as-code/reference), [planes Railway](https://docs.railway.com/pricing/plans), [red privada Railway](https://docs.railway.com/networking/private-networking), [Railpack Node](https://railpack.com/languages/node/), [Git Vercel](https://vercel.com/docs/project-configuration/git-configuration), [rewrites Vercel](https://vercel.com/docs/routing/rewrites), [exclusiones Vercel](https://vercel.com/docs/deployments/vercel-ignore).
