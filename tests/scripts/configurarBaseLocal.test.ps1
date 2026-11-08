$ErrorActionPreference = 'Stop'
$raizProyecto = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$rutaScript = Join-Path $raizProyecto 'scripts\configurarBaseLocal.ps1'
$errores = $null
$tokens = $null
$arbol = [System.Management.Automation.Language.Parser]::ParseFile($rutaScript, [ref]$tokens, [ref]$errores)
if ($errores.Count -gt 0) { throw 'El asistente contiene errores de sintaxis.' }

# Cargar solo funciones propias; no ejecutar el bloque que conecta o pide claves.
$funciones = $arbol.FindAll({ param($nodo) $nodo -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false)
foreach ($funcion in $funciones) { Invoke-Expression $funcion.Extent.Text }

$aprobadas = 0
function Comprobar([bool]$Condicion, [string]$Mensaje) {
    if (-not $Condicion) { throw $Mensaje }
    $script:aprobadas++
}

$valorSintetico = 'solo-fixture:con@caracteres/#%'
$urlSintetica = 'postgresql://rotaandes_app:{0}@127.0.0.1:5432/rotaandes_dev?schema=public' -f [Uri]::EscapeDataString($valorSintetico)
$configuracion = Leer-UrlLocal $urlSintetica $false
Comprobar ($null -ne $configuracion -and $configuracion.clave -eq $valorSintetico) 'No se conservaron los caracteres reservados de la fixture.'
Comprobar ($configuracion.base -eq 'rotaandes_dev') 'No se identificó la base de desarrollo.'
Comprobar ($null -eq (Leer-UrlLocal ($urlSintetica.Replace('127.0.0.1', 'ejemplo.com')) $false)) 'Se admitió un servidor externo.'
Comprobar ($null -eq (Leer-UrlLocal ($urlSintetica.Replace('rotaandes_app:', 'postgres:')) $false)) 'Se admitió un rol administrativo.'
Comprobar ($null -eq (Leer-UrlLocal $urlSintetica $true)) 'Se admitió desarrollo como destino de pruebas.'
Comprobar ($null -ne (Leer-UrlLocal ($urlSintetica.Replace('rotaandes_dev', 'rotaandes_pruebas_a1b2c3d4')) $true)) 'No se admitió una base de pruebas válida.'
Comprobar ($null -eq (Leer-UrlLocal ($urlSintetica.Replace('rotaandes_dev', 'otra_base')) $false)) 'Se admitió una base ajena.'

$script:entornoAnterior = @('PORT=3000', ('DATABASE_URL="' + $urlSintetica + '"'))
Comprobar ((Leer-ValorEntorno 'DATABASE_URL') -eq $urlSintetica) 'No se leyó un valor de entorno entre comillas.'
Comprobar ($null -eq (Leer-ValorEntorno 'INEXISTENTE')) 'Se inventó un valor de entorno.'

$rutaPgpass = Join-Path $raizProyecto ('.tmp\fixture-' + [Guid]::NewGuid().ToString('N') + '.pgpass')
$anteriorPgpass = $env:PGPASSFILE
try {
    [IO.Directory]::CreateDirectory((Split-Path -Parent $rutaPgpass)) | Out-Null
    [IO.File]::WriteAllLines($rutaPgpass, @('# Fixture temporal sin credenciales reales', '127.0.0.1:5432:*:rotaandes_app:fixture\:con\\escape'))
    $env:PGPASSFILE = $rutaPgpass
    Comprobar ((Leer-Pgpass 'rotaandes_app' 'rotaandes_dev') -eq 'fixture:con\escape') 'No se interpretaron los escapes de pgpass.'
    Comprobar ($null -eq (Leer-Pgpass 'postgres' 'postgres')) 'Se reutilizó la clave de otro rol.'
} finally {
    if ($null -eq $anteriorPgpass) { Remove-Item Env:PGPASSFILE -ErrorAction SilentlyContinue }
    else { $env:PGPASSFILE = $anteriorPgpass }
    if (Test-Path -LiteralPath $rutaPgpass) { Remove-Item -LiteralPath $rutaPgpass }
}

$rutaFixtureEntorno = Join-Path $raizProyecto ('.tmp\entorno-' + [Guid]::NewGuid().ToString('N') + '.env')
try {
    Guardar-ArchivoEntorno $rutaFixtureEntorno @('PORT=3000')
    Comprobar (([IO.File]::ReadAllLines($rutaFixtureEntorno) -join '|') -eq 'PORT=3000') 'No se creó el archivo de entorno temporal.'
    Guardar-ArchivoEntorno $rutaFixtureEntorno @('PORT=3000', 'CORS_ORIGIN=http://localhost:5173')
    Comprobar (([IO.File]::ReadAllLines($rutaFixtureEntorno) -join '|') -eq 'PORT=3000|CORS_ORIGIN=http://localhost:5173') 'Falló la reescritura atómica del archivo existente.'
    $restos = @(Get-ChildItem -LiteralPath (Split-Path -Parent $rutaFixtureEntorno) -Filter ((Split-Path -Leaf $rutaFixtureEntorno) + '.*.tmp'))
    Comprobar ($restos.Count -eq 0) 'Quedaron archivos temporales de entorno.'
} finally { if (Test-Path -LiteralPath $rutaFixtureEntorno) { Remove-Item -LiteralPath $rutaFixtureEntorno } }

Write-Output "$aprobadas comprobaciones PowerShell aprobadas; sin conexiones ni cambios en bases de datos."
