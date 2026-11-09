# INFORME DE ENTREGA FINAL - ROTAANDES

Fecha: 9 de noviembre de 2026
Estado: desarrollo funcional validado localmente; publicación final pendiente.

## 1. Descripción

RotaAndes es una plataforma web de apoyo a la siembra y rotación
de cultivos, orientada a agricultores de Cotopaxi, Ecuador.

Utiliza información climática, datos satelitales y reglas
referenciales para facilitar decisiones agrícolas informadas.

## 2. Arquitectura

Frontend: React, Vite y TypeScript.
Backend: Node.js, Express y TypeScript.
Base de datos: PostgreSQL con Prisma.
Mapas: Leaflet y OpenStreetMap.
Infraestructura: Vercel y Railway.

## 3. Funcionalidades implementadas

- Registro, inicio y cierre de sesión.
- Perfiles y prioridades agrícolas.
- Administración de terrenos.
- Historial de siembras.
- Climatología histórica NASA POWER.
- Pronóstico Open-Meteo y alertas preventivas.
- Calendario de siembra.
- Comparación de tres estrategias de rotación.
- Simulador de escenarios de lluvia y temperatura.
- Visualización NASA GIBS de MODIS NDVI y SMAP.
- Tendencias climáticas 2005-2024.
- Panel de técnicos con acceso de solo lectura.
- Informes PDF descargables.
- Portada pública, glosario y fuentes.

## 4. Validación local

Comando: npm.cmd run check

Backend: 358 pruebas aprobadas.
Frontend: 168 pruebas aprobadas.
PostgreSQL: 152 pruebas aprobadas.
Playwright E2E: 42 pruebas aprobadas.

Total: 720 pruebas aprobadas, sin fallos reportados.

Se aprobaron las verificaciones de ESLint, TypeScript
y compilación de producción.

La batería E2E incluyó escritorio y pantallas móviles.

## 5. Integridad de la base de datos

Las pruebas utilizaron una base PostgreSQL local aislada.

Se identificó una diferencia de checksum de la migración
inicial entre LF y CRLF.

Archivo versionado LF:
56872579c7614dc95cab57a73565f535a4e133d827581d60ea4883816ebc469c

Huella registrada en producción CRLF:
2aec5b49e4595ca2ca1ced0afb3f1ae009f5983d91d15a3c34c09e1bf1c6edfb

La diferencia fue reproducida cambiando únicamente los
finales de línea. No se modificó PostgreSQL de producción.

Esta particularidad debe considerarse antes de ejecutar
cualquier migración futura.

## 6. Limitaciones conocidas

- Las recomendaciones de rotación son referenciales.
- Los datos climáticos NASA POWER tienen resolución regional.
- Los pronósticos no garantizan condiciones exactas del terreno.
- Las imágenes GIBS no representan procesamiento GeoJSON
  analítico por parcela.
- No se han realizado pruebas de campo con agricultores reales.
- No existe certificación formal WCAG.
- El frontend presenta un aviso no bloqueante de tamaño
  de algunos archivos JavaScript.
- Los informes PDF completos pueden ser extensos.

## 7. Estado de publicación

Frontend:
https://rotaandes.vercel.app/

Backend:
https://backend-production-954a9.up.railway.app/

La versión pública anterior permanece separada de la rama
release/candidata-final.

La publicación final exige revisar los cambios, verificar
la configuración de Railway y Vercel, autorizar el despliegue
y ejecutar pruebas sobre las URLs públicas.

No considerar publicada la versión candidata hasta
confirmar estas operaciones.

## 8. Seguridad y entrega

No se deben incluir contraseñas, tokens ni archivos .env
en el repositorio o los paquetes de entrega.

El rol técnico debe aprovisionarse mediante el procedimiento
seguro documentado y no mediante el registro público.

Se recomienda conservar el commit de producción anterior
como referencia para la reversión si aparece un fallo.
