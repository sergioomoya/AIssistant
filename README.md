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
- Configuración de API keys desde la interfaz

**Durante la Reunión:**
- Transcripción en tiempo real (<300ms latencia)
- Identificación de oradores (Diarización con PyAnnote)
- Chat con IA en vivo
- Visualización de audio en tiempo real

**Post-Reunión:**
- Resúmenes inteligentes con LiteLLM (soporte para múltiples modelos)
- Puntos clave y decisiones
- Elementos de acción automáticos
- Análisis de sentimiento
- Redacción automática de PII (Presidio)
- Exportación a .docx/.txt/.md
- Seguimiento de progreso en tiempo real vía WebSockets

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose
- Git
- (Opcional) GPU NVIDIA para procesamiento local acelerado
- (Opcional) Token de HuggingFace para diarización de hablantes

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/sergioomoya/AIssistant.git
cd AIssistant

# Copiar configuración de entorno
cp env.template .env

# Editar .env con tus configuraciones (opcional)
# Las API keys se pueden configurar desde la interfaz web

# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### Acceso

- **Frontend:** http://localhost:5173
- **API Backend:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/docs
- **API Docs (ReDoc):** http://localhost:8000/redoc

### Primer Uso

1. Accede a http://localhost:5173
2. Regístrate o inicia sesión con Google OAuth
3. Completa el onboarding para configurar:
   - Modo de despliegue (Local/Híbrido/Nube)
   - API Keys (OpenAI, Anthropic, Google, Deepgram, HuggingFace)
   - Modelos preferidos (Whisper y LLM)
4. ¡Comienza a crear reuniones!

---

## 🏗️ Arquitectura

### Estructura del Proyecto

```
AIssistant/
├── backend/                    # API FastAPI + Python
│   ├── api/                    # Endpoints REST y WebSocket
│   │   ├── endpoints/
│   │   │   ├── auth.py         # Autenticación JWT
│   │   │   ├── oauth.py        # OAuth Google
│   │   │   ├── meetings.py     # Gestión de reuniones
│   │   │   ├── transcription.py # Transcripción de audio
│   │   │   ├── summarization.py # Resúmenes con IA
│   │   │   ├── settings.py     # Configuración de usuario
│   │   │   ├── tasks.py        # WebSocket para estado de tareas
│   │   │   └── export.py        # Exportación de documentos
│   │   └── router.py            # Router principal
│   ├── core/                   # Configuración y seguridad
│   │   ├── config.py           # Configuración de la aplicación
│   │   ├── database.py         # Conexión a PostgreSQL
│   │   ├── security.py         # JWT y encriptación
│   │   └── celery_app.py       # Configuración de Celery
│   ├── features/               # Módulos por característica
│   │   ├── transcription/      # Motor de transcripción
│   │   │   ├── whisper_engine.py    # Faster-Whisper
│   │   │   ├── diarization.py       # PyAnnote (identificación de hablantes)
│   │   │   ├── tasks.py             # Tareas Celery de transcripción
│   │   │   └── realtime_transcriber.py # Transcripción en tiempo real
│   │   ├── summarization/     # Generación de resúmenes
│   │   │   ├── llm_service_litellm.py # LiteLLM (abstracción de LLMs)
│   │   │   ├── prompts.py            # Prompts por perfil de usuario
│   │   │   └── tasks.py              # Tareas Celery de resumen
│   │   ├── meetings/          # Gestión de reuniones
│   │   │   └── tasks.py        # Orquestación de tareas asíncronas
│   │   ├── privacy/            # Privacidad y seguridad
│   │   │   ├── pii_scrubber.py # Redacción de PII (Presidio)
│   │   │   └── encryption.py   # Encriptación AES-256
│   │   └── export/             # Exportación de documentos
│   ├── models/                 # Modelos SQLAlchemy
│   │   ├── user.py             # Usuario
│   │   ├── meeting.py          # Reunión
│   │   ├── transcript.py        # Transcripción
│   │   └── action_item.py      # Elementos de acción
│   └── main.py                 # Punto de entrada FastAPI
├── frontend/                   # React + TypeScript + Vite
│   ├── src/
│   │   ├── features/           # Módulos por característica
│   │   │   ├── auth/          # Autenticación
│   │   │   ├── onboarding/    # Configuración inicial
│   │   │   ├── meetings/      # Gestión de reuniones
│   │   │   ├── dashboard/     # Panel principal
│   │   │   └── settings/      # Configuración
│   │   ├── components/        # Componentes compartidos
│   │   │   ├── layouts/       # Layouts de página
│   │   │   ├── navigation/    # Navegación
│   │   │   └── tasks/         # Componentes de tareas
│   │   ├── hooks/             # Hooks personalizados
│   │   │   ├── useAudioCapture.ts    # Captura de audio
│   │   │   ├── useTranscriptionSocket.ts # WebSocket de transcripción
│   │   │   ├── useTaskStatus.ts      # Estado de tareas
│   │   │   └── useWaveform.ts        # Visualización de audio
│   │   ├── stores/            # Zustand stores
│   │   │   ├── authStore.ts   # Estado de autenticación
│   │   │   └── meetingStore.ts # Estado de reuniones
│   │   └── utils/             # Utilidades
│   └── package.json
├── docker-compose.yml          # Orquestación de servicios
├── env.template                # Plantilla de variables de entorno
└── README.md                   # Este archivo
```

### Arquitectura Asíncrona

AIssistant utiliza una arquitectura asíncrona basada en **Celery** y **Redis** para procesar tareas pesadas sin bloquear el servidor:

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │ HTTP/WebSocket
       ▼
┌─────────────┐      ┌─────────────┐
│   FastAPI   │─────▶│    Redis    │
│   Backend   │      │   (Queue)   │
└──────┬──────┘      └──────┬──────┘
       │                     │
       │                     ▼
       │              ┌─────────────┐
       │              │   Celery    │
       │              │   Worker    │
       │              └──────┬──────┘
       │                     │
       ▼                     ▼
┌─────────────┐      ┌─────────────┐
│ PostgreSQL  │      │  Whisper/   │
│  Database   │      │  PyAnnote/  │
└─────────────┘      │   LiteLLM   │
                     └─────────────┘
```

**Flujo de Procesamiento:**
1. Usuario sube archivo de audio → FastAPI recibe y valida
2. FastAPI crea tarea Celery → Redis almacena la tarea
3. Celery Worker procesa:
   - Desencripta audio (si está encriptado)
   - Transcribe con Faster-Whisper
   - Diariza con PyAnnote (identifica hablantes)
   - Redacta PII con Presidio (si está habilitado)
   - Genera resumen con LiteLLM
4. Worker publica actualizaciones → Redis Pub/Sub → WebSocket → Frontend
5. Frontend muestra progreso en tiempo real

---

## 🔧 Configuración

### Variables de Entorno

Copia `env.template` a `.env` y configura:

```env
# Modo de despliegue
DEPLOYMENT_MODE=hybrid  # local | hybrid | cloud

# Modelo de Whisper
WHISPER_MODEL_SIZE=base  # tiny | base | small | medium | large | large-v3

# Seguridad
SECRET_KEY=tu-clave-secreta-de-32-caracteres

# Base de datos
DATABASE_URL=postgresql://aissistant:aissistant_secret@postgres:5432/aissistant_db

# Redis
REDIS_URL=redis://redis:6379/0

# OAuth Google (opcional)
GOOGLE_CLIENT_ID=tu-client-id
GOOGLE_CLIENT_SECRET=tu-client-secret

# Ollama (solo modo local)
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=llama3.2

# Frontend
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

**Nota:** Las API keys (OpenAI, Anthropic, Google, Deepgram, HuggingFace) se pueden configurar desde la interfaz web en lugar de usar variables de entorno.

### Modos de Despliegue

**Modo Local (máxima privacidad):**
- Todo el procesamiento en tu dispositivo
- Requiere: Ollama instalado y ejecutándose
- No requiere API keys externas
- Más lento pero 100% privado

**Modo Híbrido (recomendado):**
- Captura local + procesamiento en nube
- Requiere: Al menos una API key (OpenAI, Anthropic, o Google)
- Balance entre privacidad y rendimiento

**Modo Nube:**
- Todo el procesamiento en servidores
- Máxima velocidad y escalabilidad
- Requiere: API keys configuradas

### Configuración de HuggingFace (Diarización)

Para habilitar la identificación de hablantes:

1. Obtén un token en: https://huggingface.co/settings/tokens
2. Configúralo desde la interfaz web (Settings → API Keys)
3. O añádelo al `.env`: `HF_TOKEN=tu-token`

---

## 🔒 Seguridad y Privacidad

### Características de Seguridad

- ✅ **Autenticación JWT** con tokens de acceso y refresh
- ✅ **OAuth 2.0** con Google (otros proveedores próximamente)
- ✅ **Encriptación AES-256** para archivos de audio en reposo
- ✅ **Redacción automática de PII** con Microsoft Presidio:
  - DNI/NIE/NIF
  - Emails
  - Teléfonos
  - Tarjetas de crédito
  - Direcciones
  - Nombres de personas
- ✅ **HTTPS** en producción (configurar en proxy reverso)
- ✅ **CORS** configurado para dominios permitidos
- ✅ **Validación de entrada** con Pydantic
- ✅ **SQL Injection** protegido (SQLAlchemy ORM)

### Privacidad

- **Datos del usuario:** Almacenados en PostgreSQL encriptado
- **Archivos de audio:** Encriptados con AES-256 antes de guardar
- **API Keys:** Almacenadas encriptadas en la base de datos
- **PII Redaction:** Opcional, se puede habilitar por usuario
- **Borrado automático:** Configurable por usuario (horas)

---

## 🛠️ Desarrollo

### Requisitos

- Python 3.11+
- Node.js 18+
- Docker y Docker Compose
- PostgreSQL 15+ (o usar Docker)
- Redis 7+ (o usar Docker)

### Configuración del Entorno de Desarrollo

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Ejecutar en Desarrollo

```bash
# Backend
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm run dev

# Worker Celery (en otra terminal)
cd backend
celery -A core.celery_app worker --loglevel=info

# Redis (si no usas Docker)
redis-server
```

### Estructura de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: nueva característica
fix: corrección de bug
docs: cambios en documentación
style: formato, punto y coma, etc.
refactor: refactorización de código
test: añadir tests
chore: mantenimiento
```

### Tests

```bash
# Backend
docker-compose exec backend pytest

# Frontend
cd frontend
npm run test
```

---

## 📚 API Documentation

### Endpoints Principales

#### Autenticación
- `POST /api/v1/auth/register` - Registro de usuario
- `POST /api/v1/auth/login` - Inicio de sesión
- `POST /api/v1/auth/refresh` - Refrescar token
- `GET /api/v1/oauth/google/auth-url` - URL de autenticación Google
- `POST /api/v1/oauth/google/callback` - Callback OAuth Google

#### Reuniones
- `GET /api/v1/meetings` - Listar reuniones
- `POST /api/v1/meetings` - Crear reunión
- `GET /api/v1/meetings/{id}` - Obtener reunión
- `DELETE /api/v1/meetings/{id}` - Eliminar reunión

#### Transcripción
- `POST /api/v1/transcription/upload/{meeting_id}` - Subir audio
- `GET /api/v1/transcription/{meeting_id}` - Obtener transcripción
- `WebSocket /api/v1/ws/transcription/{meeting_id}` - Transcripción en tiempo real

#### Resúmenes
- `POST /api/v1/summarization/{meeting_id}/generate` - Generar resumen
- `GET /api/v1/summarization/{meeting_id}/action-items` - Obtener action items

#### Configuración
- `GET /api/v1/settings` - Obtener configuración
- `PATCH /api/v1/settings/deployment-mode` - Cambiar modo
- `PATCH /api/v1/settings/api-keys` - Actualizar API keys
- `PATCH /api/v1/settings/privacy` - Configuración de privacidad

#### Tareas
- `WebSocket /api/v1/ws/tasks/{task_id}` - Estado de tarea en tiempo real

### Documentación Interactiva

Accede a la documentación interactiva en:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## 🧩 Tecnologías Utilizadas

### Backend
- **FastAPI** - Framework web moderno y rápido
- **SQLAlchemy** - ORM para PostgreSQL
- **Celery** - Tareas asíncronas
- **Redis** - Cola de mensajes y cache
- **Faster-Whisper** - Transcripción de audio optimizada
- **PyAnnote.audio** - Diarización de hablantes
- **LiteLLM** - Abstracción para múltiples LLMs
- **Presidio** - Redacción de información personal
- **Cryptography** - Encriptación AES-256
- **Pydantic** - Validación de datos
- **JWT** - Autenticación

### Frontend
- **React 18** - Biblioteca UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool rápido
- **Zustand** - Gestión de estado
- **React Query** - Gestión de datos del servidor
- **Framer Motion** - Animaciones
- **Tailwind CSS** - Estilos
- **Wavesurfer.js** - Visualización de audio
- **Axios** - Cliente HTTP

### Infraestructura
- **Docker** - Contenedores
- **Docker Compose** - Orquestación
- **PostgreSQL** - Base de datos
- **Redis** - Cache y cola
- **Nginx** (opcional) - Proxy reverso

---

## 🐛 Troubleshooting

### El worker de Celery no procesa tareas

```bash
# Verificar que Redis está corriendo
docker-compose ps redis

# Ver logs del worker
docker-compose logs -f worker

# Reiniciar worker
docker-compose restart worker
```

### Error de conexión a la base de datos

```bash
# Verificar que PostgreSQL está corriendo
docker-compose ps postgres

# Ver logs
docker-compose logs postgres

# Reiniciar base de datos
docker-compose restart postgres
```

### El frontend no se conecta al backend

1. Verifica que `VITE_API_URL` en `.env` apunta a `http://localhost:8000`
2. Verifica que el backend está corriendo en el puerto 8000
3. Revisa la consola del navegador para errores CORS

### La diarización no funciona

1. Verifica que tienes un token de HuggingFace configurado
2. Verifica que el token tiene permisos para acceder a modelos de PyAnnote
3. Revisa los logs del worker para errores específicos

---

## 📄 Licencia

Propietario - Todos los derechos reservados.

---

## 🤝 Contribución

Este es un proyecto privado. Para contribuir, contacta con el mantenedor del proyecto.

---

## 📞 Soporte

Para reportar bugs o solicitar características, abre un issue en el repositorio de GitHub.

---

**Versión:** 1.0.0  
**Última actualización:** Enero 2026
