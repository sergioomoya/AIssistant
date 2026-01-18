# Script para añadir variables de Microsoft OAuth al archivo .env
# Ejecuta este script después de obtener las credenciales de Azure Portal

$envFile = ".env"

# Verificar si el archivo .env existe
if (-not (Test-Path $envFile)) {
    Write-Host "El archivo .env no existe. Creándolo..." -ForegroundColor Yellow
    New-Item -ItemType File -Path $envFile | Out-Null
}

# Leer el contenido actual
$content = Get-Content $envFile -Raw

# Variables a añadir/actualizar
$variables = @{
    "MICROSOFT_CLIENT_ID" = ""
    "MICROSOFT_CLIENT_SECRET" = ""
    "MICROSOFT_TENANT_ID" = "common"
}

# Añadir sección de Microsoft OAuth si no existe
if ($content -notmatch "Microsoft OAuth") {
    $content += "`n# ----- Microsoft OAuth (Calendar) -----`n"
}

# Añadir o actualizar cada variable
foreach ($var in $variables.Keys) {
    $pattern = "$var\s*=.*"
    $newLine = "$var=$($variables[$var])"
    
    if ($content -match $pattern) {
        # Actualizar variable existente
        $content = $content -replace $pattern, $newLine
        Write-Host "Actualizada: $var" -ForegroundColor Green
    } else {
        # Añadir nueva variable
        $content += "$newLine`n"
        Write-Host "Añadida: $var" -ForegroundColor Green
    }
}

# Guardar el archivo
$content | Set-Content $envFile -NoNewline

Write-Host "`nVariables de Microsoft OAuth añadidas al archivo .env" -ForegroundColor Cyan
Write-Host "`nIMPORTANTE: Edita el archivo .env y completa los valores:" -ForegroundColor Yellow
Write-Host "  - MICROSOFT_CLIENT_ID: Tu Application (client) ID de Azure Portal" -ForegroundColor White
Write-Host "  - MICROSOFT_CLIENT_SECRET: El Value del client secret de Azure Portal" -ForegroundColor White
Write-Host "  - MICROSOFT_TENANT_ID: 'common' (por defecto) o tu tenant específico" -ForegroundColor White
Write-Host "`nDespués de completar los valores, reinicia los servicios:" -ForegroundColor Yellow
Write-Host "  docker-compose restart backend frontend" -ForegroundColor White
