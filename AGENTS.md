# Convenciones de desarrollo de RotaAndes

## Alcance y fuente de verdad

- Estas instrucciones se aplican a todo el repositorio. Leer completo `PROYECTO.md` antes de trabajar.
- Respetar el alcance, el stack y la estructura de la sección 4: React + Vite + TypeScript + TailwindCSS; Node.js + Express + TypeScript + Prisma + PostgreSQL.
- Conservar el modelo de datos de la sección 5 y el contrato de API de la sección 8. Las convenciones de nombres no autorizan a renombrar tablas, columnas, rutas, campos, valores de dominio ni identificadores existentes.
- Si falta una definición técnica menor dentro del alcance solicitado, elegir la opción más simple y documentarla en `docs/DECISIONES.md` cuando la tarea permita modificar ese archivo. Esta regla no permite diseñar módulos pendientes de revisión. No resolver dudas cambiando silenciosamente el modelo o el contrato. Un cambio de contrato requiere actualizar también `PROYECTO.md` en el mismo commit, según sus reglas.
- Limitar los cambios a la tarea solicitada. No instalar dependencias ni ampliar el stack sin necesidad y autorización dentro del alcance de la tarea.

## Límites de las tareas de preparación

- `PROYECTO.md` describe el producto completo. Sus funcionalidades, fases, fechas y criterios de aceptación no autorizan a implementarlo entero en una tarea de preparación.
- Cuando el usuario solicite solamente la base de la aplicación, limitarse a la estructura, configuración, arranque mínimo y comprobaciones que haya incluido en esa solicitud. La palabra «base» no incluye automáticamente autenticación, CRUD ni lógica de negocio.
- Dejar pendientes los módulos que todavía no tengan diseño y alcance revisados: autenticación y perfil, terrenos y siembras, mapas, clima y pronóstico, calendario, rotaciones, escenarios, capas satelitales, panel técnico y reportes PDF. Tampoco crear sus pantallas, rutas, servicios, hooks ni mocks por anticipado.
- Implementar un módulo cuando el usuario solicite esa etapa y su diseño y alcance estén definidos o validados en la conversación. Aprovechar la autorización ya existente; no pedir confirmación repetida para pasos necesarios de una etapa autorizada.
- Preparar Prisma, crear el esquema, generar o ejecutar migraciones, cargar semillas, conectar proveedores externos y configurar o realizar despliegues únicamente si están incluidos en la tarea solicitada. Respetar siempre el modelo y el contrato existentes.
- No inventar flujos, campos, endpoints, fórmulas, reglas agronómicas ni respuestas simuladas para completar módulos pendientes. Si una definición pendiente impide terminar la base solicitada, completar lo independiente y señalar la decisión concreta que falta antes de implementar lo que dependa de ella.
- En tareas exclusivamente documentales, modificar solo los archivos autorizados. No crear la estructura de la aplicación, instalar dependencias ni ejecutar integraciones como consecuencia de escribir estas convenciones.
- Al terminar la base solicitada, entregar el resultado y sus verificaciones para revisión. Identificar lo que queda pendiente y finalizar la tarea sin iniciar automáticamente la siguiente fase o módulo.

## Reglas generales de nombres

- Usar nombres descriptivos en español, en singular para una entidad (`terreno`) y en plural para colecciones (`terrenos`). Evitar abreviaturas ambiguas y nombres como `data`, `obj` o `tmp` para conceptos de dominio.
- Escribir identificadores propios sin tildes, eñes ni espacios: `anio`, `descripcion`, `rotacion`. Mantener la ortografía correcta en textos visibles, documentación y comentarios en español.
- Nombrar funciones con verbos: `obtenerTerreno`, `validarSiembra`, `calcularRiesgoHelada`. Nombrar booleanos con expresiones claras: `tieneRiego`, `esActual`, `puedeEditar`.
- Expresar unidades en los nombres cuando corresponda: `areaHa`, `altitudM`, `lluviaMm`. Mantener las unidades y los nombres originales del contrato al serializar.
- Conservar nombres técnicos y de terceros: `email`, `password`, `password_hash`, `JWT_SECRET`, `VITE_API_URL`, propiedades de React, parámetros de proveedores y claves GeoJSON. No traducir APIs de librerías ni la estructura de carpetas definida en `PROYECTO.md`.

## JavaScript y TypeScript

- Variables, parámetros, funciones, métodos y propiedades internas: `camelCase`, como `cultivoSeleccionado` y `listarTerrenos`.
- Tipos, interfaces, clases y alias: `PascalCase`, como `Terreno`, `RespuestaRotaciones` y `ServicioClima`. No añadir prefijos `I` o `T` por rutina.
- Constantes de configuración o dominio: `MAYUSCULAS_CON_GUIONES_BAJOS`, como `UMBRAL_HELADA_C`. Una variable local declarada con `const` conserva `camelCase`.
- Archivos de módulos y servicios: `camelCase.ts` o `camelCase.js`, como `motorRotacion.ts`. Conservar los nombres establecidos, como `index.ts` y `api.ts`. Las carpetas nuevas de dominio usan minúsculas y guiones si contienen varias palabras.
- Usar TypeScript para el código nuevo de frontend y backend. Estas reglas de JavaScript aplican también a archivos de configuración o código existente; no introducir una implementación paralela en JavaScript.
- Mantener `strict: true` en TypeScript. Evitar `any`, `@ts-ignore`, aserciones sin comprobación y operadores de no nulidad para ocultar errores. Recibir datos no confiables como `unknown` y estrechar sus tipos mediante validación.
- Tipar entradas, salidas y límites entre módulos; permitir inferencia en variables locales claras. Representar explícitamente valores opcionales y nulos, y usar uniones de literales para estados definidos por el proyecto.
- Los tipos del contrato y los mocks conservan sus claves exactas: `cultivo_id`, `es_actual`, `por_que`, `vacios_informacion`, `cambios_vs_base`. Si se usan modelos internos en `camelCase`, convertirlos explícitamente en los límites de la API, sin alterar el JSON público.

## React

- Componentes, páginas y sus archivos: `PascalCase`, como `DetalleTerreno.tsx` y `CalendarioSiembra.tsx`. Tipos de propiedades: `DetalleTerrenoProps`.
- Hooks propios: prefijo obligatorio `use` seguido de un nombre descriptivo en español, como `useTerrenos` o `usePronostico`. Archivos con el mismo nombre del hook.
- Propiedades y estado internos: `camelCase`, como `terrenoSeleccionado` y `estaCargando`. Acciones recibidas por propiedades: `alGuardar`; manejadores locales: `manejarGuardado`. Conservar eventos nativos como `onClick` y `onSubmit`.
- Centralizar el acceso al backend en `frontend/src/lib/api.ts` y usar TanStack Query según la arquitectura. El frontend consume únicamente la API del backend; no accede directamente a PostgreSQL ni a servicios externos.
- Mostrar estados de carga, vacío y error. Mantener textos sencillos en español, accesibilidad y diseño para celular. Identificar la fuente, las limitaciones y el aviso de herramienta de apoyo en las vistas correspondientes.

## CSS y TailwindCSS

- Usar TailwindCSS conforme al stack. Conservar los nombres oficiales de sus utilidades.
- Para CSS propio, usar clases en español con `kebab-case`; en componentes con varias partes, usar BEM: `.tarjeta-terreno`, `.tarjeta-terreno__titulo`, `.tarjeta-terreno--seleccionada`.
- Variables CSS propias: prefijo `--` y `kebab-case`, como `--color-tierra` y `--espacio-seccion`. Animaciones: nombres descriptivos como `aparecer-alerta`.
- Conservar propiedades y palabras clave estándar de CSS. Evitar selectores por identificador, estilos globales que afecten componentes ajenos y `!important` salvo justificación concreta.

## PostgreSQL y Prisma

- Tablas y columnas: minúsculas con `snake_case`. Las tablas mantienen exactamente estos nombres: `usuarios`, `terrenos`, `cultivos`, `siembras`, `plantillas_rotacion` y `clima_cache`.
- Conservar todas las columnas de la sección 5, incluidos `usuario_id`, `terreno_id`, `cultivo_id`, `password_hash` y `creado_en`, con sus tipos, nulabilidad, valores predeterminados, restricciones y relaciones.
- Mantener `id` como clave primaria y las claves foráneas existentes con sufijo `_id`. No convertir identificadores de texto del catálogo o de plantillas en UUID.
- Si Prisma usa modelos en `PascalCase` singular y campos en `camelCase`, mapearlos con `@@map` y `@map` para preservar los nombres físicos. No generar migraciones que renombren el esquema por razones de estilo.
- Para índices o restricciones nuevos autorizados, usar nombres descriptivos en `snake_case`, como `indice_siembras_terreno_id`. Escribir SQL con palabras clave en mayúsculas y parámetros para los valores; nunca concatenar entradas del usuario.
- Conservar los identificadores semilla, como `vicia_avena` y `papa-haba-cebada`, y los valores de dominio, como `agricultor`, `tecnico` y `no_se`.

## Python

- Python no forma parte del servidor ni del frontend definidos. Aplicar estas reglas si una tarea requiere scripts auxiliares de preparación de datos; no introducir otro backend ni dependencias por esta convención.
- Módulos, archivos, funciones, variables y parámetros: `snake_case`, como `preparar_capas.py`, `calcular_promedio_mensual` y `humedad_suelo`.
- Clases: `PascalCase`, como `ProcesadorCapas`. Constantes: `MAYUSCULAS_CON_GUIONES_BAJOS`, como `MESES_POR_ANIO`.
- Usar anotaciones de tipos en funciones propias, validar archivos y datos externos y capturar excepciones específicas. Conservar nombres estándar como `self` y `__init__`.
- Leer y escribir texto en UTF-8; producir datos con las claves, unidades y formatos que espera el backend. No renombrar campos de GeoJSON ni inventar datos agronómicos.

## Validación, seguridad y errores

- Validar en el backend los parámetros de ruta, consultas, cuerpos, archivos y respuestas de proveedores antes de usarlos. La validación del frontend ayuda al usuario y no sustituye la del servidor; los tipos TypeScript no validan datos en ejecución.
- Comprobar tipos, campos obligatorios, longitudes razonables, formatos, rangos y relaciones según el modelo y el contrato. No aceptar conversiones que transformen valores vacíos o inválidos en datos aparentemente válidos.
- Validar UUID donde corresponda, identificadores del catálogo, coordenadas, meses de 1 a 12, prioridades de 1 a 5, `lluvia_pct` de -30 a 30 y `temp_delta` de -2 a 2. Validar fechas reales y coherencia entre siembra y cosecha; conservar el formato de fecha sin desplazarlo por conversiones de zona horaria.
- Permitir explícitamente los campos editables. Obtener identidad y permisos del JWT validado; no confiar en `usuario_id`, `rol`, `altitud_m` ni otros campos controlados por el servidor enviados por el cliente. Nunca devolver `password_hash`.
- Filtrar siempre los recursos del agricultor por el `usuario_id` del token, incluidas siembras y reportes. El rol `tecnico` puede leer todos los terrenos, pero no editarlos. Proteger `/api/auth/yo` como consulta del usuario autenticado.
- Centralizar errores del backend en middleware de Express. Responder con `{ "error": "mensaje" }` y el código HTTP correspondiente: 400 para entradas inválidas, 401 para autenticación inválida o ausente, 403 para permisos insuficientes, 404 para recursos no encontrados y 500 para fallos inesperados.
- Escribir mensajes útiles en español sin exponer consultas SQL, trazas, contraseñas, tokens ni secretos. Registrar el contexto técnico necesario en el servidor sin datos sensibles. No silenciar excepciones ni devolver éxito cuando una operación falla.
- Gestionar errores asíncronos y fallos de red. Ante una caída de NASA POWER, usar el respaldo previsto en `PROYECTO.md` e identificar su fuente; no sustituir datos ausentes por valores inventados.
- Guardar secretos en variables de entorno; nunca subir archivos `.env`. Mantener unidades, resolución regional, datos referenciales y explicaciones de las recomendaciones conforme a `PROYECTO.md`.

## Verificación y entrega

- Verificar cada endpoint externo con `curl` antes de integrarlo, como exige `PROYECTO.md`; para una tarea solo documental no hacen falta llamadas externas.
- Revisar la compatibilidad de tipos, mocks, JSON público y mapeos de Prisma. Para cambios de implementación, comprobar validación, permisos y manejo de fallos con pruebas acordes al riesgo.
- Antes de cada commit, `npm run build` debe pasar en los paquetes aplicables según `PROYECTO.md`. Si aún no existe infraestructura para ejecutarlo, informar esa limitación; no afirmar que pasó ni crearla para una tarea solo documental.
- Mantener `main` desplegable, ramas `feat/<nombre-descriptivo>` y PRs pequeños. Escribir commits en español y en imperativo.
- Informar los archivos modificados, las verificaciones realizadas y las limitaciones pendientes. Respetar siempre el alcance de archivos autorizado por el usuario.
