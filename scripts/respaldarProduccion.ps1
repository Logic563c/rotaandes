# Respaldo de SOLO LECTURA de PostgreSQL de producción (Railway) con validación y restauración de prueba local.
# Lo ejecuta una persona autorizada desde PowerShell, en la raíz del repositorio:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\respaldarProduccion.ps1
# No modifica producción: solo ejecuta pg_dump dentro del servicio postgres. No imprime credenciales.
[CmdletBinding()]
param(
    [string]$Destino = (Join-Path $env:USERPROFILE 'Documents\RESPALDOS_ROTAANDES'),
    [string]$BinPostgres = 'C:\Program Files\PostgreSQL\18\bin',
    [switch]$OmitirRestauracion
)
# Proyecto Railway fijado explícitamente (rotaandes); el servicio y el entorno también se indican en el comando.
$ProyectoRailway = '948127e6-92fc-487f-a974-7315f6a3c1cd'
$ErrorActionPreference = 'Stop'
$raiz = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
function Paso([string]$texto) { Write-Host "`n== $texto" -ForegroundColor Cyan }
function Fallar([string]$texto) { Write-Host "ERROR: $texto" -ForegroundColor Red; exit 1 }

Paso '1/5 Comprobaciones previas'
foreach ($programa in @('railway', 'ssh', 'node')) { if (-not (Get-Command $programa -ErrorAction SilentlyContinue)) { Fallar "No se encontró '$programa' en el PATH." } }
foreach ($binario in @('pg_restore.exe', 'psql.exe')) { if (-not (Test-Path (Join-Path $BinPostgres $binario))) { Fallar "No se encontró $binario en $BinPostgres." } }
& railway whoami *> $null; if ($LASTEXITCODE -ne 0) { Fallar 'Railway CLI no tiene sesión. Ejecuta: railway login' }
& ssh-add -l *> $null; if ($LASTEXITCODE -ne 0) { Fallar 'El agente SSH no tiene claves cargadas. Ejecuta: ssh-add $env:USERPROFILE\.ssh\id_ed25519' }
Push-Location $raiz
$exito = $false; $base64 = $null; $respaldo = $null
try {
    $estado = (& railway status 2>&1) -join ' '
    if ($estado -notmatch 'rotaandes') { Fallar 'El directorio no está vinculado al proyecto rotaandes de Railway (railway link).' }
    Write-Host 'Railway, SSH y herramientas de PostgreSQL disponibles.'

    Paso '2/5 Respaldo con pg_dump (lectura en el servicio postgres de producción)'
    New-Item -ItemType Directory -Force $Destino | Out-Null
    $sello = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
    $base64 = Join-Path $Destino "rotaandes_prod_$sello.dump.b64"
    $registro = Join-Path $Destino "pg_dump_$sello.log"
    $respaldo = Join-Path $Destino "rotaandes_prod_$sello.dump"
    # Solo lectura: pg_dump dentro del contenedor. Si pg_dump falla se marca en stderr, porque la tubería devolvería el código de base64.
    cmd /c "railway ssh -p $ProyectoRailway -s postgres -e production -- sh -c ""(pg_dump -Fc -Z 6 -d rotaandes_prod || echo FALLO_PG_DUMP >&2) | base64 -w0"" > ""$base64"" 2> ""$registro"""
    if ($LASTEXITCODE -ne 0) { Fallar "railway ssh terminó con código $LASTEXITCODE. Revisa $registro" }
    if ((Get-Content $registro -Raw -ErrorAction SilentlyContinue) -match 'FALLO_PG_DUMP') { Fallar "pg_dump falló dentro del contenedor. Revisa $registro" }
    $contenido = [IO.File]::ReadAllText($base64).Trim()
    if ($contenido.Length -lt 100) { Fallar 'La salida del respaldo está vacía o incompleta.' }
    [IO.File]::WriteAllBytes($respaldo, [Convert]::FromBase64String($contenido))
    Remove-Item $base64 -Force

    Paso '3/5 Validación del archivo'
    $bytes = [IO.File]::ReadAllBytes($respaldo)
    if ($bytes.Length -lt 2048 -or [Text.Encoding]::ASCII.GetString($bytes, 0, 5) -ne 'PGDMP') { Fallar 'El archivo no tiene la firma PGDMP de un respaldo pg_dump personalizado.' }
    $huella = (Get-FileHash $respaldo -Algorithm SHA256).Hash
    "$huella  $(Split-Path $respaldo -Leaf)" | Out-File -Encoding ascii "$respaldo.sha256"
    $indice = & (Join-Path $BinPostgres 'pg_restore.exe') -l $respaldo
    if ($LASTEXITCODE -ne 0) { Fallar 'pg_restore no puede leer el índice del respaldo.' }
    $faltantes = @('usuarios', 'terrenos', 'siembras', 'cultivos', 'plantillas_rotacion', 'clima_cache', '_prisma_migrations') | Where-Object { -not ($indice -match "TABLE DATA public $_ ") }
    if ($faltantes) { Fallar "Faltan datos de tablas en el respaldo: $($faltantes -join ', ')" }
    Write-Host "Archivo: $respaldo"
    Write-Host "Tamaño:  $($bytes.Length) bytes"
    Write-Host "SHA-256: $huella  (guardado en $respaldo.sha256)"
    Write-Host 'Índice:  las 7 tablas tienen datos en el respaldo.'

    Paso '4/5 Restauración de prueba en un esquema desechable de la base LOCAL de pruebas'
    if ($OmitirRestauracion) { Write-Host 'Omitida por parámetro. El respaldo NO está verificado por restauración.' -ForegroundColor Yellow }
    else {
        $env:PG_BIN = $BinPostgres
        & node (Join-Path $raiz 'scripts\probarRestauracionRespaldo.mjs') $respaldo
        if ($LASTEXITCODE -ne 0) { Fallar 'La restauración de prueba falló. No publiques hasta resolverlo.' }
    }

    Paso '5/5 Resultado'
    $exito = $true
    Write-Host 'RESPALDO VERIFICADO.' -ForegroundColor Green
    Write-Host 'Comunica a Claude solo: la ruta del archivo, su tamaño, su SHA-256 y la salida de la restauración (conteos).'
    Write-Host 'El archivo contiene correos y hashes de contraseñas: guárdalo en privado, nunca en Git ni en chats.'
} finally {
    # Nunca deja la copia intermedia en base64. Si la verificación no terminó, elimina también el respaldo no válido.
    if ($base64 -and (Test-Path $base64)) { Remove-Item $base64 -Force }
    if (-not $exito -and $respaldo) { foreach ($archivo in @($respaldo, "$respaldo.sha256")) { if (Test-Path $archivo) { Remove-Item $archivo -Force } } }
    Pop-Location
}
