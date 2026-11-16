# Demostración local de la primera entrega

> **Registro histórico de esta fase.** Se conservan sus fechas, versiones, cifras y resultados; las menciones a publicación pendiente o a repositorio privado describen ese momento. Para la versión vigente, las instrucciones actuales y las evidencias verificadas el 15-11-2026, consultar [ESTADO_ACTUAL.md](ESTADO_ACTUAL.md). Los comandos de publicación, migración o reversión de este registro no son instrucciones para la auditoría documental actual. Para demostrar la aplicación actual, usar [RECORRIDO_DEMOSTRACION.md](RECORRIDO_DEMOSTRACION.md).

Esta guía presenta el núcleo existente de RotaAndes: cuenta, perfil, terrenos, siembras, climatología, pronóstico y calendario. No presenta el producto completo de `PROYECTO.md`. El resultado de la auditoría está en [INFORME_PRIMERA_ENTREGA.md](INFORME_PRIMERA_ENTREGA.md).

## Antes de presentar

- Usar esta computadora con Node 24.20.0, npm 11, PostgreSQL 18.4 y Microsoft Edge. Prisma permanece en 7.10.1.
- PostgreSQL debe estar iniciado. Las bases y el archivo privado `backend/.env` ya están preparados; no reemplazarlo, mostrarlo en pantalla ni volver a crear bases.
- Dejar libres los puertos 3000 y 5173. Se necesita Internet para consultas nuevas a NASA POWER, Open-Meteo y para las imágenes de OpenStreetMap.
- Utilizar una cuenta propia de presentación, sin información personal ajena. No existen contraseñas ni cuentas demo predeterminadas. Elegir y conservar la contraseña de forma privada.
- Las pruebas automatizadas usan exclusivamente la base aislada y eliminan sus cuentas y registros temporales. No dejan una cuenta disponible para iniciar sesión después.

## Iniciar y detener

En una terminal PowerShell de VS Code:

```powershell
Set-Location C:\Users\DELL\Documents\PROYECTOS\rotaandes
npm.cmd run dev
```

Mantener esa terminal abierta y entrar en **http://localhost:5173**. El backend responde en **http://localhost:3000/api/health**. Un estado «Conexión disponible» comprueba el proceso HTTP, no toda la base ni los proveedores.

Para detener frontend y backend, pulsar `Ctrl+C` en esa terminal. No es necesario detener ni borrar PostgreSQL. En un clon sin dependencias, consultar primero los pasos de preparación del [README](../README.md); en esta instalación no hace falta repetirlos para cada demostración.

## Guion del agricultor

Reservar tiempo para leer los avisos y las respuestas de los proveedores; una conexión lenta puede alargar el recorrido.

| Paso | Acción en pantalla | Qué explicar y comprobar |
| --- | --- | --- |
| 1 | Abrir la portada | RotaAndes organiza información para apoyar decisiones agrícolas de Cotopaxi. No garantiza cosechas ni reemplaza a un técnico. |
| 2 | Pulsar **Registrarme** | Registrar una cuenta bajo control del presentador con una contraseña privada de al menos 15 caracteres y hasta 72 bytes UTF-8. No compartirla en una captura o proyección. |
| 3 | Cerrar sesión e ingresar | Mostrar que las credenciales válidas permiten volver al espacio personal. La sesión dura hasta 15 minutos; no es un error que solicite entrar nuevamente al expirar. |
| 4 | Abrir **Mi perfil** | Revisar nombre, parroquia y teléfono opcional. Cambiar las prioridades de agua, suelo e ingresos y guardar. Las prioridades se persisten; todavía no ponderan rotaciones ni cambian las reglas del calendario. |
| 5 | Abrir **Mis terrenos → Añadir terreno** | El mapa comienza en Latacunga. Tocar un punto reconocible de Latacunga o Pujilí y revisar las coordenadas. También pueden escribirse manualmente. No se dibujan polígonos. |
| 6 | Completar y guardar el terreno | Indicar nombre, área declarada, riego y suelo. El mapa no mide el área. Los datos de presentación deben identificarse como tales, sin afirmar que describen una explotación real. |
| 7 | Revisar el detalle | Comprobar coordenadas, riego, suelo, área y altitud estimada. La altitud la consulta el backend a Open-Meteo; puede quedar sin dato si el servicio falla. No es una medición topográfica exacta. |
| 8 | Registrar una siembra de papa | Elegir **Papa**, una fecha real y, si se conoce, cosecha posterior o igual. Dejar la cosecha vacía si no se conoce. Añadir una nota que identifique el registro como presentación. |
| 9 | Registrar otra siembra válida | Elegir otro cultivo del catálogo y fechas válidas. Mostrar el historial ordenado; las fechas conservan el día registrado. |
| 10 | Pulsar **Ver climatología histórica** | Mostrar barras de lluvia, líneas de temperaturas y tabla de doce meses. Leer fuente, periodo, fecha de consulta, resolución y avisos. La fecha de consulta no convierte estos promedios históricos en tiempo actual. |
| 11 | Leer humedad y riesgo histórico | La humedad de raíces es un índice 0–1. El riesgo histórico de helada es heurístico, calculado con mínima climatológica y altitud; no es un conteo de heladas observadas. |
| 12 | Pulsar **Ver pronóstico de siete días** | Open-Meteo es un proveedor distinto de NASA. Mostrar las fechas de Ecuador continental, mínimas y máximas en °C y lluvia diaria prevista en mm. Incluye hoy y seis días más. |
| 13 | Revisar alertas | Una mínima prevista ≤2 °C genera una alerta preventiva. Si los datos reales no cruzan el umbral, explicar que no corresponde mostrar una alerta. No modificar datos para forzarla. |
| 14 | Pulsar **Ver calendario de siembra** | Mostrar meses y cultivos evaluables, leyenda con texto/símbolos y cultivos excluidos por altitud. En celular desplazar la matriz dentro de su contenedor. El backend evalúa diez cultivos por doce meses. |
| 15 | Seleccionar varias celdas | Comparar, por ejemplo, papa en enero y haba en octubre. Leer el motivo real, sin prometer un estado fijo: depende de altitud, riego, lluvia, ventanas y heladas. Con teclado usar Tab, Enter y Escape. |
| 16 | Explicar las clasificaciones | Verde: cumple la regla referencial. Amarillo: condiciones parcialmente favorables conocidas. Rojo: exclusión comprobada. Gris: faltan datos esenciales. Todos los valores agronómicos requieren validación local. |
| 17 | Editar terreno y siembra | Cambiar datos válidos, guardar y comprobar el resultado. Al cambiar coordenadas se vuelve a estimar la altitud. Si otra edición cambió coordenadas o fechas durante el guardado, recargar y revisar el conflicto indicado. |
| 18 | Cerrar e iniciar sesión otra vez | Abrir el mismo terreno y comprobar que perfil, terreno e historial siguen guardados. Se recuperan de PostgreSQL, no de una pantalla estática. |
| 19 | Opcional: mostrar eliminación | Solo sobre un registro propio de presentación. Primero cancelar la confirmación; eliminar únicamente si se desea. Eliminar el terreno también elimina su historial. Nunca demostrar esto sobre datos ajenos. |
| 20 | Cerrar la presentación | Recordar fuentes y limitaciones. La demostración es local; no anuncia una publicación en Internet ni funcionalidades de la segunda entrega. |

## Qué hace cada módulo

- **Cuenta y perfil:** identifica al agricultor y guarda datos de contacto y prioridades. El registro no permite elegir el rol técnico.
- **Terrenos:** guarda un punto, el área declarada y características del lote; estima la altitud con Open-Meteo/Copernicus DEM GLO-90.
- **Siembras:** conserva el historial por terreno usando los diez cultivos referenciales originales.
- **Climatología:** resume NASA POWER a largo plazo. PRECTOTCORR llega en mm/día y se convierte a lluvia mensual con los días medios del mes del periodo; febrero incluye sus años bisiestos.
- **Pronóstico:** presenta siete días de Open-Meteo y posibles heladas según el umbral preventivo. No aplica el ajuste altitudinal de la climatología a estas temperaturas.
- **Calendario:** combina reglas del catálogo referencial con altitud, riego y climatología. Sus explicaciones identifican las condiciones favorables, exclusiones y datos desconocidos.

## Si algo falla durante la presentación

| Síntoma | Alternativa segura |
| --- | --- |
| No abre la página o backend sin respuesta | Comprobar que la terminal de `npm.cmd run dev` sigue activa y que no informa puertos ocupados. Usar las URLs locales indicadas, sin cambiar CORS a un comodín. |
| No carga el fondo del mapa | Leer el aviso y usar las coordenadas manuales y la lista de terrenos. **Reintentar mapa** vuelve a solicitar las imágenes. No confundir una imagen faltante con pérdida del terreno guardado. |
| No hay altitud | Se mantiene nula. Volver a guardar la ubicación permite reintentar; explicar que la recomendación puede quedar no determinada. Nunca escribir una altitud inventada en la base. |
| NASA no responde | Reintentar con moderación. La caché dura 30 días; puede mostrarse un dato anterior válido de la misma ubicación, claramente desactualizado. Los cinco respaldos archivados solo se usan si sus coordenadas coinciden exactamente. Para otro punto puede haber indisponibilidad. No prometer funcionamiento climático sin conexión para todos los terrenos. |
| NASA informa menor precisión de coordenadas | Leer el aviso: la respuesta puede expresar centésimas aunque la solicitud conserve más decimales. No representa una medición exacta del lote ni cambia sus coordenadas guardadas. |
| Open-Meteo no responde | Usar **Reintentar** cuando aparezca. El pronóstico tiene caché de hasta 30 minutos, limitada también por el día de Ecuador; al vencer no se presenta como vigente. No sustituirlo por capturas antiguas como si fueran actuales. |
| Hay gris en el calendario | Leer la explicación de datos faltantes. No significa lluvia cero ni clima favorable. Un rojo puede corresponder a una exclusión conocida aunque falten otros datos. |
| Sesión vencida o demasiados intentos | Ingresar nuevamente si expiró. Ante 429, respetar la espera; no reiniciar el servidor para evadir los límites durante una presentación. |
| Cambios concurrentes en coordenadas o fechas | Recargar los datos y comprobar qué cambió antes de volver a guardar. No reenviar repetidamente un formulario antiguo. |

No editar archivos privados, desactivar autorizaciones, borrar bases o fabricar datos para ocultar una interrupción. Como alternativa, enseñar capturas previamente identificadas con su fecha y procedencia, aclarando que no constituyen una consulta en vivo.

## Evidencia y repetición automatizada

La auditoría guardó capturas locales de escritorio y celular y comprobó el recorrido con PostgreSQL aislado. Las rutas exactas y la distinción entre datos controlados y consultas externas reales están en [el informe](INFORME_PRIMERA_ENTREGA.md). Las capturas y resultados no se versionan.

Con los puertos libres, esta validación reproduce la primera entrega y limpia exclusivamente sus registros temporales:

```powershell
npm.cmd run check
```

El recorrido integral puede ejecutarse por separado:

```powershell
npm.cmd run test:integral
```

Por defecto, clima y pronóstico de ese recorrido se controlan en la base aislada para no depender de los proveedores; las cuentas, perfil, terreno y siembras se persisten realmente. No es una demostración de meteorología en vivo. La comprobación integral externa separada, ya ejecutada durante esta auditoría, se reproduce así después de compilar:

```powershell
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'No se completó la compilación.' }
$env:ROTAANDES_E2E_PROVEEDORES_REALES = '1'
try {
    npm.cmd exec -- playwright test --config playwright.integral.config.ts --output .tmp/evidencias-reales
    if ($LASTEXITCODE -ne 0) { throw 'El recorrido real no terminó correctamente.' }
} finally {
    Remove-Item Env:ROTAANDES_E2E_PROVEEDORES_REALES -ErrorAction SilentlyContinue
}
```

No ejecutar simultáneamente suites que escriban en la misma base aislada. El modo real exige respuestas válidas de los proveedores y puede fallar si no están disponibles; no oculta el fallo con datos de prueba. No se han publicado servicios ni cuentas de demostración en Internet en esta fase.
