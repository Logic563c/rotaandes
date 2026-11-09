$ErrorActionPreference = 'Stop'
if ($env:NODE_ENV -ne 'test' -or -not $env:ROTAANDES_PRUEBA_CORREO -or -not $env:ROTAANDES_PRUEBA_CLAVE) { throw 'Este auxiliar solo se ejecuta desde la prueba automatizada con datos efímeros.' }
function Read-Host {
    param([string]$Prompt, [switch]$AsSecureString)
    if ($AsSecureString) { return ConvertTo-SecureString $env:ROTAANDES_PRUEBA_CLAVE -AsPlainText -Force }
    if ($Prompt -like 'Correo*') { return $env:ROTAANDES_PRUEBA_CORREO }
    return 'Técnico Ñandú de prueba'
}
& (Join-Path $PSScriptRoot '../../scripts/crearTecnicoLocal.ps1') -BasePruebas
