# Publicación de RotaAndes

## Actualización de escenarios y capas — 8 de noviembre de 2026

La versión pública actual es **`012d6be4ebd2df22dfb3062b8645dfe1c95ec017`**, rama `release/publicacion`, enviada y desplegada tras autorización expresa. URLs: [frontend](https://rotaandes.vercel.app) y [backend/salud](https://backend-production-954a9.up.railway.app/api/health). Railway ejecuta `022133e1-d1e1-4d86-9c40-595f8e300cd8`; Vercel publica `dpl_4PLbbQ3ZQoNbYJrixBBSbYq4ws5q`.

Se aprobaron 561 pruebas locales antes del envío y un recorrido adicional real completo de escritorio/celular con 27 capturas, sin mocks científicos. Escenarios y visor MODIS/SMAP pueden usarse en Internet; GeoJSON analítico y agregaciones mensuales siguen pendientes. PostgreSQL conserva la migración original, diez cultivos, ocho plantillas y todos los datos previos, con las cuentas temporales eliminadas. No se crearon servicios, modificaron credenciales o contrataron planes. El [informe de actualización](INFORME_ACTUALIZACION_ESCENARIOS_CAPAS.md) detalla resultados, incidencias de verificación, accesos retirados y reversión.

## Publicación inicial — registro histórico

Comprobaciones realizadas el 8 de noviembre de 2026. **Aplicación publicada y recorrido real aprobado.**

- Frontend: [https://rotaandes.vercel.app](https://rotaandes.vercel.app).
- Backend: [https://backend-production-954a9.up.railway.app](https://backend-production-954a9.up.railway.app); [salud HTTPS](https://backend-production-954a9.up.railway.app/api/health).
- Código privado: [Logic563c/rotaandes](https://github.com/Logic563c/rotaandes), rama release/publicacion.
- Revisión de aplicación desplegada en ambos proveedores: **ec413cacf8c9e99ad60dbafe7365244e8f2dfd94**.

El frontend permite registro, login, perfil, terrenos, siembras, mapa, climatología, pronóstico, calendario y comparación de rotaciones. Se comprobó con cuentas temporales y datos persistidos en PostgreSQL de producción, sin interceptar HTTP ni precargar respuestas climáticas simuladas. Las cuentas y sus registros se eliminaron al finalizar. Los commits de cierre sincronizan infraestructura, guardas del bootstrap y documentación; no añaden funcionalidades ni cambian el código de negocio desplegado.

## Servicios y arquitectura real

| Componente | Recurso verificado | Configuración |
| --- | --- | --- |
| GitHub | Logic563c/rotaandes, privado | Rama predeterminada release/publicacion; Pages desactivado |
| Railway | Proyecto rotaandes, 948127e6-92fc-487f-a974-7315f6a3c1cd | Entorno production; único espacio personal autorizado |
| PostgreSQL | Servicio postgres, 4dee926d-e026-4a17-a4cc-b16074f1f6c7 | PostgreSQL 18.6, volumen persistente de 500 MB, sin TCP público |
| Backend | Servicio backend, def38930-c4b9-4d4f-afb3-13c6e6e9a430 | Node 24.20.0, Prisma 7.10.1, una réplica en sfo, 512 MiB/1 CPU |
| Vercel | Proyecto rotaandes, prj_nfVORQuty8Uj0Psw0B9YUQJj26Hv, contexto logic563 | Plan Hobby; Node de compilación configurado a 24.x; frontend estático |

El navegador recibe React/Vite desde Vercel y llama por HTTPS al backend Railway con Bearer. Express consulta PostgreSQL mediante red privada y el rol rotaandes_app. NASA POWER y Open-Meteo se consultan desde backend; OpenStreetMap proporciona las teselas visuales con atribución. No se copiaron bases ni credenciales locales.

El backend se verificó en el despliegue b791e7dd-15db-4e17-ba46-92bb12b68b55. Vercel publicó dpl_B6CtJ2XpbRpoVb5pY5MkEuSWrahW: primero se compiló sin asignar el dominio principal y después se promovió al comprobar la salud del backend. La URL técnica es rotaandes-aego8elxe-logic563.vercel.app; la dirección para compartir es rotaandes.vercel.app.

## Autorizaciones y protección de Git

El usuario eligió Logic563c y después aprobó expresamente crear el repositorio privado y enviar b81cda8 junto con la etiqueta original. Posteriormente autorizó enviar ec413ca y crear/publicar Railway y Vercel, inicializar la base, migrar y probar dentro del crédito Trial, sin contratar planes ni aceptar cargos adicionales. Las operaciones se limitaron a esos espacios y recursos.

- Base anterior: 54645c960915f273a9e8cb4f7e0432e768c6928e, conservada en feat/rotaciones.
- main permanece en ee4f8c8542744ddecf64a5f2ab58d6993e6e3431; no se publicó esa rama ni se hizo merge.
- Etiqueta anotada v0.1.0-primera-entrega: objeto 9d5f716dcf9c4cd357066404879bf5e767409dd3, commit 92a7d2f53ede7fe524cd45e5bd7f8d4e454dd3e9, conservada localmente y en GitHub.
- PROYECTO.md, AGENTS.md, esquema y migración original permanecen intactos en Git.
- Sin force push, cuentas demo permanentes ni módulos de las fases posteriores.

Antes de los envíos se revisaron contenido e historial: once commits y 298 blobs hasta ec413ca, sin coincidencias de secretos reales. Los dos primeros commits incorporaron 29 y 12 archivos respectivamente. La entrega final comunica por separado el hash de cierre y el estado del último envío aprobado.

## Instalación, compilación y arranque

Ambos proveedores utilizan **la raíz del monorepo**, el lockfile único y los workspaces. Seleccionar solamente backend o frontend como raíz de instalación perdería ese contexto.

| Fase | Comando o ajuste efectivo |
| --- | --- |
| Instalación Railpack | npm ci --include=dev, ejecutado una sola vez en su fase de instalación |
| Compilación backend | npm run build --workspace backend, incluyendo Prisma Generate y TypeScript |
| Predeploy | npm run produccion:preparar --workspace backend |
| Arranque | npm run start --workspace backend; 0.0.0.0 y puerto del servicio |
| Healthcheck | /api/health, 60 segundos |
| Fallos de proceso | ON_FAILURE, máximo tres reintentos |
| Instalación Vercel | npm ci --include=dev |
| Compilación frontend | npm run build:publicacion --workspace frontend |
| Salida frontend | frontend/dist; rutas SPA mediante vercel.json |

Se fijan Node 24.20.0 y npm 11.19.0 para Railpack y se conservan las herramientas de desarrollo necesarias para Prisma CLI/tsx en el predeploy. El modo publicacion rechaza localhost y exige el origen HTTPS de Railway. El build local habitual sigue destinado a desarrollo y Playwright, y no se utiliza como artefacto público.

Railway ya no permite railway.json en servicios nuevos. Se sustituyó antes del aprovisionamiento por .railway/railway.ts, utilizando el SDK oficial railway 3.16.0 únicamente como herramienta de desarrollo. La declaración rechaza otros proyectos/entornos; describe PostgreSQL privado y backend sin source GitHub. El archivo IaC es la única excepción versionable dentro de .railway; sus metadatos privados siguen ignorados.

No hay autodeploy Git: Vercel tiene deploymentEnabled=false y no se conectó un source GitHub en ninguno de los servicios web. Cada carga utiliza una revisión limpia y aprobada de release/publicacion. Se exportó ec413ca desde Git y se comprobó el manifiesto Vercel, evitando resultados y archivos locales ajenos al commit; el backend también se cargó desde esa exportación limpia.

## Variables, sin valores secretos

| Variable | Destino y finalidad |
| --- | --- |
| NODE_ENV=production | Backend, sin cargar .env local |
| PORT | Servicio Railway; dominio backend dirigido al puerto 8080 |
| TRUST_PROXY_HOPS=1 | Un salto de proxy, sin confiar indiscriminadamente |
| CORS_ORIGIN | Exactamente https://rotaandes.vercel.app |
| DATABASE_URL | Referencia privada a ROTAANDES_DATABASE_URL del servicio PostgreSQL |
| DATABASE_HOST / DATABASE_NAME / DATABASE_USER | Pines del destino: host privado, rotaandes_prod y rotaandes_app |
| JWT_SECRET | Referencia a ROTAANDES_JWT_SECRET compartido y sellado |
| ROTAANDES_APP_PASSWORD | Secreto compartido sellado; solo PostgreSQL lo utiliza para el rol y su URL |
| ROTAANDES_CORS_ORIGIN | Origen público compartido del frontend |
| UMBRAL_HELADA_C | 2 °C, configuración existente |
| RAILPACK_NODE_VERSION | 24.20.0 |
| RAILPACK_NODE_NPM_INSTALL | npm ci --include=dev |
| RAILPACK_NO_SPA / RAILPACK_PRUNE_DEPS | true / false, backend sin SPA automático y herramientas de predeploy conservadas |
| VITE_API_URL | Única configuración pública del frontend: origen HTTPS real del backend |

Las claves nuevas se generaron con node:crypto, se enviaron mediante entrada de proceso y se guardaron selladas en Railway; no se pasaron como argumentos ni se versionaron. No se utilizó el generador determinista del contexto SDK para secretos. El backend no recibe las credenciales administrativas del proveedor. Las plantillas .env.production.example contienen campos vacíos y configuración pública.

## PostgreSQL y migraciones

Se creó exclusivamente rotaandes_prod, propietario rotaandes_app, en el PostgreSQL nuevo autorizado. El rol tiene LOGIN y no tiene SUPERUSER, CREATEDB, CREATEROLE, REPLICATION ni BYPASSRLS. Es propietario de su propia base y sus tablas; no es administrador de la instancia. El bootstrap SQL reutiliza recursos compatibles, no cambia contraseñas/propietarios existentes y se comprobó su idempotencia.

El predeploy ejecutó **prisma migrate deploy**, verificó el esquema y cargó las semillas originales en transacción. No se ejecutaron migrate dev, reset, db push ni operaciones destructivas. Prisma 7.10.1 informó que el esquema está actualizado desde el contenedor de producción.

| Verificación final | Resultado |
| --- | --- |
| Tablas originales | usuarios, terrenos, cultivos, siembras, plantillas_rotacion y clima_cache |
| Migración | 20261107000100_esquema_inicial, terminada y sin pendientes |
| Integridad | Cuatro CHECK de usuarios y tres claves foráneas; tabla _prisma_migrations adicional de Prisma |
| Semillas permanentes | Diez cultivos y ocho plantillas originales; ningún usuario demo |
| Registros temporales | Cuentas, terrenos y siembras de los recorridos eliminados por UUID y correo exactos |
| Caché | Dos entradas genuinas de NASA/pronóstico, generadas por consultas reales; no fixtures agrícolas |
| Aislamiento | Producción usa la red privada; desarrollo y pruebas continúan en sus bases locales originales |

El checksum coincide exactamente con el archivo del artefacto desplegado. La exportación Git desde Windows conserva CRLF: se comprobó además igualdad con el SQL canónico de Git al normalizar únicamente los finales de línea. No se modificó el contenido de la migración ni su registro en PostgreSQL.

## Recorrido real y evidencias

El recorrido completo terminó con código 0 en Edge, escritorio 1440×1000 y celular 390×844. No se interceptaron solicitudes ni se insertaron mocks en producción.

1. Portada HTTPS y registro de una cuenta temporal con clave aleatoria; cierre y login válidos.
2. Perfil y prioridades guardadas: agua 5, suelo 2, ingresos 4.
3. Selección en mapa y alternativa manual, punto de Latacunga -0.93/-78.62, altitud estimada real 2775 m.
4. Terreno y dos siembras de prueba de papa/haba persistidos; fechas DATE sin desplazamiento.
5. NASA POWER real y después caché válida: doce meses, periodo recibido 2001–2025; temperatura C y precipitación original mm/day, convertida por el módulo existente.
6. Open-Meteo real: siete días, °C/mm, cero alertas en la respuesta observada. No se fabricaron heladas para la demostración.
7. Calendario: 120 celdas; selección por teclado y explicación visible.
8. Comparador: tres posiciones; patrón actual, una sugerencia evaluable y segunda sugerencia no determinada con advertencias. No se inventó otra alternativa para completar el ranking.
9. Segunda cuenta: GET de terreno, siembras, clima, pronóstico, calendario y rotaciones ajenos devuelven 404; PUT ajeno también se rechaza.
10. Cierre, nuevo login, recarga de detalle y persistencia; revisión móvil sin desbordamiento global.
11. Reinicio confirmado por API y cambio real del inicio del proceso Node; salud 200 y las dos siembras conservadas; nuevo login posterior.
12. Limpieza SQL limitada a las cuentas temporales; cero errores de consola y cero respuestas HTTP fallidas inesperadas en el recorrido aprobado.

La primera llamada de reinicio mediante el CLI agotó su espera y ese intento no se declaró aprobado. Se sustituyó el verificador por API más observación privada del proceso y se repitió con éxito. La primera respuesta NASA fue obtenida desde el proveedor; las repeticiones muestran caché real con su fecha original. El riesgo de helada sigue siendo preventivo y los índices de rotaciones son referenciales, sin moneda ni garantía agronómica.

Las evidencias de producción se guardan en **.tmp/evidencias-publicacion/**, ignorada por Git y separada de las carpetas que Playwright limpia. Incluyen escritorio-portada.png, escritorio-detalle.png, escritorio-clima.png, escritorio-pronostico.png, escritorio-calendario.png, escritorio-rotaciones.png, escritorio-persistencia-tras-reinicio.png y capturas equivalentes del celular, incluida su explicación. evidencia-real.json, interfaz-movil-real.json y cierre-produccion.json contienen resultados sin contraseñas ni tokens. Las capturas representan cuentas/registros temporales ya eliminados; sus datos climáticos proceden de consultas reales.

La comprobación móvil adicional espera explícitamente dos gráficas, siete días, trece encabezados de calendario y tres tarjetas antes de capturar. No se presenta una pantalla todavía cargando como evidencia del resultado final.

## Calidad y seguridad comprobadas

| Comprobación local final | Resultado real |
| --- | --- |
| npm.cmd run check | Código 0; lint, TypeScript, pruebas, PostgreSQL, build y Playwright |
| Backend | 262 pruebas, 17 archivos |
| Frontend | 85 pruebas, 9 archivos |
| PostgreSQL aislado | 124 pruebas, 9 archivos |
| Playwright local | 20 casos de escritorio/celular, incluidos recorridos integrales previos |
| Total local | **491 pruebas aprobadas** |
| Auditoría npm | Sin vulnerabilidades conocidas en las consultas realizadas; no se aplicó audit fix |
| Publicación | Recorrido adicional real aprobado, separado de las fixtures de las 491 pruebas |

También se verificaron HTTPS, redirección HTTP del frontend (308) y backend (301), CORS exacto/403 ajeno, rutas privadas sin token/401, HSTS y rutas SPA de registro/login/detalle con 200. En el contenedor no existen backend/.env local, la clave SSH temporal ni resultados locales. Las contraseñas hash no se devuelven al cliente. Se preservaron validación, JWT, permisos y cuotas originales.

Correcciones de esta fase:

- Perfil de producción: 0.0.0.0/PORT, CORS exacto, destino PostgreSQL privado fijado y errores sin conexiones sensibles.
- SELECT 1 antes de escuchar: se reprodujo que $connect podía inicializar un pool sin validar la conexión real.
- Rechazo de localhost y dominios escritos con comodín en la configuración pública.
- Formato IaC vigente y seguimiento del aprovisionamiento: el primer plan creó PostgreSQL; un segundo plan aplicó sus referencias privadas omitidas en la creación inicial.
- Build Railpack: se eliminó la segunda instalación npm ci, que fallaba con EBUSY sobre un montaje de caché de Vite. Instalación y compilación quedan separadas.
- Guardas SQL: psql ignoraba el argumento numérico de quit y devolvía éxito. Se sustituyó por excepciones con ON_ERROR_STOP y cuatro regresiones locales, siempre en conexión de solo lectura.
- Exportación limpia y manifiesto de carga, evitando depender exclusivamente de las exclusiones del CLI para las evidencias temporales.

## Actualización y reversión

Para actualizar: trabajar en rama, ejecutar check, revisar diff/historial/secretos, crear el commit y obtener aprobación de su envío. Desplegar solo la revisión aprobada de release/publicacion desde la raíz, preferentemente una exportación limpia. Revisar el plan IaC sin eliminaciones antes de aplicar; nunca usar confirm-destructive por rutina. En Windows, el SDK se invocó con la ruta del ejecutable oficial 5.71.0 en su entorno de evaluación para evitar que intentara ejecutar un shim inexistente; no se desactivó la comprobación de versión.

El backend instala con npm ci --include=dev, compila su workspace, ejecuta el predeploy reproducible y debe superar salud/Prisma antes de promover frontend. Vercel compila en modo publicacion con VITE_API_URL real; si cambia el dominio, reconstruir frontend y ajustar CORS exacto. Mantener variables privadas en Railway y no copiar archivos .env locales.

Para revertir código, seleccionar la última revisión/despliegue funcional en cada proveedor y comprobar compatibilidad de variables y esquema. No resetear la base ni borrar registros para acomodar código anterior. El despliegue ec413ca conserva la misma migración original; futuros cambios incompatibles requieren un plan específico de respaldo/recuperación y autorización. No se realizó una reversión de base.

La clave SSH temporal usada para el bootstrap y las verificaciones privadas fue retirada de Railway y su archivo privado local fue eliminado, comprobado el 8 de noviembre de 2026 a las 17:38 UTC. No queda como credencial permanente de la aplicación. Las futuras operaciones privadas deben utilizar una autenticación oficial propia, sin contraseñas en documentos. El cierre está registrado en acceso-y-recursos.json, dentro de la carpeta de evidencias ignorada.

## Recursos y limitaciones

Railway está en Trial, con crédito inicial de 5 USD y 30 días de prueba, sin contratar una suscripción pagada. Al cierre de las verificaciones (8 de noviembre de 2026, 17:38 UTC), la API informó aproximadamente 4,9969 USD de crédito y 0,0031 USD de consumo; estos importes cambian con el uso y no garantizan una duración concreta. El intento de fijar un tope opcional de 5 USD fue rechazado porque la plataforma admite como mínimo 10 USD o cero; **no se estableció un tope de 10 USD** ni se amplió el presupuesto autorizado. Vigilar crédito y consumo desde el panel. La prueba puede terminar al agotar el crédito y no garantiza alojamiento permanente; el proveedor establece retención limitada de volúmenes tras su vencimiento. Un plan pagado, más recursos, respaldos adicionales o dominios personalizados necesitan nueva autorización.

Vercel Hobby se utiliza para demostración no comercial. Mantener las condiciones/atribución de Open-Meteo, NASA y OpenStreetMap. No se hizo prueba de carga distribuida ni se contrató un SLA; una publicación técnica no equivale a validación agronómica. La climatología representa una zona, el pronóstico puede fallar, la altitud es estimada y el catálogo requiere validación local. La ausencia de una segunda alternativa compatible se muestra expresamente.

## Archivos principales de la fase

Infraestructura y exclusiones: .railway/railway.ts, vercel.json, .gitignore, .railwayignore y .vercelignore; railway.json inicial retirado. Backend: configuración/arranque/aplicación, conexión Prisma, configuración Prisma de producción, prepararProduccion.ts, configurarRolProduccion.sql, scripts y ejemplos sin secretos. Frontend: validación del modo publicacion, api.ts, Vite, scripts y ejemplo público. Pruebas: producción/arranque/IaC y guardas SQL; raíz: package.json/lockfile, ESLint y tsconfig.herramientas.json. Documentación: README.md, DECISIONES.md y este informe. Los scripts efímeros/evidencias no se versionan.

Referencias oficiales: [IaC Railway](https://docs.railway.com/infrastructure-as-code), [referencia IaC](https://docs.railway.com/infrastructure-as-code/reference), [Railpack Node](https://railpack.com/languages/node/), [red privada](https://docs.railway.com/networking/private-networking), [prueba Railway](https://docs.railway.com/pricing/free-trial), [Vercel SPA](https://vercel.com/docs/routing/rewrites), [Git Vercel](https://vercel.com/docs/project-configuration/git-configuration), [Hobby](https://vercel.com/docs/plans/hobby), [Open-Meteo](https://open-meteo.com/en/terms).
