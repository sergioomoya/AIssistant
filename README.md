# 🎙️ AIssistant

**Asistente de Reuniones con Inteligencia Artificial**

AIssistant es una plataforma de asistente de reuniones de nueva generación que transforma conversaciones en inteligencia procesable, con un enfoque en la **privacidad por diseño** y el **control total del usuario**.

---

## ✨ Características Principales

### 🔇 Agente Silencioso
- Captura de audio a nivel de sistema (sin bots visibles en reuniones)
- Compatible con cualquier plataforma: Zoom, Teams, Meet, presencial
- Discreción total para mantener la naturalidad de las conversaciones

### 🔄 Flexibilidad de Despliegue

| Modo | Descripción |
|------|-------------|
| **100% Local** | Todo el procesamiento en tu dispositivo (Whisper + Ollama) |
| **Híbrido** | Captura local + APIs en la nube (OpenAI, Anthropic, Google) |
| **Nube Gestionada** | Solución SaaS completa para equipos |

### 📋 Ciclo de Vida Completo

**Pre-Reunión:**
- Integración con Google Calendar y Outlook
- Carga de documentos de contexto

**Durante la Reunión:**
- Transcripción en tiempo real (<300ms latencia)
- Identificación de oradores (Tú vs. Otros)
- Chat con IA en vivo

**Post-Reunión:**
- Resúmenes inteligentes
- Puntos clave y decisiones
- Elementos de acción automáticos
- Análisis de sentimiento
- Exportación a .docx/.txt

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose
- Git
- (Opcional) GPU NVIDIA para procesamiento local acelerado

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/aissistant.git
cd aissistant

# Copiar configuración de entorno
cp env.template .env

# Editar .env con tus configuraciones
# nano .env

# Iniciar en modo híbrido (por defecto)
docker-compose up -d

# O iniciar con Ollama para modo 100% local
docker-compose --profile local up -d
```

### Acceso

- **Frontend:** http://localhost:3000
- **API Backend:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## 🏗️ Arquitectura

```
aissistant/
├── backend/                 # API FastAPI + Python
│   ├── api/                 # Endpoints REST y WebSocket
│   ├── core/                # Configuración y seguridad
│   ├── features/            # Módulos por característica
│   │   ├── transcription/   # Motor de transcripción
│   │   ├── summarization/   # Generación de resúmenes
│   │   ├── meetings/        # Gestión de reuniones
│   │   └── integrations/    # CRM, calendarios, etc.
│   ├── models/              # Modelos de datos
│   └── utils/               # Utilidades
├── frontend/                # React + TypeScript + Vite
│   ├── src/
│   │   ├── features/        # Módulos por característica
│   │   ├── components/      # Componentes compartidos
│   │   ├── hooks/           # Hooks personalizados
│   │   └── utils/           # Utilidades
│   └── public/
├── desktop/                 # Agente de escritorio (Electron/Tauri)
└── docker-compose.yml
```

---

## 🔧 Configuración

### Modos de Despliegue

**Modo Local (máxima privacidad):**
```env
DEPLOYMENT_MODE=local
WHISPER_MODEL_SIZE=medium
OLLAMA_MODEL=llama3.2
```

**Modo Híbrido (recomendado):**
```env
DEPLOYMENT_MODE=hybrid
OPENAI_API_KEY=sk-xxx
WHISPER_MODEL_SIZE=base
```

### Integraciones Disponibles

- **CRM:** Salesforce, HubSpot, Zoho
- **Tareas:** Jira, Asana, Notion
- **Calendarios:** Google Calendar, Outlook
- **Automatización:** Webhooks, N8N, Zapier, Make

---

## 🔒 Seguridad y Privacidad

- ✅ Cifrado de datos en tránsito (HTTPS) y en reposo
- ✅ Redacción automática de PII (información personal)
- ✅ Panel de control de privacidad (GDPR/AEPD)
- ✅ Arquitectura preparada para SOC 2, GDPR, HIPAA
- ✅ Políticas de borrado automático configurables

---

## 🌍 Soporte Multilingüe

- Transcripción en 50+ idiomas
- Traducción en tiempo real (próximamente)

---

## 🛠️ Desarrollo

```bash
# Crear rama de desarrollo
git checkout -b feature/mi-caracteristica

# Levantar entorno de desarrollo
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Ejecutar tests
docker-compose exec backend pytest

# Hacer commit y merge
git add .
git commit -m "feat: mi nueva característica"
git checkout main
git merge feature/mi-caracteristica
```

---

## 📄 Licencia

Propietario - Todos los derechos reservados.

---

## 🤝 Contribución

Por favor, lee [CONTRIBUTING.md](CONTRIBUTING.md) para detalles sobre nuestro código de conducta y el proceso para enviar pull requests.

