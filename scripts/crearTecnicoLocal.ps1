[CmdletBinding()]
param([switch]$BasePruebas)
$ErrorActionPreference = 'Stop'
$rutaBackendTecnico = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../backend'))
$correoTecnico = Read-Host 'Correo de la nueva cuenta técnica local'
$nombreTecnico = Read-Host 'Nombre de la nueva cuenta técnica local'
$claveTecnico = Read-Host 'Contraseña nueva (mínimo 15 caracteres, máximo 72 bytes UTF-8)' -AsSecureString
$punteroTecnico = [IntPtr]::Zero
$procesoTecnico = $null
try {
    $punteroTecnico = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($claveTecnico)
    $textoClaveTecnico = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($punteroTecnico)
    $entradaTecnico = @{ email = $correoTecnico; nombre = $nombreTecnico; password = $textoClaveTecnico } | ConvertTo-Json -Compress
    $inicioTecnico = New-Object Diagnostics.ProcessStartInfo
    $inicioTecnico.FileName = (Get-Command node.exe -CommandType Application -ErrorAction Stop).Source
    $inicioTecnico.Arguments = '--import tsx "' + (Join-Path $rutaBackendTecnico 'scripts/aprovisionarTecnico.ts') + '"'
    if ($BasePruebas) { $inicioTecnico.Arguments += ' --pruebas' }
    $inicioTecnico.WorkingDirectory = $rutaBackendTecnico
    $inicioTecnico.UseShellExecute = $false
    $inicioTecnico.CreateNoWindow = $true
    $inicioTecnico.RedirectStandardInput = $true
    $inicioTecnico.RedirectStandardOutput = $true
    $inicioTecnico.RedirectStandardError = $true
    $procesoTecnico = New-Object Diagnostics.Process
    $procesoTecnico.StartInfo = $inicioTecnico
    [void]$procesoTecnico.Start()
    $salidaTecnico = $procesoTecnico.StandardOutput.ReadToEndAsync()
    $errorTecnico = $procesoTecnico.StandardError.ReadToEndAsync()
    # PowerShell 5/.NET Framework no expone StandardInputEncoding. Escribir bytes evita pérdida de Unicode.
    $bytesEntradaTecnico = [Text.Encoding]::UTF8.GetBytes($entradaTecnico)
    $procesoTecnico.StandardInput.BaseStream.Write($bytesEntradaTecnico, 0, $bytesEntradaTecnico.Length)
    $procesoTecnico.StandardInput.BaseStream.Flush()
    $procesoTecnico.StandardInput.Close()
    $procesoTecnico.WaitForExit()
    if ($procesoTecnico.ExitCode -ne 0) { throw 'No se creó la cuenta. Verifica el formato, una contraseña válida, un correo nuevo y PostgreSQL local. Ninguna salida privada del proceso se muestra.' }
    Write-Output 'Cuenta técnica local creada. Puedes iniciar sesión con las credenciales introducidas.'
} finally {
    if ($punteroTecnico -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($punteroTecnico) }
    $textoClaveTecnico = $null
    $entradaTecnico = $null
    if ($bytesEntradaTecnico) { [Array]::Clear($bytesEntradaTecnico, 0, $bytesEntradaTecnico.Length) }
    if ($claveTecnico) { $claveTecnico.Dispose() }
    if ($procesoTecnico) { $procesoTecnico.Dispose() }
}
