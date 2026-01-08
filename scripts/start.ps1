# ===========================================
# AIssistant - Script de Inicio (Windows)
# ===========================================

Write-Host "🎙️ AIssistant - Asistente de Reuniones con IA" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si Docker está instalado
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker no está instalado. Por favor, instala Docker Desktop." -ForegroundColor Red
    exit 1
}

# Verificar si Docker está corriendo
$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker no está corriendo. Por favor, inicia Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker detectado y funcionando" -ForegroundColor Green

# Copiar archivo de configuración si no existe
$envFile = ".env"
$envTemplate = "env.template"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envTemplate) {
        Copy-Item $envTemplate $envFile
        Write-Host "📝 Archivo .env creado desde template" -ForegroundColor Yellow
        Write-Host "   Edita .env para configurar tus API keys" -ForegroundColor Yellow
    }
}

# Preguntar modo de despliegue
Write-Host ""
Write-Host "Selecciona el modo de despliegue:" -ForegroundColor Cyan
Write-Host "  1) Híbrido (recomendado) - Captura local + APIs en nube"
Write-Host "  2) 100% Local - Incluye Ollama para LLM local"
Write-Host "  3) Solo desarrollo - Sin Ollama"
Write-Host ""
$modo = Read-Host "Opción (1-3)"

switch ($modo) {
    "2" {
        Write-Host ""
        Write-Host "🚀 Iniciando en modo LOCAL (con Ollama)..." -ForegroundColor Green
        docker-compose --profile local up -d
    }
    "3" {
        Write-Host ""
        Write-Host "🚀 Iniciando en modo DESARROLLO..." -ForegroundColor Green
        docker-compose up -d backend frontend postgres redis
    }
    default {
        Write-Host ""
        Write-Host "🚀 Iniciando en modo HÍBRIDO..." -ForegroundColor Green
        docker-compose up -d backend frontend postgres redis
    }
}

# Esperar a que los servicios estén listos
Write-Host ""
Write-Host "⏳ Esperando a que los servicios estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Verificar estado
Write-Host ""
Write-Host "📊 Estado de los servicios:" -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ AIssistant está listo!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "🔌 API:       http://localhost:8000" -ForegroundColor White
Write-Host "📚 API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Para ver los logs: docker-compose logs -f" -ForegroundColor Gray
Write-Host "Para detener:      docker-compose down" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Cyan

