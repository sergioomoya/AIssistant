# 🚩 Sprint 03 - AIssistant Completamente Operativo

**ID del Sprint:** Sprint 03  
**Versión Inicial:** v1.1.0  
**Versión Objetivo:** v2.0.0  
**Fecha de Inicio:** 2026-01-10  
**Objetivo Principal:** Hacer completamente operativa la herramienta eliminando datos demo e implementando todas las funcionalidades core: grabación, transcripción, resumen e integración con calendarios.

---

## 📋 ANÁLISIS INICIAL

### ✅ Estado del Repositorio

```bash
Branch: main
Estado: Clean (working tree clean)
Último commit: e763584 - "docs: organizar documentacion de sprints en docs/sprints/"
Versión consolidada: v1.1.0 ✅
```

### ⚠️ Inconsistencia Detectada

| Archivo | Versión Actual | Versión Esperada |
|---------|----------------|------------------|
| `frontend/package.json` | 1.0.0 | 1.1.0 |

**Acción requerida:** Actualizar versión en `package.json` al inicio del sprint.

### ✅ Confirmación de Metodología

**Flujo de Trabajo Confirmado:**
1. **Propuesta** → Analizar requisito y proponer solución técnica
2. **Aprobación** → Esperar confirmación del usuario
3. **Implementación** → Código siguiendo principios de código limpio
4. **Explicación** → Documentar cambios y justificaciones

**Principios Confirmados:**
- ✅ PROHIBIDO instalar dependencias en local → Solo Docker
- ✅ PROHIBIDO desarrollar en `main` → Usar ramas `feat/` o `fix/`
- ✅ Código limpio y mantenible
- ✅ Tipado estricto (TypeScript)
- ✅ Separación de lógica UI vs negocio

---

## 🎯 DESGLOSE DE TAREAS TÉCNICAS

### ÉPICA 1: Integración con Calendarios (Fase Pre-Reunión)

#### Tarea 1.1: OAuth 2.0 con Google Calendar
- **Descripción:** Implementar flujo OAuth para conectar cuenta de Google y obtener eventos del calendario
- **Componentes Backend:**
  - Endpoint `/api/oauth/google/authorize` - Iniciar flujo OAuth
  - Endpoint `/api/oauth/google/callback` - Recibir token
  - Servicio `GoogleCalendarService` para sincronizar eventos
- **Componentes Frontend:**
  - Botón "Conectar Google Calendar" en Settings
  - Vista de calendarios conectados
- **Dependencias:** `google-auth-oauthlib`, `google-api-python-client`
- **Prioridad:** 🔴 Crítica

#### Tarea 1.2: OAuth 2.0 con Microsoft Outlook (Graph API)
- **Descripción:** Implementar flujo OAuth para conectar cuenta Microsoft y obtener eventos de Outlook
- **Componentes Backend:**
  - Endpoint `/api/oauth/microsoft/authorize` - Iniciar flujo OAuth
  - Endpoint `/api/oauth/microsoft/callback` - Recibir token
  - Servicio `MicrosoftCalendarService` para sincronizar eventos
- **Componentes Frontend:**
  - Botón "Conectar Outlook Calendar" en Settings
- **Dependencias:** `msal`, `msgraph-sdk`
- **Prioridad:** 🔴 Crítica

#### Tarea 1.3: Sincronización Automática de Reuniones
- **Descripción:** Crear tarea Celery que sincronice eventos de calendario periódicamente
- **Componentes:**
  - Tarea `sync_calendar_events` que corre cada 15 minutos
  - Modelo `CalendarEvent` para almacenar eventos
  - Auto-creación de `Meeting` cuando inicia un evento
- **Prioridad:** 🟡 Importante

---

### ÉPICA 2: Captura de Audio Real (Fase Durante la Reunión)

#### Tarea 2.1: Captura de Audio del Sistema (Agente Silencioso)
- **Descripción:** Implementar captura de audio desde el navegador usando Web Audio API
- **Componentes Frontend:**
  - Hook `useSystemAudioCapture` - Captura audio del sistema/micrófono
  - Integración con `getDisplayMedia()` para captura de pantalla+audio
  - Streaming de chunks de audio al backend vía WebSocket
- **Nota Técnica:** Para v1 web, usaremos `getDisplayMedia` + `getUserMedia`. La app nativa desktop (fuera de scope) permitiría captura directa del sistema.
- **Prioridad:** 🔴 Crítica

#### Tarea 2.2: Endpoint de Recepción de Audio
- **Descripción:** WebSocket que recibe chunks de audio y los procesa
- **Componentes Backend:**
  - WebSocket `/ws/audio/{meeting_id}` - Recibe chunks de audio
  - Buffer de audio con flush cada N segundos
  - Guardado temporal de archivos de audio encriptados
- **Prioridad:** 🔴 Crítica

#### Tarea 2.3: Pipeline de Transcripción en Tiempo Real
- **Descripción:** Procesar audio con Whisper y enviar transcripción en tiempo real
- **Componentes Backend:**
  - Integración con Whisper (local) o Deepgram (API) según configuración
  - WebSocket `/ws/transcription/{meeting_id}` - Envía transcripción en vivo
  - Latencia objetivo: <2 segundos para chunks de 5 segundos
- **Prioridad:** 🔴 Crítica

---

### ÉPICA 3: Diarización y Etiquetado de Oradores

#### Tarea 3.1: Implementar Diarización con PyAnnote
- **Descripción:** Distinguir entre diferentes voces en la grabación
- **Componentes Backend:**
  - Servicio `DiarizationService` usando PyAnnote Audio
  - Asignación de speakers: "Yo" (micrófono) vs "Otros" (sistema)
- **Nota:** Ya existe `backend/features/transcription/diarization.py`, revisar y completar
- **Prioridad:** 🟡 Importante

#### Tarea 3.2: UI de Transcripción con Speakers
- **Descripción:** Mostrar transcripción en tiempo real con etiquetas de speaker
- **Componentes Frontend:**
  - Componente `TranscriptView` con colores por speaker
  - Auto-scroll y resaltado del texto actual
- **Prioridad:** 🟡 Importante

---

### ÉPICA 4: Procesamiento Post-Reunión (Salidas IA)

#### Tarea 4.1: Generación de Resumen Inteligente
- **Descripción:** Al finalizar reunión, generar resumen ejecutivo
- **Componentes Backend:**
  - Usar `LiteLLMService` existente con prompt optimizado
  - Modelo de datos `MeetingSummary` 
- **Prioridad:** 🔴 Crítica

#### Tarea 4.2: Extracción de Puntos Clave y Decisiones
- **Descripción:** Extraer bullet points con decisiones importantes
- **Componentes Backend:**
  - Prompt especializado para extracción de decisiones
  - Modelo `KeyPoint` relacionado con `Meeting`
- **Prioridad:** 🔴 Crítica

#### Tarea 4.3: Extracción de Elementos de Acción (Action Items)
- **Descripción:** Identificar tareas, responsables y fechas mencionadas
- **Componentes Backend:**
  - Modelo `ActionItem` ya existe, verificar campos
  - Prompt para extracción estructurada de acciones
- **Prioridad:** 🔴 Crítica

#### Tarea 4.4: Análisis de Sentimiento
- **Descripción:** Evaluar tono general de la reunión
- **Componentes Backend:**
  - Campo `sentiment` en modelo `Meeting` (positivo/neutro/negativo)
  - Prompt para análisis de sentimiento
- **Prioridad:** 🟢 Deseable

---

### ÉPICA 5: Eliminar Datos Demo y Conectar Todo

#### Tarea 5.1: Limpiar Datos Mock del Frontend
- **Descripción:** Eliminar todos los datos hardcodeados y conectar con API real
- **Archivos a revisar:**
  - `MeetingsList.tsx` - Conectar con `/api/meetings`
  - `MeetingDetail.tsx` - Conectar con `/api/meetings/{id}`
  - `Dashboard.tsx` - Conectar con endpoints de estadísticas
- **Prioridad:** 🔴 Crítica

#### Tarea 5.2: Flujo Completo End-to-End
- **Descripción:** Verificar que el flujo completo funciona:
  1. Usuario conecta calendario
  2. Aparece reunión programada
  3. Usuario inicia grabación
  4. Audio se captura y transcribe en tiempo real
  5. Al finalizar, se genera resumen automático
  6. Usuario puede ver, editar y exportar
- **Prioridad:** 🔴 Crítica

---

## 📊 PLAN DE EJECUCIÓN POR FASES

### Fase 1: Infraestructura de Calendarios (Tareas 1.1 - 1.3)
**Rama:** `feat/calendar-integration`
**Estimación:** 2-3 sesiones de trabajo

### Fase 2: Captura y Transcripción (Tareas 2.1 - 2.3)
**Rama:** `feat/audio-capture`
**Estimación:** 3-4 sesiones de trabajo

### Fase 3: Diarización (Tareas 3.1 - 3.2)
**Rama:** `feat/speaker-diarization`
**Estimación:** 1-2 sesiones de trabajo

### Fase 4: Procesamiento IA (Tareas 4.1 - 4.4)
**Rama:** `feat/ai-processing`
**Estimación:** 2-3 sesiones de trabajo

### Fase 5: Integración y Limpieza (Tareas 5.1 - 5.2)
**Rama:** `feat/end-to-end`
**Estimación:** 1-2 sesiones de trabajo

---

## ✅ CRITERIOS DE ACEPTACIÓN

### CA-1: Integración con Google Calendar
- [ ] Usuario puede autorizar AIssistant para acceder a su Google Calendar
- [ ] Las reuniones programadas aparecen automáticamente en el Dashboard
- [ ] El token se almacena de forma segura (encriptado)
- [ ] Se puede desconectar la cuenta en cualquier momento

### CA-2: Integración con Outlook Calendar
- [ ] Usuario puede autorizar AIssistant para acceder a su Outlook
- [ ] Las reuniones de Outlook aparecen junto a las de Google (si ambas conectadas)
- [ ] Mismo nivel de seguridad que Google

### CA-3: Captura de Audio Funcional
- [ ] Usuario puede iniciar grabación desde la UI
- [ ] Se captura audio del sistema (pantalla compartida) y micrófono
- [ ] El audio se transmite al backend en tiempo real
- [ ] Indicador visual de que está grabando

### CA-4: Transcripción en Tiempo Real
- [ ] El texto aparece en pantalla mientras se habla
- [ ] Latencia máxima de 3 segundos
- [ ] Se distinguen diferentes speakers (al menos "Yo" vs "Otros")

### CA-5: Procesamiento Post-Reunión
- [ ] Al finalizar, se genera automáticamente:
  - Resumen ejecutivo
  - Lista de puntos clave
  - Action items con responsables
- [ ] El usuario puede editar cualquier salida generada

### CA-6: Cero Datos Demo
- [ ] No hay datos hardcodeados en el frontend
- [ ] Todas las vistas se alimentan de la API real
- [ ] Un usuario nuevo ve la aplicación vacía hasta que crea contenido

### CA-7: Flujo End-to-End Completo
- [ ] Se puede completar el ciclo completo:
  Conectar calendario → Ver reunión → Grabar → Transcribir → Resumir → Exportar

---

## 🔧 DEPENDENCIAS A AÑADIR (Docker)

### Backend (requirements.txt)
```
# Calendarios
google-auth-oauthlib>=1.2.0
google-api-python-client>=2.100.0
msal>=1.24.0
msgraph-sdk>=1.0.0

# Audio (si no están)
pyannote.audio>=3.1.0
soundfile>=0.12.0
```

### Frontend (package.json)
```json
{
  "dependencies": {
    "@microsoft/microsoft-graph-client": "^3.0.0"
  }
}
```

---

## 📝 NOTAS Y CONSIDERACIONES

### Limitaciones de la Versión Web
- La captura de audio del sistema en navegador requiere que el usuario comparta pantalla con audio
- Para una experiencia "Agente Silencioso" real, se necesitaría app Electron/Tauri (fuera de scope Sprint 03)
- Solución temporal: UI clara que guíe al usuario a compartir pantalla con audio

### Variables de Entorno Necesarias
```env
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Microsoft OAuth
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=
MICROSOFT_REDIRECT_URI=
```

### Riesgos Identificados
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Complejidad de OAuth | Alta | Medio | Usar librerías oficiales, seguir docs |
| Latencia de transcripción | Media | Alto | Usar Deepgram para tiempo real, Whisper para post-proceso |
| Limitaciones browser audio | Alta | Medio | Documentar claramente el flujo de compartir pantalla |

---

## 🚦 ESTADO INICIAL

**Estado:** 🟢 Listo para comenzar  
**Siguiente Paso:** Crear rama `feat/calendar-integration` e iniciar Tarea 1.1  
**Bloqueadores:** Ninguno identificado

---

**Creado:** 2026-01-10  
**Autor:** Sistema de Planificación de Sprints

