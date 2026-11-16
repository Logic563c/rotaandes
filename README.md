# RotaAndes

Plataforma de apoyo a la siembra y rotación de cultivos para Latacunga y Cotopaxi. Combina clima regional NASA POWER, pronóstico Open-Meteo y reglas agronómicas referenciales. NASA POWER aporta información climática; las recomendaciones las calcula RotaAndes y requieren contraste con un técnico y las condiciones del terreno.

## Versión vigente, verificada el 15 de noviembre de 2026

- Aplicación: [rotaandes.vercel.app](https://rotaandes.vercel.app/). Backend: [salud HTTPS](https://backend-production-954a9.up.railway.app/api/health).
- Repositorio **público**: [Logic563c/rotaandes](https://github.com/Logic563c/rotaandes), rama predeterminada `release/publicacion`.
- Último código funcional publicado en GitHub y backend Railway: `4a2055e71d159fbcf18f7eb98416bf9b359dacdd`, motor `calendario_ciclo_v4`.
- Frontend Vercel: `bf3ff2bd5f89ceca6c5df8bf92c86ccc40584464`. La actualización v4 cambia el motor del backend; el frontend compatible conserva su despliegue anterior.
- PostgreSQL de producción: **29 cultivos, ocho plantillas y tres migraciones aplicadas**. Calendario completo: **29 × 12 = 348 casillas**.

El [estado actual y sus evidencias](docs/ESTADO_ACTUAL.md) distingue la versión de cada servicio, las pruebas ejecutadas y las limitaciones de esta auditoría. Los informes de fases anteriores conservan sus cifras y fechas históricas. Los cambios de documentación no requieren desplegar la aplicación.

## Documentación

| Documento | Contenido |
| --- | --- |
| [Estado actual](docs/ESTADO_ACTUAL.md) | Producción, versiones, catálogo completo, verificaciones e índice histórico |
| [Manual de usuario](docs/GUIA_CLIENTE.md) | Uso por agricultores y técnicos; cuatro estados y riego |
| [Manual técnico](docs/MANUAL_TECNICO.md) | Arquitectura, motores, API, configuración y mantenimiento |
| [Guía de defensa](docs/GUIA_DEFENSA_JURADO.md) y [recorrido](docs/RECORRIDO_DEMOSTRACION.md) | Presentación y límites científicos |
| [Respaldo privado](docs/PROCEDIMIENTO_RESPALDO_PRODUCCION.md) | Respaldo de producción y restauración de prueba local |
| [PROYECTO.md](PROYECTO.md) | Alcance, modelo, contrato y reglas vigentes (§7.2) |
| [AGENTS.md](AGENTS.md) y [decisiones](docs/DECISIONES.md) | Convenciones y registro cronológico de decisiones |

## Funciones disponibles

Registro, acceso y perfil; terrenos e historial de siembras; mapa y altitud estimada; delimitación opcional con superficie aproximada; climatología y tendencias 2005–2024; pronóstico de siete días y alertas preventivas; calendario, resumen mensual, búsqueda y filtros; comparación de tres estrategias de rotación; simulación de lluvia y temperatura; imágenes regionales MODIS/SMAP en NASA GIBS; panel técnico de solo lectura; PDF; glosario y fuentes públicas.

La portada fotográfica es estática. Las gráficas incluyen fuente, periodo, unidades, orientación «Para leerla», valores al señalar y ayuda detallada. El glosario y las fuentes no requieren sesión. El GeoJSON satelital analítico, las medias mensuales de imágenes y las mediciones satelitales por parcela siguen pendientes.

### Calendario v4

Evalúa los doce meses de inicio, de enero a diciembre, para los 29 cultivos, considerando **todo el ciclo**, incluso al cruzar el año. Cada casilla ofrece `resumen`, `motivo`, fuentes y acciones sugeridas. El resumen mensual cuenta los mismos resultados que la matriz; los filtros de la matriz no cambian ese total.

| Estado visible | Clave JSON | Significado |
| --- | --- | --- |
| Recomendado, verde | `recomendado` | Los criterios evaluados favorecen la siembra; confirmar variedad y manejo local |
| Posible con precaución, amarillo | `posible_con_cuidado` | Hay un riesgo manejable, por ejemplo dependencia del riego |
| No recomendado, rojo | `no_recomendado` | Algún criterio identifica una incompatibilidad según la regla y sus fuentes |
| No determinado, gris | `no_determinado` | Falta información esencial o hay un conflicto de fuentes, sin exclusión independiente |

Precedencia: exclusión → no recomendado; después, información faltante → no determinado; después, riesgo manejable → precaución; finalmente, recomendado. La época y la altitud referenciales se informan, sin imponer por sí solas un color.

**Riego:** marcar que un terreno tiene riego no demuestra agua suficiente. Si la lluvia no alcanza el mínimo FAO del ciclo o el mínimo mensual del catálogo en algún mes, el criterio de agua indica precaución «depende del riego». Sin un parámetro con fuente o sin lluvia válida se conserva el criterio ordinario del riego declarado y se explica la limitación. No se calculan caudales, volúmenes ni turnos. El berro requiere confirmar agua permanente y limpia o suelo saturado, condición que el booleano de riego no recoge. Otros criterios pueden dar prioridad al rojo o al gris.

## Instalación local (Windows)

Requisitos: Node.js **24.20.0** (rama 24), npm **11**, PostgreSQL **18.x**, PowerShell y Git. El asistente espera PostgreSQL local en `127.0.0.1:5432`; prepara el rol `rotaandes_app`, `rotaandes_dev` y una base aislada de pruebas. Puede solicitar la contraseña administrativa mediante entrada oculta; no se guarda en el repositorio.

En un clon nuevo, desde la carpeta donde quieras guardar el proyecto:

```powershell
git clone https://github.com/Logic563c/rotaandes.git
Set-Location rotaandes
npm.cmd ci
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/configurarBaseLocal.ps1
npm.cmd run auth:preparar --workspace backend
npm.cmd run db:migrate --workspace backend
npm.cmd run db:seed --workspace backend
npm.cmd run db:seed:rotaciones --workspace backend
npm.cmd run dev
```

El asistente está en [scripts/configurarBaseLocal.ps1](scripts/configurarBaseLocal.ps1). La semilla carga 29 cultivos y ocho plantillas mediante los dos comandos indicados; **no crea cuentas ni terrenos demo**. Registrar una cuenta propia en `/registro`. Para una cuenta técnica local nueva: `npm.cmd run tecnico:crear`; rechaza producción y correos existentes.

Si el entorno ya está preparado, ejecutar `npm.cmd ci` cuando cambie el lockfile y `npm.cmd run dev`. No sobrescribir `.env` existentes con ejemplos ficticios. No ejecutar la preparación de bases ni semillas sobre producción. La auditoría documental no volvió a instalar ni migrar bases; estos pasos se contrastaron con los scripts existentes.

- Frontend: **http://localhost:5173**; backend: **http://localhost:3000/api/health**.
- Detener: `Ctrl+C`. Vite usa `strictPort`; no cambia de puerto si 5173 está ocupado.
- Arranque separado desde la raíz: `npm.cmd run dev --workspace backend` y, en otra terminal, `npm.cmd run dev --workspace frontend`.
- En otros sistemas usar `npm`; el asistente de preparación local es PowerShell para Windows.

### Variables

| Archivo privado | Variable | Uso |
| --- | --- | --- |
| `backend/.env` | `DATABASE_URL` | Conexión local de desarrollo preparada por el asistente |
| `backend/.env` | `TEST_DATABASE_URL` | Base local aislada; nunca producción |
| `backend/.env` | `JWT_SECRET` | Generado por `auth:preparar`; reutiliza un valor válido existente |
| `backend/.env` | `PORT`, `CORS_ORIGIN` | `3000`, `http://localhost:5173` |
| `backend/.env` | `UMBRAL_HELADA_C` | Opcional; alerta preventiva del pronóstico, por defecto 2 °C |
| `frontend/.env` (opcional, no versionado) | `VITE_API_URL` | Origen del backend, por defecto `http://localhost:3000`, **sin `/api`** |

Ejemplos: [backend/.env.example](backend/.env.example), [frontend/.env.example](frontend/.env.example) y [backend/.env.production.example](backend/.env.production.example). Las variables `VITE_*` son públicas; no colocar secretos. Reiniciar Vite al cambiar su entorno; las variables de producción del frontend se incorporan al compilar.

### Verificaciones

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
```

Las pruebas unitarias no ejecutan la batería PostgreSQL. Para desarrollo, con la **base local de pruebas** preparada:

```powershell
npm.cmd run check
```

`check` incluye lint, tipos, unitarias, `test:db`, compilación y todas las configuraciones E2E. **Escribe y limpia datos en la base local aislada**, y `test:db` aplica allí migraciones pendientes. No es una comprobación de solo lectura ni debe apuntar a producción. Playwright utiliza Microsoft Edge (`channel: 'msedge'`), que debe estar instalado.

Los scripts por módulo están en [package.json](package.json) y [backend/package.json](backend/package.json). Por ejemplo, `npm.cmd run calendario:verificar --workspace backend` lee el catálogo local en una transacción de solo lectura y consulta NASA realmente; necesita Internet, no inventa una parcela ni mide su riego. Las pruebas con fixtures no acreditan una consulta nueva al proveedor.

Tras compilar, `npm.cmd run start --workspace backend` y `npm.cmd run preview --workspace frontend` permiten ejecutar los artefactos locales en dos terminales. Detener antes los servidores de desarrollo para liberar sus puertos.

## Arquitectura y configuración de producción

React + Vite + TypeScript + TailwindCSS en Vercel; Node.js + Express + TypeScript + Prisma + PostgreSQL en Railway. TanStack Query y [frontend/src/lib/api.ts](frontend/src/lib/api.ts) centralizan las llamadas a la API. Los proveedores climáticos y GIBS se consultan desde el backend; OpenStreetMap sirve las teselas del mapa base al navegador.

Ambos servicios se construyen desde **la raíz del monorepo**, con workspaces y un solo lockfile:

| Servicio | Instalación y compilación | Arranque o salida |
| --- | --- | --- |
| Railway | `npm ci --include=dev`; `npm run build --workspace backend` | `npm run start --workspace backend`; salud `/api/health` |
| Railway, predeploy funcional | `npm run produccion:preparar --workspace backend` | Aplica migraciones y verifica/carga catálogo y plantillas; no es una consulta de estado |
| Vercel | `npm ci --include=dev`; `npm run build:publicacion --workspace frontend` | `frontend/dist`, rutas SPA |

Configuración versionada: [.railway/railway.ts](.railway/railway.ts) y [vercel.json](vercel.json). Railway no tiene un repositorio de origen conectado; Vercel no tiene Git conectado y declara `deploymentEnabled: false`. El envío documental a GitHub no requiere volver a desplegar. No ejecutar el predeploy, migraciones, semillas ni comandos de despliegue para esta revisión.

## Límites y seguridad

El clima NASA es regional (~0,5° × 0,625° en meteorología), no una medición del lote ni un pronóstico. El ajuste por altitud es una estimación. Open-Meteo aporta el pronóstico, con alertas preventivas que no garantizan ni descartan heladas. Las imágenes GIBS son visuales, sin extracción de valores por parcela. Las rotaciones usan índices heurísticos, sin rendimientos ni dinero garantizados; con información insuficiente no se inventan alternativas ni puntajes.

El PDF utiliza el escenario base (0 % / 0 °C), conserva fuentes y límites y agrupa los motivos del calendario completo. Su extensión varía con los datos; el límite es 80 páginas y 4 MiB. La delimitación es aproximada, no catastral, y no cambia el punto usado para calcular el clima.

Agricultores: solo recursos propios. Técnicos: lectura de todos los terrenos, sin edición. JWT de 15 minutos en `sessionStorage`; cerrar sesión borra token y caché del navegador, sin revocación inmediata en el servidor. No hay recuperación de contraseña ni verificación de correo. Las pruebas no sustituyen una evaluación agronómica local, una auditoría completa de seguridad o certificación WCAG.

No versionar `.env`, contraseñas, claves, tokens, respaldos privados ni resultados locales. El [procedimiento de respaldo](docs/PROCEDIMIENTO_RESPALDO_PRODUCCION.md) conserva las copias fuera del repositorio. Los ZIP históricos no se actualizan automáticamente al publicar documentación; revisar su commit y su catálogo antes de reutilizarlos.
