$ErrorActionPreference = 'Stop'
$rutaAsistenteTecnico = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../scripts/crearTecnicoLocal.ps1'))
$tokensTecnico = $null
$erroresTecnico = $null
[void][Management.Automation.Language.Parser]::ParseFile($rutaAsistenteTecnico, [ref]$tokensTecnico, [ref]$erroresTecnico)
if ($erroresTecnico.Count -ne 0) { throw 'El asistente técnico contiene errores de sintaxis.' }
$envAnteriorTecnico = $env:NODE_ENV
$marcadorClaveTecnico = [Guid]::NewGuid().ToString('N')
function Read-Host {
    param([string]$Prompt, [switch]$AsSecureString)
    if ($AsSecureString) { return ConvertTo-SecureString $marcadorClaveTecnico -AsPlainText -Force }
    if ($Prompt -like 'Correo*') { return 'temporal@example.invalid' }
    return 'Cuenta temporal no creada'
}
try {
    $env:NODE_ENV = 'production'
    $rechazadoTecnico = $false
    try { $salidaTecnicoPrueba = & $rutaAsistenteTecnico 2>&1 | Out-String } catch { $rechazadoTecnico = $true; $salidaTecnicoPrueba = $_.Exception.Message }
    if (-not $rechazadoTecnico) { throw 'El asistente permitió un entorno de producción.' }
    if ($salidaTecnicoPrueba.Contains($marcadorClaveTecnico)) { throw 'El asistente expuso la contraseña de prueba.' }
    Write-Output 'Asistente técnico: sintaxis, canal oculto y rechazo de producción aprobados; sin conexión SQL.'
} finally {
    $env:NODE_ENV = $envAnteriorTecnico
    $marcadorClaveTecnico = $null
    Remove-Item Function:Read-Host -ErrorAction SilentlyContinue
}
