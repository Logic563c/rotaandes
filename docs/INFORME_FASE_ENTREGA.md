# Informe de la fase de entrega

> **Registro histórico de esta fase.** Se conservan sus fechas, versiones, cifras y resultados; las menciones a publicación pendiente o a repositorio privado describen ese momento. Para la versión vigente, las instrucciones actuales y las evidencias verificadas el 15-11-2026, consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los comandos de publicación, migración o reversión de este registro no son instrucciones para la auditoría documental actual.

Fecha: 12 de noviembre de 2026 · Rama: `feat/graficas-delimitacion`, sobre el commit `d5451f0` (gráficas y delimitación), que se conserva íntegro.

**Producción:** no se ha publicado nada. No se hizo push, no se desplegó y no se aplicaron migraciones. El respaldo de producción lo realiza la persona responsable con el [procedimiento de respaldo](PROCEDIMIENTO_RESPALDO_PRODUCCION.md).

## 1. Fondo agrícola con movimiento (portada)

- **Video:** no hay un video agrícola con licencia verificada en el proyecto. Uno descargado habría pesado varios megabytes en la primera carga del celular. Por eso se usó una **animación CSS original**, como estaba previsto como alternativa.
- **Cómo es:**
  - nubes que cruzan el cielo lentamente (75–140 s por recorrido);
  - surcos con un vaivén suave;
  - en el paisaje SVG propio, el sol «respira», dos nubes flotan y las plantas se mecen.
- **Rendimiento:** solo se animan `transform` y `opacity`; no hay video, imágenes ni JavaScript de animación. Son 10 animaciones CSS ligeras.
- **Accesibilidad:**
  - botón **«Pausar movimiento del fondo»**, que marca `aria-pressed` y recuerda la elección en `localStorage` (pauta WCAG 2.2.2);
  - con `prefers-reduced-motion` no queda **ninguna animación** activa (verificado: 0 animaciones) y el botón se oculta.
  - Sin desbordamiento horizontal en 320, 390 y 1366 px.

## 2. Fotografías agrícolas

| Foto | Dónde aporta | Licencia |
| --- | --- | --- |
| Laderas cultivadas en parcelas, valle de Latacunga (Gideoraielgave, 2012) | Portada, sección «Cada lote es distinto», que presenta la delimitación de parcelas | CC BY-SA 4.0 |
| Parcelas en las lomas con el Cotopaxi al fondo (Arabsalam, 2023) | Misma sección | CC BY-SA 4.0 |

- **Licencia:** verificada con la API de Wikimedia Commons (`extmetadata`): obra propia y sin restricciones. Cada foto muestra su autor, un enlace al original y la licencia. Los detalles y los cambios realizados están en [`frontend/public/imagenes/CREDITOS.md`](../frontend/public/imagenes/CREDITOS.md).
- **Optimización:** WebP de 720 y 1280 px, de 14 a 44 KB, con `srcset`, `loading="lazy"`, dimensiones declaradas (sin saltos de diseño) y texto alternativo descriptivo.
- **Uso deliberadamente limitado:** no se añadieron fotos a los módulos de datos, donde distraerían de las gráficas.

## 3. Interacciones visuales

- Las tarjetas de la portada se elevan 2 px al pasar el cursor.
- Las fotos se acercan suavemente al pasar el cursor.
- Los botones responden al pulsarlos (`scale(0.98)`).
- Al abrir un módulo (clima, pronóstico, tendencias, calendario, rotaciones, simulador o zona de cultivo), su contenido aparece con un fundido de 0,28 s.
- Todo se desactiva con `prefers-reduced-motion`.
- Se conservan sin cambios las mejoras de `d5451f0`: gráficas con ayuda y delimitación.

## 4. Paquetes ZIP

Se generan fuera del repositorio, en `Documentos\ENTREGAS_ROTAANDES\`, junto a un `MANIFIESTO.txt` con sus SHA-256.

**`rotaandes-codigo-fuente-<commit>.zip`:**

- exportación limpia con `git archive` del commit de entrega;
- solo archivos versionados: sin `.env`, `node_modules`, `dist`, `.tmp`, respaldos ni capturas;
- verificado:
  - el número de archivos coincide con `git ls-files`;
  - búsqueda de secretos (claves privadas, tokens, URLs con contraseña, `.env`);
  - compilación desde el ZIP descomprimido.

**`rotaandes-base-datos-demo.zip`:**

- **Contenido:**
  - `sql/01_esquema.sql`: `pg_dump --schema-only` de una base local migrada, con el registro `_prisma_migrations`;
  - `sql/02_datos_demostracion.sql`: datos ficticios;
  - `sql/03_verificar.sql`;
  - `prisma/`;
  - `restaurar-demo.ps1`;
  - `LEEME.md`.
- **Datos ficticios:**
  - 10 cultivos y 8 plantillas del catálogo referencial;
  - 2 cuentas `@example.invalid` con contraseña de demostración pública;
  - 5 terrenos ficticios, 1 delimitado con las reglas del backend;
  - 4 siembras.
- **Producción:** no se leyó la base de producción para generarlo.
- **Restauración probada** en un esquema desechable de la base local:
  - 7 tablas y 55 restricciones;
  - conteos esperados y `03_verificar.sql` correcto;
  - la contraseña de demostración coincide con su hash bcrypt.
- **Checksums de migración:** coinciden con los archivos del ZIP de código. El de la migración inicial (`2aec5b…`) es el mismo que registra producción.

## 5. Documentación

| Documento | Estado |
| --- | --- |
| [Manual de usuario](GUIA_CLIENTE.md) | Actualizado: portada y pausa del movimiento, delimitación, lectura de gráficas, PDF con zona |
| [Manual técnico](MANUAL_TECNICO.md) | **Nuevo**: cómo se desarrolló, arquitectura, modelo, cada módulo, delimitación, pruebas, despliegue, paquetes, limitaciones |
| [Guía para defender RotaAndes](GUIA_DEFENSA_JURADO.md) | Ampliada: mensaje central, cómo se desarrolló, arquitectura, preguntas sobre licencias, privacidad y entregables |
| [Recorrido de demostración](RECORRIDO_DEMOSTRACION.md) | **Nuevo**: guion de 10 minutos, preparación con la versión publicada o la base demo, plan ante fallos |
| [Procedimiento de respaldo](PROCEDIMIENTO_RESPALDO_PRODUCCION.md) | **Nuevo**: script de solo lectura con validación y restauración de prueba |
| `README.md` | Índice de la documentación de entrega |

## 6. Coherencia de `PROYECTO.md` con `AGENTS.md`

`AGENTS.md` exige actualizar `PROYECTO.md` en el mismo commit cuando cambia el contrato. `PROYECTO.md` ahora documenta la delimitación de forma completa y solo aditiva:

| Sección | Contenido |
| --- | --- |
| §3 Alcance | La funcionalidad, con la fecha de la solicitud del cliente |
| §5 Modelo | Columna `poligono jsonb` |
| §7.5 Regla de negocio | Nueva: formato, validación, superficie, no reemplaza `area_ha`, no cambia el clima y permisos |
| §8 Contrato | Campos `poligono` y `area_poligono_m2`, y rutas `PUT`/`DELETE /api/terrenos/:id/delimitacion` |
| §9 Pantallas | «Zona de cultivo» |
| §14 Criterio de aceptación | Criterio nuevo |

Se cumplen además las convenciones de `AGENTS.md`:

- no se renombró nada;
- el campo lleva su unidad (`area_poligono_m2`);
- las claves GeoJSON no se traducen;
- se valida en el servidor con 400, 401, 403 y 404;
- la decisión queda en `DECISIONES.md`.

`AGENTS.md` no se modificó.

## 7. Verificación

`npm.cmd run check` terminó con **código 0**:

| Suite | `d5451f0` | Ahora |
| --- | --- | --- |
| Backend | 401 | **401** |
| Frontend | 193 | **195** (portada: fotos con crédito y pausa del movimiento) |
| PostgreSQL | 158 | **158** |
| Playwright E2E | 44 | **44** |
| **Total** | **796** | **798** |

Comprobaciones adicionales:

- **Revisión visual de la portada** en 1366, 390 y 320 px y con movimiento reducido: sin desbordamiento horizontal, fotos cargadas y 0 animaciones con movimiento reducido.
- **Funciones existentes:** las 44 E2E recorren registro, terrenos, clima, pronóstico, tendencias, calendario, rotaciones, escenarios, capas, panel técnico, PDF, delimitación y la entrega final en escritorio, 320, 375 y 390 px, con comprobaciones de contraste y teclado.
- **Base de pruebas:** queda vacía tras la ejecución (0 usuarios, terrenos y caché).
- **Procedimiento de respaldo:** probado sobre una base local (firma, índice y restauración en esquema desechable). La parte de `pg_dump` contra producción es la del 10-11-2026 y no se ejecutó, por falta de permiso.

## 8. Capturas

En `.tmp/evidencias/`, carpeta ignorada por Git:

- **`fase3/`:** portada en 1366, 390 y 320 px y con movimiento reducido, más recortes en celular.
- **`antes/`, `despues/` y `comparativas/`:** gráficas y delimitación de la fase anterior.

## 9. Publicación (pendiente de autorización)

1. La persona responsable ejecuta `scripts\respaldarProduccion.ps1` y comparte la ruta, el tamaño, el SHA-256 y los conteos de la restauración.
2. Push de `feat/graficas-delimitacion` y avance de `release/publicacion` por fast-forward.
3. Backend en Railway desde una exportación limpia. El pre-deploy aplica solo `ADD COLUMN poligono JSONB`.
4. Comprobar `/api/health` y que un terreno existente devuelva `poligono: null`.
5. Frontend en Vercel, primero sin dominio y luego promovido.
6. Prueba real con una cuenta temporal: delimitar, guardar, recargar, PDF y eliminar la cuenta.

**Reversión:** volver a los despliegues anteriores de Railway y Vercel. La columna nueva es compatible con ellos y no hace falta borrarla.
