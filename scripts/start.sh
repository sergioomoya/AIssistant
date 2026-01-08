#!/bin/bash
# ===========================================
# AIssistant - Script de Inicio (Linux/macOS)
# ===========================================

echo "🎙️ AIssistant - Asistente de Reuniones con IA"
echo "============================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado. Por favor, instala Docker.${NC}"
    exit 1
fi

# Verificar si Docker está corriendo
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker no está corriendo. Por favor, inicia Docker.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker detectado y funcionando${NC}"

# Copiar archivo de configuración si no existe
if [ ! -f ".env" ] && [ -f "env.template" ]; then
    cp env.template .env
    echo -e "${YELLOW}📝 Archivo .env creado desde template${NC}"
    echo -e "${YELLOW}   Edita .env para configurar tus API keys${NC}"
fi

# Preguntar modo de despliegue
echo ""
echo -e "${CYAN}Selecciona el modo de despliegue:${NC}"
echo "  1) Híbrido (recomendado) - Captura local + APIs en nube"
echo "  2) 100% Local - Incluye Ollama para LLM local"
echo "  3) Solo desarrollo - Sin Ollama"
echo ""
read -p "Opción (1-3): " modo

case $modo in
    2)
        echo ""
        echo -e "${GREEN}🚀 Iniciando en modo LOCAL (con Ollama)...${NC}"
        docker-compose --profile local up -d
        ;;
    3)
        echo ""
        echo -e "${GREEN}🚀 Iniciando en modo DESARROLLO...${NC}"
        docker-compose up -d backend frontend postgres redis
        ;;
    *)
        echo ""
        echo -e "${GREEN}🚀 Iniciando en modo HÍBRIDO...${NC}"
        docker-compose up -d backend frontend postgres redis
        ;;
esac

# Esperar a que los servicios estén listos
echo ""
echo -e "${YELLOW}⏳ Esperando a que los servicios estén listos...${NC}"
sleep 10

# Verificar estado
echo ""
echo -e "${CYAN}📊 Estado de los servicios:${NC}"
docker-compose ps

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}✅ AIssistant está listo!${NC}"
echo ""
echo -e "🌐 Frontend:  http://localhost:3000"
echo -e "🔌 API:       http://localhost:8000"
echo -e "📚 API Docs:  http://localhost:8000/docs"
echo ""
echo -e "Para ver los logs: docker-compose logs -f"
echo -e "Para detener:      docker-compose down"
echo -e "${CYAN}============================================${NC}"

