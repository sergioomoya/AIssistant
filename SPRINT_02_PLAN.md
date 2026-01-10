# 🚩 Sprint 02 - Resolución de Deuda Técnica y Mejora Continua

**ID del Sprint:** Sprint 02  
**Versión Objetivo:** v1.0.1  
**Fecha de Inicio:** 2026-01-08  
**Objetivo Principal:** Abordar los puntos de deuda técnica detectados en la retrospectiva en orden por criticidad

---

## 📋 ANÁLISIS INICIAL

### ✅ Estado del Repositorio

```bash
Branch: main
Estado: Clean (working tree clean)
Último commit: b35a58b - "docs: Añadir retrospectiva del Sprint 1"
Versión consolidada: v1.0.0 ✅
Versión actual en código: 1.0.1 ✅
```

### ✅ Verificación de Versión

- ✅ `backend/core/config.py`: `APP_VERSION = "1.0.1"`
- ✅ `backend/main.py`: Versión actualizada a "1.0.1"
- ✅ Tag `v1.0.0` creado y pusheado a GitHub

### ✅ Confirmación de Metodología

**Flujo de Trabajo:**
1. **Validar** → Analizar el problema y proponer solución
2. **Implementar** → Código siguiendo principios de código limpio
3. **Explicar** → Documentar cambios y justificaciones

**Principios a Seguir:**
- ✅ Código limpio y mantenible (Principio 1.1-1.4)
- ✅ Modularidad y separación de responsabilidades (Principio 2.1-2.4)
- ✅ Escalabilidad y abstracción (Principio 3.1-3.3)
- ✅ Gestión de versiones con Git (ramas y merge)
- ✅ Docker para todas las dependencias

---

## 🎯 TAREAS PRIORIZADAS POR CRITICIDAD

### 🔴 CRÍTICO (Sprint 02 - Obligatorio)

#### Tarea 1: Encriptación Real de API Keys
- **Ubicación:** `backend/api/endpoints/settings.py:194`
- **Problema:** Las API keys se guardan en texto plano en la base de datos
- **Impacto:** Riesgo de seguridad crítico si la BD es comprometida
- **Solución:** Usar `EncryptionService` existente para encriptar antes de guardar

#### Tarea 2: Clave Fernet Determinista
- **Ubicación:** `backend/api/endpoints/settings.py:93`
- **Problema:** Se genera una clave Fernet nueva cada vez (no determinista)
- **Impacto:** No se pueden desencriptar datos después de reiniciar
- **Solución:** Derivar clave de `SECRET_KEY` usando PBKDF2 (como en `EncryptionService`)

#### Tarea 3: Autenticación en WebSocket
- **Ubicación:** `backend/api/endpoints/tasks.py:31`
- **Problema:** WebSocket de tareas no valida autenticación
- **Impacto:** Cualquiera puede suscribirse a tareas de otros usuarios
- **Solución:** Implementar `get_current_user_ws` y validar en WebSocket

#### Tarea 4: Tests Unitarios Básicos
- **Problema:** No hay tests automatizados
- **Impacto:** Cambios pueden romper funcionalidad sin detectarse
- **Solución:** Añadir tests para endpoints críticos y tareas Celery

### 🟡 IMPORTANTE (Sprint 02 - Si hay tiempo)

#### Tarea 5: Parsing Robusto de Respuestas LLM
- **Ubicación:** `backend/features/summarization/llm_service_litellm.py`
- **Problema:** Parsing usa `split()` simple, frágil ante cambios de formato
- **Impacto:** Si el LLM cambia formato, se rompe
- **Solución:** Usar JSON mode de LiteLLM o parsing más robusto

#### Tarea 6: Validación de Modelos
- **Problema:** No se valida que el modelo seleccionado esté disponible
- **Impacto:** Errores en runtime si el modelo no existe
- **Solución:** Validar modelos disponibles al inicio y en la UI

#### Tarea 7: Limpieza de Archivos Temporales
- **Problema:** Archivos desencriptados temporales pueden acumularse
- **Impacto:** Consumo de disco
- **Solución:** Implementar limpieza automática con TTL

---

## 📊 PLAN DE EJECUCIÓN

### Fase 1: Seguridad Crítica (Tareas 1-3)
1. Refactorizar `encrypt_api_key()` para usar `EncryptionService`
2. Actualizar guardado de API keys para encriptar antes de persistir
3. Implementar autenticación WebSocket con JWT

### Fase 2: Calidad y Robustez (Tarea 4)
1. Configurar pytest y estructura de tests
2. Tests para endpoints críticos (auth, settings)
3. Tests para tareas Celery (mock de dependencias pesadas)

### Fase 3: Mejoras Importantes (Tareas 5-7)
1. Mejorar parsing LLM con JSON mode
2. Añadir validación de modelos
3. Implementar limpieza de archivos temporales

---

## ✅ CRITERIOS DE ACEPTACIÓN

### Tarea 1: Encriptación de API Keys
- [ ] API keys se encriptan antes de guardar en BD
- [ ] API keys se desencriptan al leer de BD
- [ ] No hay API keys en texto plano en la BD
- [ ] Tests verifican encriptación/desencriptación

### Tarea 2: Clave Fernet Determinista
- [ ] Clave se deriva de `SECRET_KEY` de forma determinista
- [ ] Datos encriptados se pueden desencriptar después de reiniciar
- [ ] Misma clave siempre produce mismo resultado
- [ ] Tests verifican determinismo

### Tarea 3: Autenticación WebSocket
- [ ] WebSocket valida token JWT antes de aceptar conexión
- [ ] Usuario solo puede suscribirse a sus propias tareas
- [ ] Errores de autenticación se manejan correctamente
- [ ] Tests verifican autenticación

### Tarea 4: Tests Unitarios
- [ ] Estructura de tests configurada (pytest)
- [ ] Tests para endpoints críticos (mínimo 5)
- [ ] Tests para tareas Celery (mínimo 2)
- [ ] Coverage mínimo del 60% en código crítico

---

## 📝 NOTAS DE IMPLEMENTACIÓN

### Estructura de Tests Propuesta

```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Fixtures compartidos
│   ├── test_auth.py         # Tests de autenticación
│   ├── test_settings.py     # Tests de configuración
│   ├── test_tasks.py        # Tests de tareas Celery
│   └── test_encryption.py   # Tests de encriptación
```

### Consideraciones Técnicas

1. **Encriptación:** Reutilizar `EncryptionService` existente, no crear nuevo servicio
2. **WebSocket Auth:** Usar query params o headers para token JWT
3. **Tests:** Mock de dependencias pesadas (Whisper, PyAnnote, LLMs)
4. **Validación Modelos:** Cachear lista de modelos disponibles al inicio

---

**Estado:** 🟢 Listo para comenzar  
**Siguiente Paso:** Iniciar Tarea 1 (Encriptación de API Keys)

