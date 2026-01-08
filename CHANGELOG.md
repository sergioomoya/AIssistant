# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-08

### ✨ Añadido

#### Backend
- **Arquitectura asíncrona** con Celery y Redis para procesamiento de tareas
- **Faster-Whisper** para transcripción optimizada de audio
- **PyAnnote.audio** para diarización de hablantes (identificación de oradores)
- **LiteLLM** para abstracción unificada de múltiples LLMs (OpenAI, Anthropic, Google, Ollama)
- **Microsoft Presidio** para redacción automática de información personal (PII)
- **Encriptación AES-256** para archivos de audio en reposo
- **WebSockets** para actualizaciones de estado de tareas en tiempo real
- **OAuth 2.0** con Google para autenticación
- **Sistema de configuración dinámica** desde la interfaz web
- **Prompts personalizados** por perfil de usuario (Sales, Technical, Management)
- **Sistema de exportación** a múltiples formatos (DOCX, TXT, MD)

#### Frontend
- **Onboarding completo** para configuración inicial
- **Gestión de API keys** desde la interfaz
- **Visualización de progreso** de tareas en tiempo real
- **Componente TaskProgress** para seguimiento de procesamiento
- **Hooks personalizados**:
  - `useWaveform` para visualización de audio
  - `useTaskStatus` para estado de tareas vía WebSocket
  - `useAudioCapture` para captura de audio
  - `useTranscriptionSocket` para transcripción en tiempo real
- **Integración con Google OAuth**
- **Interfaz moderna** con Tailwind CSS y Framer Motion

#### Infraestructura
- **Docker Compose** con todos los servicios
- **Worker de Celery** para procesamiento asíncrono
- **Redis** para cola de mensajes y cache
- **PostgreSQL** para persistencia de datos
- **Volúmenes persistentes** para modelos de Whisper

### 🔧 Cambiado

- Refactorización completa de endpoints para usar arquitectura asíncrona
- Migración de procesamiento síncrono a tareas Celery
- Actualización de dependencias a versiones estables

### 🔒 Seguridad

- Encriptación de archivos de audio antes de guardar
- Redacción automática de PII antes de enviar a LLMs externos
- Almacenamiento encriptado de API keys en base de datos
- Validación de entrada con Pydantic
- Protección contra SQL Injection con SQLAlchemy ORM

### 📚 Documentación

- README.md completo con arquitectura y guías
- CONTRIBUTING.md con guía de contribución
- CHANGELOG.md para seguimiento de versiones
- Docstrings en todas las funciones y clases públicas
- Documentación de API con Swagger/ReDoc

---

## [Unreleased]

### Planificado

- Integración con Microsoft Teams
- Integración con Zoom
- Integración con Google Calendar
- Integración con Outlook Calendar
- Exportación a CRM (Salesforce, HubSpot)
- Integración con Jira para action items
- Modo desktop (Electron/Tauri)
- Soporte para múltiples idiomas en la UI
- Dashboard de analytics
- Compartir reuniones con otros usuarios
- Notificaciones push
- Modo offline completo

---

## Formato de Versiones

- **MAJOR**: Cambios incompatibles en la API
- **MINOR**: Nuevas funcionalidades compatibles hacia atrás
- **PATCH**: Correcciones de bugs compatibles hacia atrás

