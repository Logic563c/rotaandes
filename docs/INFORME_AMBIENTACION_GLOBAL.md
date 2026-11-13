# Ambientación fotográfica global de RotaAndes

13 de noviembre de 2026 · Desarrollo local en `feat/ambientacion-global`, desde `c8f663d729263f5f38c5f0f6d822308a51837dd5`.

## Alcance y trabajo previo

Esta fase modifica presentación y pruebas. No modifica backend, cliente HTTP, autenticación, permisos, rutas, cálculos, modelos, migraciones, semillas, variables de entorno ni dependencias. No publica código, no despliega servicios y no accede a PostgreSQL de producción.

Al comenzar había una modificación local en `frontend/src/estilos.css`: el fondo del crédito de la composición de portada pasaba de `#ffffffd9` a `#ffffff`. Se preservaron su parche y la copia original en `.tmp/evidencias/ambientacion-global/`, antes de cambiar de rama. Se mantiene y se incorpora **expresamente** como ajuste previo de contraste. No se descartó ni se sustituyó por una versión del archivo publicado.

`main`, `release/publicacion`, `PROYECTO.md`, `AGENTS.md` y la etiqueta de la primera entrega permanecen intactos. La versión pública continúa en `c8f663d`; esta fase necesita una autorización nueva para publicar.

## Sistema visual

- **Paisaje compartido:** `Marco.tsx` muestra una sola fotografía decorativa de parcelas de Cotopaxi en las páginas interiores. Login, registro, perfil, terrenos, formularios, detalle, panel técnico, glosario y fuentes heredan el mismo entorno.
- **Lectura:** un velo crema protege los textos exteriores. Tarjetas y módulos usan blanco opaco. Las gráficas, tablas, mapas, herramientas de delimitación y formularios conservan superficies limpias y sus controles.
- **Interacción:** el fondo es fijo, tiene `pointer-events: none`, está oculto a lectores de pantalla y no ocupa espacio en el flujo. No se mueve con una animación ni interviene en el enfoque, los clics o los gestos del mapa.
- **Portada:** conserva título, textos, fotografías, etiquetas, registro, login, fuentes y créditos. Mantiene su propio fondo; no recibe una segunda fotografía ambiental.
- **Cabeceras:** se conservan las imágenes existentes. En tableta se refuerza el velo para evitar que el texto llegue a una zona demasiado clara.
- **Crédito:** la fotografía ambiental se acredita al final del contenido, con autor, original, licencia y aviso de carácter ilustrativo. No se presenta como terreno registrado ni como información satelital.

## Movimiento y accesibilidad

Se elige la alternativa estática solicitada. Se retiran el acercamiento automático del fondo, el movimiento repetitivo de las etiquetas, el botón de pausa y el estado de presentación asociado. No se modifica el almacenamiento de sesiones JWT. Una preferencia antigua de pausa no condiciona la nueva portada.

Se conserva `prefers-reduced-motion` para las transiciones e indicadores existentes. Se comprueba que portada y fondo no tengan animaciones, también con movimiento reducido. La decisión evita necesitar un control para una animación continua: [WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).

Se mantienen etiquetas, foco visible, salto al contenido, jerarquía y navegación por teclado. La referencia de contraste es [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Estas comprobaciones no constituyen una certificación completa de accesibilidad.

## Fotografías, licencias y rendimiento

No se agregan ni editan fotografías. Se reutilizan los archivos WebP y el registro existentes; los originales y las licencias están en [CREDITOS.md](../frontend/public/imagenes/CREDITOS.md).

| Uso | Fotografía | Autor y licencia |
| --- | --- | --- |
| Fondo común, panel técnico y sección de parcelas | Road to Quilotoa Cotopaxi view Ecuador 1614 | Arabsalam · CC BY-SA 4.0 |
| Portada y Mi espacio | Cotopaxi se cree Fuji | David Ceballos · CC BY 2.0 |
| Composición y detalle | Road Hacienda La Cienega to Quito Ecuador 1662 | Arabsalam · CC BY-SA 4.0 |
| Acceso y terrenos | Valle en Latacunga III | Gideoraielgave · CC BY-SA 4.0 |

La imagen ambiental usa `srcset`: 15 340 bytes en 720 px y 35 322 bytes en 1280 px. El navegador elige según ancho y densidad; puede reutilizarla entre páginas y cabeceras. No hay videos, nuevos paquetes ni solicitudes a proveedores fotográficos externos.

El fondo fuera del flujo no desplaza los controles al cargar. Se elimina el trabajo continuo de animación de portada. En compilaciones locales equivalentes, el bloque principal pasa de 560,14 kB / 163,86 kB gzip a 560,28 kB / 163,81 kB gzip; CSS de 44,35 kB / 9,53 kB gzip a 44,11 kB / 9,43 kB gzip. Sigue el aviso previo de Vite por un bloque superior a 500 kB; esta fase no cambia la organización de módulos para resolverlo.

## Revisión visual y defecto corregido

Se capturaron 17 vistas en 320, 375, 390, 768 y 1366 px: portada, login, registro, Mi espacio, perfil, terrenos, creación, edición, detalle, delimitación, gráfica climática, calendario, rotaciones, tendencias, glosario, fuentes y panel técnico.

Antes: 85 capturas. Después: 90, incluidas cinco de movimiento reducido. La comparación está en `.tmp/evidencias/ambientacion-global/galeria.html`; imágenes en `antes/` y `despues/`. Son artefactos locales ignorados por Git.

La revisión inicial de tableta detectó contraste de 3,20–3,69:1 en textos de las cabeceras de Mi espacio y panel técnico. El degradado horizontal de escritorio se activaba demasiado pronto. Ahora se aplica desde 1152 px; por debajo se mantiene un velo oscuro uniforme. La repetición de tableta pasó.

| Ancho | Mediciones representativas | Contraste mínimo final | Desbordamiento |
| --- | --- | --- | --- |
| 1366 px | 85 | 4,64:1 | Ninguno |
| 768 px | 85 | 4,64:1 | Ninguno |
| 390 px | 85 | 4,64:1 | Ninguno |
| 375 px | 85 | 4,64:1 | Ninguno |
| 320 px | 85 | 4,64:1 | Ninguno |

Para estas 425 mediciones se captura el fondo real con el texto temporalmente transparente, se convierte su color mediante canvas y se calcula luminancia/contraste sobre la fotografía compuesta. El muestreo usa percentiles 1/99 dentro del elemento, evitando márgenes. La nueva prueba de regresión de la cabecera de tableta es más estricta: compara **todos** los píxeles del fondo de su título con el color del texto y exige ≥4,5:1.

## Pruebas y procedencia de los datos

Las capturas usan cuentas y un terreno ficticios en `rotaandes_pruebas_36cbc85c`, con limpieza y restauración de las claves de caché utilizadas. Backend, PostgreSQL y motores agrícolas son reales. Climatología y tendencias se alimentan con respuestas controladas; la cartografía externa se bloquea en las capturas para hacerlas repetibles. No se usan como prueba de disponibilidad de NASA ni como observaciones científicas reales.

La prueba del antiguo botón de pausa se adapta al comportamiento estático autorizado, conservando el caso y verificando fotografías, acciones y preferencias anteriores. No se elimina ninguna suite funcional. Se añaden ocho casos de `Marco` y cuatro ejecuciones E2E (dos casos en escritorio y celular): fondos y controles en los cinco tamaños, teclado, movimiento reducido y contraste fotográfico en tableta.

`npm.cmd run check` terminó con **código 0 y 810 pruebas aprobadas**. Incluye lint sin advertencias, TypeScript estricto, compilación de ambos paquetes y todas las baterías siguientes:

| Batería | Antes | Ahora |
| --- | --- | --- |
| Backend | 401 | 401 |
| Frontend | 195 | 203 |
| PostgreSQL aislado | 158 | 158 |
| Navegador | 44 | 48 |
| **Total** | **798** | **810** |

La medición visual adicional consta de cinco recorridos finales aprobados; no se suma al total anterior. La primera comparación posterior falló exclusivamente por el contraste de tableta descrito arriba; después del ajuste se repitió ese recorrido y pasó. Las capturas de referencia también aprobaron sus cinco recorridos. El cierre de sus servidores locales requirió finalizar los procesos de captura que quedaron pendientes en Windows; no se alteraron pruebas ni resultados para hacerlo.

La comprobación final de solo lectura encontró las seis tablas de la base aislada sin registros residuales y ninguna cuenta `ambiente-*` restante. Las dos migraciones existentes figuran aplicadas; el comando de pruebas informó que no había migraciones pendientes. No se creó ni modificó una migración. La consulta de desarrollo fue de solo lectura, con `rotaandes_app`. No se conectó a la base de producción.

Registros locales: `.tmp/check-ambientacion-global.log` y `.tmp/evidencias/ambientacion-global/{validacion,estado-bases,auditoria}.json`. No se versionan resultados, capturas, secretos ni entornos.

Los recorridos existentes conservan registro/login, perfiles, terreno e historial persistidos, permisos, mapas y delimitación completa, valores y leyendas climáticas, pronóstico, calendario, rotaciones, escenarios, GIBS, tendencias, panel técnico y descarga/lectura de PDF. Las verificaciones se ejecutan en local y base aislada.

## Archivos de esta fase

1. `frontend/src/components/Marco.tsx`: decoración y crédito compartidos.
2. `frontend/src/components/Marco.test.tsx`: ocho casos nuevos.
3. `frontend/src/estilos.css`: fondo, superficies sólidas, portada estática, corrección de tableta y ajuste local previo conservado.
4. `frontend/src/pages/Inicio.tsx`: retirada del movimiento y su botón, manteniendo el contenido.
5. `frontend/src/pages/Inicio.test.tsx`: adaptación al comportamiento estático.
6. `frontend/public/imagenes/CREDITOS.md`: registra el nuevo uso de la foto existente.
7. `tests/navegador/ambientacion.spec.ts`: verificación visual y regresión de contraste.
8. `README.md`: enlace y separación del estado local frente a publicación.
9. `docs/DECISIONES.md`: justificaciones y preservación del trabajo previo.
10. `docs/INFORME_AMBIENTACION_GLOBAL.md`: este informe.

## Publicación posterior: exclusivamente frontend

**Publicación no ejecutada en esta fase. Requiere autorización del commit exacto tras revisar las capturas.** La exportación y su compilación local de publicación se preparan después del commit, sin enviar código ni activar despliegues; el registro queda en `.tmp/evidencias/ambientacion-global/publicacion-preparada.json`.

Destino: repositorio privado `Logic563c/rotaandes`, rama `release/publicacion`, mediante fast-forward desde `c8f663d`. Vercel: proyecto `rotaandes`, scope `logic563`, ID `prj_nfVORQuty8Uj0Psw0B9YUQJj26Hv`. Se conserva la variable pública `VITE_API_URL` apuntando al backend HTTPS existente.

Procedimiento:

1. Confirmar árbol limpio, commit aprobado y ascendencia desde `release/publicacion`. Enviar la rama visual y actualizar la de publicación sin force push, después de recibir autorización nueva.
2. Exportar el **commit** con `git -c core.autocrlf=false archive --format=zip --output=<archivo.zip> <commit>`. Extraer en una carpeta nueva bajo `.tmp/`, sin copiar la carpeta de trabajo ni sus entornos.
3. Comparar los archivos exportados con los blobs de ese commit; comprobar secretos y manifiesto de carga. El build es `npm ci --include=dev` y `npm run build:publicacion --workspace frontend`, salida `frontend/dist`, desde la raíz del monorepo. Las dependencias y resultados locales no se envían.
4. Revisar sin publicar con `vercel.cmd deploy --dry --format=json --prod --scope logic563 --project prj_nfVORQuty8Uj0Psw0B9YUQJj26Hv --yes` en la exportación.
5. Crear la versión candidata con `vercel.cmd deploy --prod --skip-domain --no-wait --format=json --scope logic563 --project prj_nfVORQuty8Uj0Psw0B9YUQJj26Hv --meta revisionAprobada=<commit> --yes`.
6. Esperar `READY` y confirmar commit, HTML/JS/CSS, fotografías, API HTTPS y rutas SPA. Revisar antes de cambiar el dominio. Usar la autenticación oficial de Vercel si la URL está protegida; no desactivar protecciones.
7. Promover únicamente esa versión con `vercel.cmd promote <URL-del-despliegue> --scope logic563 --yes` y comprobar portada, acceso y vistas responsive en `https://rotaandes.vercel.app`.
8. Ante un defecto importante, volver a promover la versión estable `dpl_J4uSetdbVUcu9wTz3hE59Au22irx`. Su estado `READY` y asociación con `c8f663d` se confirmaron mediante consulta de solo lectura durante esta fase.

No ejecutar comandos Railway, migraciones, semillas, cambios de credenciales ni pruebas de escritura en producción para esta actualización visual.

## Límites

Las pruebas y medidas no sustituyen una evaluación completa con lectores de pantalla o dispositivos físicos. La fotografía es decorativa; no cambia la precisión de los datos ni constituye evidencia agrícola. Se mantienen las limitaciones científicas y el GeoJSON analítico pendiente de fases anteriores. La publicación y comprobación de esta versión en Internet quedan pendientes de autorización.
