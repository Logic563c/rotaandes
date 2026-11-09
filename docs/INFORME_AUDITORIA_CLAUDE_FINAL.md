# Informe de auditoría final — RotaAndes

Fecha: 9 de noviembre de 2026 · Rama: `fix/estabilizacion-final` (desde `d589f63`) · Presentación: 11 de noviembre de 2026.

Detalle técnico de NASA POWER, evidencia y recuperación: [DIAGNOSTICO_NASA_Y_RECUPERACION.md](DIAGNOSTICO_NASA_Y_RECUPERACION.md).

## 1. Estado de los módulos

| Módulo | Estado en `fix/estabilizacion-final` | Evidencia |
| --- | --- | --- |
| Registro, login, perfil, JWT | Funciona | Recorrido local real; pruebas unitarias, PostgreSQL y E2E |
| Terrenos, siembras, altitud automática | Funciona | Open-Meteo real: 2.773 m en Latacunga |
| Climatología NASA POWER | **Corregido** (fallaba con 500) | 200 con NASA real en coordenadas de 6 decimales |
| Calendario 10 × 12 = 120 celdas | **Corregido** (fallaba con 500) | 120 celdas, 4 estados, motivo por celda |
| Rotaciones (actual + 2) | **Corregido** (sin ranking por falta de clima) | Puntajes con clima real; sugerida no determinada se muestra sin inventar |
| Simulador −30/+30 %, −2/+2 °C | **Corregido** | Cambios coherentes; fuera de rango → 400; no escribe datos |
| Tendencias 2005–2024 | **Corregido** (mismo defecto de coordenadas) | Mensual y diaria NASA real; respaldo por celda nuevo |
| Pronóstico Open-Meteo | Funciona | 7 días reales; sin dependencia de NASA |
| Capas MODIS NDVI / SMAP (GIBS) | Funciona (solo imágenes) | 200 en producción; GeoJSON analítico **no implementado** (503 honesto) |
| PDF | Funciona | 200, PDF válido, autenticado; 404 para otra cuenta |
| Panel técnico | Funciona | Pruebas de permisos y E2E existentes |
| Landing, glosario, fuentes | Funciona | E2E existentes |

## 2. Errores originales y causas

Ver la sección 2 del diagnóstico. Resumen: NASA POWER v2.10.1 redondea a milésimas las coordenadas devueltas y el validador solo aceptaba centésimas → toda respuesta para un terreno marcado en el mapa se rechazaba → 500 en clima y calendario, y rotaciones sin ranking. Agravantes: mensaje genérico para todo 5xx, timeout del frontend de 8 s, sin reintentos, rechazo inmediato por concurrencia y respaldo limitado a cinco coordenadas exactas.

Los cuatro síntomas (A–D) tienen una sola causa raíz. No se encontraron fallos de CORS, JWT, caché, PostgreSQL ni configuración de Railway/Vercel.

## 3. Pruebas

RESULTADOS_CHECK

## 4. PostgreSQL de producción y respaldo

ESTADO_BACKUP

## 5. Publicación

ESTADO_PUBLICACION

## 6. Incidencias pendientes

INCIDENCIAS
