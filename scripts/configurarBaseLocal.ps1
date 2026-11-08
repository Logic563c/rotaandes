param(
    [string]$Psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe',
    [switch]$SinInteraccion
)

$ErrorActionPreference = 'Stop'
$raizProyecto = Split-Path -Parent $PSScriptRoot
$rutaEntorno = Join-Path $raizProyecto 'backend\.env'
$rutaEstado = Join-Path $raizProyecto '.tmp\configuracion-postgres.json'
$credenciales = @{ postgres = $null; rotaandes_app = $null }
$clavesSolicitadas = @{}
$basePruebas = ''
$entornoAnterior = @()

function Guardar-Estado([string]$Estado, [string]$Mensaje) {
    $directorio = Split-Path -Parent $rutaEstado
    if (-not (Test-Path -LiteralPath $directorio)) { [IO.Directory]::CreateDirectory($directorio) | Out-Null }
    $contenido = @{ estado = $Estado; mensaje = $Mensaje; basePruebas = $script:basePruebas } | ConvertTo-Json
    [IO.File]::WriteAllText($rutaEstado, $contenido, (New-Object Text.UTF8Encoding($false)))
}

function Detener-Configuracion([string]$Mensaje) {
    $excepcion = New-Object InvalidOperationException($Mensaje)
    $excepcion.Data['mensajePublico'] = $Mensaje
    throw $excepcion
}

function Leer-ValorEntorno([string]$Nombre) {
    foreach ($linea in $script:entornoAnterior) {
        if ($linea -match ('^\s*' + [Regex]::Escape($Nombre) + '\s*=\s*(.*?)\s*$')) {
            $valor = $Matches[1]
            if ($valor.Length -ge 2 -and (($valor.StartsWith('"') -and $valor.EndsWith('"')) -or ($valor.StartsWith("'") -and $valor.EndsWith("'")))) {
                return $valor.Substring(1, $valor.Length - 2)
            }
            return $valor
        }
    }
    return $null
}

function Guardar-ArchivoEntorno([string]$Ruta, [string[]]$Lineas) {
    $temporal = $Ruta + '.' + [Guid]::NewGuid().ToString('N') + '.tmp'
    try {
        [IO.File]::WriteAllLines($temporal, $Lineas, (New-Object Text.UTF8Encoding($false)))
        # PowerShell 5 necesita un null de tipo string real para no crear una ruta vacía.
        if (Test-Path -LiteralPath $Ruta) { [IO.File]::Replace($temporal, $Ruta, [NullString]::Value) }
        else { [IO.File]::Move($temporal, $Ruta) }
    } finally { if (Test-Path -LiteralPath $temporal) { Remove-Item -LiteralPath $temporal } }
}

function Leer-UrlLocal([string]$Valor, [bool]$EsPrueba) {
    if (-not $Valor) { return $null }
    try {
        $uri = New-Object Uri($Valor)
        $partes = $uri.UserInfo -split ':', 2
        $nombre = $uri.AbsolutePath.TrimStart('/')
        $baseValida = if ($EsPrueba) { $nombre -match '^rotaandes_pruebas_[a-f0-9]{8}$' } else { $nombre -eq 'rotaandes_dev' }
        if ($uri.Scheme -notin @('postgresql', 'postgres') -or $uri.Host -ne '127.0.0.1' -or $uri.Port -ne 5432 -or
            $partes.Length -ne 2 -or [Uri]::UnescapeDataString($partes[0]) -ne 'rotaandes_app' -or -not $baseValida) { return $null }
        return @{ base = $nombre; clave = [Uri]::UnescapeDataString($partes[1]) }
    } catch { return $null }
}

function Leer-Pgpass([string]$Rol, [string]$Base) {
    $ruta = if ($env:PGPASSFILE) { $env:PGPASSFILE } else { Join-Path $env:APPDATA 'postgresql\pgpass.conf' }
    if (-not (Test-Path -LiteralPath $ruta)) { return $null }
    foreach ($linea in [IO.File]::ReadAllLines($ruta)) {
        if ($linea.StartsWith('#') -or $linea.Trim() -eq '') { continue }
        $campos = New-Object 'System.Collections.Generic.List[string]'
        $actual = New-Object Text.StringBuilder
        $escape = $false
        foreach ($caracter in $linea.ToCharArray()) {
            if ($escape) { [void]$actual.Append($caracter); $escape = $false }
            elseif ($caracter -eq '\') { $escape = $true }
            elseif ($caracter -eq ':') { $campos.Add($actual.ToString()); [void]$actual.Clear() }
            else { [void]$actual.Append($caracter) }
        }
        $campos.Add($actual.ToString())
        if ($campos.Count -eq 5 -and $campos[0] -in @('*', '127.0.0.1') -and $campos[1] -in @('*', '5432') -and
            $campos[2] -in @('*', $Base) -and $campos[3] -in @('*', $Rol)) { return $campos[4] }
    }
    return $null
}

function Obtener-ClaveDisponible([string]$Rol, [string]$Base) {
    if ($script:credenciales[$Rol]) { return $script:credenciales[$Rol] }
    if ($env:PGPASSWORD) { return $env:PGPASSWORD }
    return Leer-Pgpass $Rol $Base
}

function Invocar-SqlLocal([string]$Rol, [string]$Base, [string]$Consulta) {
    if ($Base -notmatch '^[a-z0-9_]+$' -or $Rol -notin @('postgres', 'rotaandes_app') -or $Consulta.Contains('"')) {
        Detener-Configuracion 'Parámetros SQL fuera de los límites del asistente.'
    }
    $inicio = New-Object Diagnostics.ProcessStartInfo
    $inicio.FileName = $Psql
    $inicio.Arguments = '-X -w -q -t -A -h 127.0.0.1 -p 5432 -U {0} -d {1} -v ON_ERROR_STOP=1 -c "{2}"' -f $Rol, $Base, $Consulta
    $inicio.UseShellExecute = $false
    $inicio.CreateNoWindow = $true
    $inicio.RedirectStandardOutput = $true
    $inicio.RedirectStandardError = $true
    $inicio.StandardOutputEncoding = New-Object Text.UTF8Encoding($false)
    $inicio.StandardErrorEncoding = New-Object Text.UTF8Encoding($false)
    $inicio.EnvironmentVariables['PGCLIENTENCODING'] = 'UTF8'
    $inicio.EnvironmentVariables['PGCONNECT_TIMEOUT'] = '5'
    $clave = Obtener-ClaveDisponible $Rol $Base
    if ($clave) { $inicio.EnvironmentVariables['PGPASSWORD'] = $clave }
    $proceso = New-Object Diagnostics.Process
    $proceso.StartInfo = $inicio
    try {
        [void]$proceso.Start()
        $salida = $proceso.StandardOutput.ReadToEndAsync()
        $errorOculto = $proceso.StandardError.ReadToEndAsync()
        if (-not $proceso.WaitForExit(15000)) {
            $proceso.Kill()
            Detener-Configuracion 'PostgreSQL no respondió dentro del tiempo permitido.'
        }
        $texto = $salida.GetAwaiter().GetResult()
        $diagnosticoOculto = $errorOculto.GetAwaiter().GetResult()
        $tipoFallo = if ($diagnosticoOculto -match 'fe_sendauth|28P01|password|contrase|autentic') { 'credencial' } else { 'conexion_o_ejecucion' }
        return @{ codigo = $proceso.ExitCode; texto = $texto.Trim(); tipoFallo = $tipoFallo }
    } finally {
        $inicio.EnvironmentVariables.Remove('PGPASSWORD')
        $clave = $null
        $diagnosticoOculto = $null
        $proceso.Dispose()
    }
}

function Solicitar-Clave([string]$Rol) {
    if ($SinInteraccion) { Detener-Configuracion "Falta autenticación local para $Rol. Utiliza la tarea integrada de VS Code con entrada oculta." }
    if ($script:clavesSolicitadas.ContainsKey($Rol)) { Detener-Configuracion "No se pudo autenticar como $Rol con la clave introducida. No se volverá a solicitar en esta ejecución." }
    $script:clavesSolicitadas[$Rol] = $true
    Guardar-Estado ('esperando_clave_' + $Rol) "Introduce la contraseña de $Rol en esta terminal; su entrada es oculta."
    Write-Host "Solo falta la contraseña local de $Rol. No la escribas en el chat."
    $segura = Read-Host "Contraseña de $Rol (entrada oculta)" -AsSecureString
    if ($segura.Length -eq 0) {
        $segura.Dispose()
        Detener-Configuracion "No se recibió una contraseña de $Rol. No se intentó autenticar con una entrada vacía."
    }
    $puntero = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($segura)
    try { $script:credenciales[$Rol] = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($puntero) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($puntero); $segura.Dispose() }
    Guardar-Estado 'configurando' 'Continuando la configuración local.'
}

function Conectar-Administrador {
    $resultado = Invocar-SqlLocal 'postgres' 'postgres' 'SELECT 1;'
    if ($resultado.codigo -ne 0) {
        if ($resultado.tipoFallo -ne 'credencial') { Detener-Configuracion 'Falló la conexión o ejecución de psql; no se solicitó una contraseña innecesaria.' }
        Solicitar-Clave 'postgres'
        $resultado = Invocar-SqlLocal 'postgres' 'postgres' 'SELECT 1;'
    }
    if ($resultado.codigo -ne 0) {
        if ($resultado.tipoFallo -eq 'credencial') { Detener-Configuracion 'PostgreSQL rechazó la contraseña de postgres. No se modificaron sus credenciales.' }
        Detener-Configuracion 'La conexión como postgres falló por una causa distinta de la contraseña.'
    }
}

$consultaCatalogo = @'
SELECT json_build_object(
 'rol', (SELECT row_to_json(r) FROM (SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname='rotaandes_app') r),
 'bases', COALESCE((SELECT json_agg(json_build_object('nombre', datname, 'propietario', pg_get_userbyid(datdba), 'codificacion', pg_encoding_to_char(encoding)))
 FROM pg_database WHERE datname='rotaandes_dev' OR datname ~ '^rotaandes_pruebas_[a-f0-9]{8}$'), '[]'::json));
'@

try {
    Guardar-Estado 'revisando' 'Revisando recursos existentes sin modificarlos.'
    if (-not (Test-Path -LiteralPath $Psql)) { Detener-Configuracion 'No se encontró psql.exe.' }
    $rama = & git -C $raizProyecto branch --show-current
    if ($LASTEXITCODE -ne 0 -or $rama -ne 'feat/base-datos-autenticacion') { Detener-Configuracion 'La configuración solo se ejecuta en feat/base-datos-autenticacion.' }
    & git -C $raizProyecto check-ignore --quiet backend/.env
    if ($LASTEXITCODE -ne 0) { Detener-Configuracion 'backend/.env no está ignorado por Git. Se detuvo la configuración antes de guardar secretos.' }
    if (Test-Path -LiteralPath $rutaEntorno) { $entornoAnterior = @([IO.File]::ReadAllLines($rutaEntorno)) }
    $configDesarrollo = Leer-UrlLocal (Leer-ValorEntorno 'DATABASE_URL') $false
    $configPruebas = Leer-UrlLocal (Leer-ValorEntorno 'TEST_DATABASE_URL') $true
    if ($configDesarrollo) { $credenciales['rotaandes_app'] = $configDesarrollo.clave }
    elseif ($configPruebas) { $credenciales['rotaandes_app'] = $configPruebas.clave }

    $rolAuditoria = 'rotaandes_app'
    $baseAuditoria = 'postgres'
    $resultado = Invocar-SqlLocal $rolAuditoria $baseAuditoria $consultaCatalogo
    if ($resultado.codigo -ne 0) {
        $baseAuditoria = 'rotaandes_dev'
        $resultado = Invocar-SqlLocal $rolAuditoria $baseAuditoria $consultaCatalogo
    }
    if ($resultado.codigo -ne 0) {
        Conectar-Administrador
        $rolAuditoria = 'postgres'
        $baseAuditoria = 'postgres'
        $resultado = Invocar-SqlLocal $rolAuditoria $baseAuditoria $consultaCatalogo
    }
    if ($resultado.codigo -ne 0) { Detener-Configuracion 'No se pudo inspeccionar el catálogo PostgreSQL.' }
    $catalogo = $resultado.texto | ConvertFrom-Json
    if (-not $catalogo.rol -or -not $catalogo.rol.rolcanlogin -or $catalogo.rol.rolsuper -or $catalogo.rol.rolcreatedb -or $catalogo.rol.rolcreaterole) {
        Detener-Configuracion 'El rol rotaandes_app debe existir con LOGIN y sin SUPERUSER, CREATEDB ni CREATEROLE. No se cambiaron permisos.'
    }
    $bases = @($catalogo.bases)
    $desarrollo = @($bases | Where-Object { $_.nombre -eq 'rotaandes_dev' })
    if ($desarrollo.Count -gt 0 -and ($desarrollo[0].propietario -ne 'rotaandes_app' -or $desarrollo[0].codificacion -ne 'UTF8')) {
        Detener-Configuracion 'rotaandes_dev tiene un propietario o codificación distintos. No se alteró la base existente.'
    }
    $candidatas = @($bases | Where-Object { $_.nombre -match '^rotaandes_pruebas_[a-f0-9]{8}$' -and $_.propietario -eq 'rotaandes_app' -and $_.codificacion -eq 'UTF8' } | Sort-Object nombre)
    if ($configPruebas) {
        $basePruebas = $configPruebas.base
        $existente = @($bases | Where-Object { $_.nombre -eq $basePruebas })
        if ($existente.Count -gt 0 -and ($existente[0].propietario -ne 'rotaandes_app' -or $existente[0].codificacion -ne 'UTF8')) {
            Detener-Configuracion 'La base de pruebas configurada tiene otro propietario o codificación. No se alteró.'
        }
    }
    elseif ($candidatas.Count -gt 0) { $basePruebas = $candidatas[0].nombre }
    else { $basePruebas = 'rotaandes_pruebas_' + [Guid]::NewGuid().ToString('N').Substring(0, 8) }

    foreach ($nombre in @('rotaandes_dev', $basePruebas)) {
        $existe = @($bases | Where-Object { $_.nombre -eq $nombre })
        if ($existe.Count -eq 0) {
            if ($rolAuditoria -ne 'postgres') { Conectar-Administrador; $rolAuditoria = 'postgres' }
            $creacion = Invocar-SqlLocal 'postgres' 'postgres' "CREATE DATABASE $nombre WITH OWNER rotaandes_app ENCODING 'UTF8' TEMPLATE template0;"
            if ($creacion.codigo -ne 0) { Detener-Configuracion "No se pudo crear $nombre. No se borraron ni alteraron otras bases." }
            Write-Host "Creada $nombre (propietario rotaandes_app, UTF8)."
        } else { Write-Host "Se reutiliza $nombre (propietario rotaandes_app, UTF8)." }
    }
    $credenciales['postgres'] = $null

    foreach ($nombre in @('rotaandes_dev', $basePruebas)) {
        $conexion = Invocar-SqlLocal 'rotaandes_app' $nombre 'SELECT current_user;'
        if ($conexion.codigo -ne 0) {
            Solicitar-Clave 'rotaandes_app'
            $conexion = Invocar-SqlLocal 'rotaandes_app' $nombre 'SELECT current_user;'
        }
        if ($conexion.codigo -ne 0 -or $conexion.texto -ne 'rotaandes_app') { Detener-Configuracion "No se pudo conectar a $nombre como rotaandes_app." }
        Write-Host "Conexión comprobada a $nombre como rotaandes_app."
    }

    $claveAplicacion = Obtener-ClaveDisponible 'rotaandes_app' 'rotaandes_dev'
    if (-not $claveAplicacion) {
        Solicitar-Clave 'rotaandes_app'
        $claveAplicacion = $credenciales['rotaandes_app']
        $conexion = Invocar-SqlLocal 'rotaandes_app' 'rotaandes_dev' 'SELECT 1;'
        if ($conexion.codigo -ne 0) { Detener-Configuracion 'La clave de aplicación no permitió verificar la conexión.' }
    }
    $claveCodificada = [Uri]::EscapeDataString($claveAplicacion)
    $lineas = @($entornoAnterior | Where-Object { $_ -notmatch '^\s*(DATABASE_URL|TEST_DATABASE_URL)\s*=' })
    if ($lineas.Count -eq 0) { $lineas = @('PORT=3000', 'CORS_ORIGIN=http://localhost:5173') }
    $lineas += 'DATABASE_URL=postgresql://rotaandes_app:{0}@127.0.0.1:5432/rotaandes_dev?schema=public' -f $claveCodificada
    $lineas += 'TEST_DATABASE_URL=postgresql://rotaandes_app:{0}@127.0.0.1:5432/{1}?schema=public' -f $claveCodificada, $basePruebas
    Guardar-ArchivoEntorno $rutaEntorno ([string[]]$lineas)
    Guardar-Estado 'completada' 'Bases reutilizadas o creadas, conexiones comprobadas y entorno privado configurado.'
    Write-Host 'Configuración local completada. El agente continuará con las migraciones y las pruebas.'
} catch {
    $mensaje = 'No se pudo completar la configuración local. No se mostraron credenciales ni se borraron bases existentes.'
    if ($_.Exception.Data['mensajePublico']) { $mensaje = [string]$_.Exception.Data['mensajePublico'] }
    Guardar-Estado 'fallo' $mensaje
    Write-Host $mensaje -ForegroundColor Red
    exit 1
} finally {
    $credenciales.Clear()
    $claveAplicacion = $null
    $claveCodificada = $null
    $configDesarrollo = $null
    $configPruebas = $null
    $entornoAnterior = $null
    $lineas = $null
}
