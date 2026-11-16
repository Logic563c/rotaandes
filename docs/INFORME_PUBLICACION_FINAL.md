# Informe de publicación: gráficas, delimitación y entrega (12-11-2026)

> **Registro histórico de esta fase.** Se conservan sus fechas, versiones, cifras y resultados; las menciones a publicación pendiente o a repositorio privado describen ese momento. Para la versión vigente, las instrucciones actuales y las evidencias verificadas el 15-11-2026, consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los comandos de publicación, migración o reversión de este registro no son instrucciones para la auditoría documental actual. El último backend estable comprobado es `4a2055e` / `calendario_ciclo_v4`; esta entrega del 12-11-2026 no es el último despliegue.

Publicación controlada, autorizada por el responsable del proyecto, de los commits `d5451f0`, `739031c` y `0f13434`. No se borró, recreó ni restauró la base de datos de producción.

## Resultado

| Elemento | Valor |
| --- | --- |
| Commit publicado | `0f134349ead74a8f1cbf934c0535d0dea98a3fb5` en `release/publicacion` (fast-forward `8761912..0f13434`, sin `--force`) |
| Railway (backend) | Despliegue `c4e2af1e-bcd6-4616-8b6c-1cd529314da8`, estado SUCCESS, desde una exportación limpia (`git archive`, 349 archivos) |
| Migración | `20261112000100_delimitacion_terreno` aplicada (checksum `78cffd…`); la inicial conserva `2aec5b…` |
| Vercel (frontend) | Despliegue `dpl_BDMF5oNEGABpqcd6yTJ6XwbAuAi5`, verificado sin dominio y promovido a https://rotaandes.vercel.app |
| Salud | `/api/health` → `{"ok":true}`; las rutas `/`, `/login`, `/registro`, `/glosario`, `/fuentes` y `/terrenos` y las fotos responden 200 |

## Verificaciones previas

- **Respaldo:** `rotaandes_prod_20261112T231807Z.dump` (76 649 bytes, SHA-256 `C5BA95A8…5C52`), realizado y verificado por el responsable, con restauración de prueba correcta. Se comprobó su huella antes de publicar. No forma parte de ningún paquete ni del repositorio.
- **Checksums:** Prisma calcula el SHA-256 de los bytes del archivo.
  - Los hashes `56872579…` y `0271a45c…` corresponden a los archivos versionados en Git, con fin de línea LF.
  - Los hashes `2aec5b…` y `78cffd…` corresponden a la exportación `git archive` en Windows (`core.autocrlf=true`), con CRLF.
  - Sin los CR, la exportación es idéntica al archivo versionado, con 117/117 y 4/4 líneas.
  - Producción ya registraba `2aec5b…`, por lo que no hubo discrepancia.
- **Pruebas:** `npm.cmd run check` sobre `0f13434` terminó con código 0 y 798 pruebas aprobadas.
- **Reversión simulada** en un esquema local desechable, con 8 usuarios, 8 terrenos y 7 siembras sintéticos:
  - la migración conserva todos los registros;
  - el `migrate deploy` del backend anterior no falla después («No pending migrations»);
  - una zona ya guardada se conserva.
- **Compatibilidad del backend anterior:** sus pruebas de PostgreSQL, ejecutadas contra una base con la columna nueva, pasan 151 de 152. La única que falla es la que exige la lista exacta de columnas antigua.
- **Secretos:** las 32 revisiones del historial no contienen los secretos locales reales, ni claves privadas, tokens o archivos `.env` o `.dump`.
- **Vercel:** el proyecto no está conectado a Git, así que el push no publicó nada por sí solo.

## Integridad de PostgreSQL

Se tomaron conteos y huellas MD5 del contenido de las filas, sin leer ni mostrar datos personales:

| | Antes de migrar | Tras migrar | Tras la limpieza |
| --- | --- | --- | --- |
| usuarios | 8 | 8 | 8 |
| terrenos | 8 | 8 | 8 |
| siembras | 7 | 7 | 7 |
| cultivos y plantillas | 10 y 8 | 10 y 8 | — |
| huella de usuarios | `de4d3313…` | `de4d3313…` | `de4d3313…` |
| huella de terrenos | `f28bd679…` | `f28bd679…` | `f28bd679…` |
| huella de siembras | `78101033…` | `78101033…` | `78101033…` |

Estado de la columna `terrenos.poligono`:

- tipo `jsonb`, anulable y sin valor predeterminado;
- vacía en los 8 terrenos existentes;
- dos migraciones registradas, ambas terminadas y sin revertir.

## Prueba funcional real (cuenta temporal)

**Cuenta:** `prueba-publicacion-551a253c@example.invalid` (usuario `2a83c98c-f8b7-4d4c-bffe-cd218948de46`, terreno `67126a92-96cf-4761-8bcf-bed5fd5fadc5`, 0 siembras). La contraseña era aleatoria y no se imprimió ni se guardó.

| Prueba | Escritorio 1366 px | Celular 390 px |
| --- | --- | --- |
| Portada con fotos y botón de pausa | Correcta | Correcta |
| Registro e inicio de sesión | Correcta | Correcta |
| Creación de terreno | Correcta | — |
| Climatología: 3 gráficas y ayuda «¿Cómo interpretar…?» | Correcta | Correcta |
| Valor exacto al señalar o tocar | Visible en la captura | Visible: «Julio · Lluvia: 65,1 mm» |
| Pronóstico con gráficas | Correcta | — |
| Delimitación: dibujar, cerrar, guardar (PUT 200) y recuperar al recargar | Correcta (3,01 ha; +0,51 ha frente a las 2,5 declaradas) | Visible |
| Simulador al −20 % | Correcta | — |
| PDF descargado | Correcta (`%PDF-`) | — |
| Sin desbordamiento horizontal | Correcta | Correcta |

**Valor exacto en la comprobación automática:** el script lo comprobó leyendo `innerText`, que en una fila flex elimina el espacio entre «Lluvia:» y el valor, de modo que su expresión regular no coincidió. Las capturas de producción muestran el cuadro emergente correcto, y las E2E del mismo commit lo verifican con `textContent`.

**Limpieza:** se eliminaron en una transacción solo el terreno `67126a92…` y el usuario `2a83c98c…`, con comprobación previa de que eran los únicos registros de la prueba (resultado: `DELETE 1` y `DELETE 1`). Después: 8, 8 y 7 registros con las huellas originales, y 0 restos de la prueba. Las entradas de caché de clima generadas durante la prueba son datos compartidos del sistema y se renuevan solas.

Capturas en `.tmp/evidencias/produccion/` (no versionado): portada, gráfica, delimitación y simulador en escritorio; portada, delimitación y gráfica con cuadro emergente en celular; PDF descargado.

## Reversión (si fuera necesaria)

- **Backend:** volver a subir con `railway up` la exportación limpia de `8761912`, ya preparada y verificada (320 archivos). Ese backend es compatible con la columna `poligono`. No hay que borrar la columna ni tocar datos.
- **Frontend:** `vercel promote` de `dpl_2yhV29znUspofP7n4B8No7sdoYtK` (metadatos `revisionAprobada=8761912`).
- **Desastre:** el respaldo verificado del 12-11-2026. Restaurarlo en producción requiere una decisión expresa; no forma parte de la reversión normal.
