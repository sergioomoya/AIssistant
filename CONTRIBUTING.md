# Guía de Contribución a AIssistant

Gracias por tu interés en contribuir a AIssistant. Esta guía te ayudará a entender cómo contribuir al proyecto.

## 🎯 Filosofía del Proyecto

AIssistant sigue el **Manifiesto del Artesano de Software**:

- **Código Limpio**: Legibilidad y mantenibilidad son prioritarias
- **Modularidad**: Alta cohesión, bajo acoplamiento
- **Escalabilidad**: Pensar en el futuro, no solo en el presente
- **Separación de Responsabilidades**: Cada módulo tiene un propósito claro

## 📋 Antes de Contribuir

1. **Revisa el README.md** para entender la arquitectura
2. **Lee las especificaciones** en `Informe de Especificaciones para Prototipado AIssistant.txt`
3. **Asegúrate de que tu entorno de desarrollo esté configurado**

## 🔀 Flujo de Trabajo

### 1. Crear una Rama

```bash
# Crear rama desde main
git checkout main
git pull origin main
git checkout -b feature/mi-caracteristica
# o
git checkout -b fix/correccion-bug
```

### 2. Desarrollo

- **Sigue las convenciones de código** (ver abajo)
- **Escribe tests** para nuevas funcionalidades
- **Actualiza la documentación** si es necesario
- **Mantén los commits pequeños y atómicos**

### 3. Commit

Usa [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: añadir nueva característica
fix: corregir bug
docs: actualizar documentación
style: formato de código
refactor: refactorizar sin cambiar funcionalidad
test: añadir o modificar tests
chore: tareas de mantenimiento
```

Ejemplos:
```bash
git commit -m "feat: añadir soporte para Microsoft Teams"
git commit -m "fix: corregir error en diarización de hablantes"
git commit -m "docs: actualizar README con nuevas características"
```

### 4. Push y Pull Request

```bash
git push origin feature/mi-caracteristica
```

Luego crea un Pull Request en GitHub con:
- Descripción clara de los cambios
- Referencias a issues relacionados (si los hay)
- Screenshots (si aplica)

## 📝 Convenciones de Código

### Python (Backend)

- **PEP 8** para estilo de código
- **Type hints** en todas las funciones
- **Docstrings** en todas las clases y funciones públicas
- **Nombres descriptivos**: `get_user_by_email()` no `get_user()`

Ejemplo:
```python
def transcribe_audio(
    audio_path: str,
    language: Optional[str] = None
) -> Dict[str, Any]:
    """
    Transcribir archivo de audio usando Whisper.
    
    Args:
        audio_path: Ruta al archivo de audio
        language: Código de idioma (ISO 639-1) o None para auto-detectar
        
    Returns:
        Dict con 'text', 'segments', 'language', 'duration'
        
    Raises:
        FileNotFoundError: Si el archivo no existe
        ValueError: Si el formato de audio no es soportado
    """
    ...
```

### TypeScript/React (Frontend)

- **ESLint** y **Prettier** configurados
- **TypeScript estricto**: No usar `any` a menos que sea necesario
- **Componentes funcionales** con hooks
- **Nombres descriptivos**: `MeetingDetailCard` no `Card`

Ejemplo:
```typescript
interface MeetingDetailProps {
  meetingId: number
  onUpdate?: (meeting: Meeting) => void
}

/**
 * Componente para mostrar el detalle de una reunión.
 * Incluye transcripción, resumen y elementos de acción.
 */
export default function MeetingDetail({ 
  meetingId, 
  onUpdate 
}: MeetingDetailProps) {
  ...
}
```

## 🏗️ Estructura de Archivos

### Backend

```
backend/
├── api/endpoints/        # Endpoints REST (un archivo por recurso)
├── core/                # Configuración, seguridad, base de datos
├── features/            # Módulos por característica
│   ├── transcription/   # Todo relacionado con transcripción
│   ├── summarization/   # Todo relacionado con resúmenes
│   └── ...
├── models/             # Modelos de base de datos
└── utils/              # Utilidades compartidas
```

**Principio**: Organización por característica, no por tipo de archivo.

### Frontend

```
frontend/src/
├── features/           # Módulos por característica
│   ├── meetings/       # Todo relacionado con reuniones
│   ├── auth/          # Autenticación
│   └── ...
├── components/         # Componentes reutilizables
│   ├── layouts/       # Layouts de página
│   └── ...
├── hooks/             # Hooks personalizados
├── stores/            # Zustand stores
└── utils/             # Utilidades
```

## 🧪 Testing

### Backend

```bash
# Ejecutar todos los tests
docker-compose exec backend pytest

# Ejecutar tests específicos
docker-compose exec backend pytest tests/test_transcription.py

# Con cobertura
docker-compose exec backend pytest --cov=backend
```

### Frontend

```bash
cd frontend
npm run test
```

## 📚 Documentación

### Docstrings

Todas las funciones y clases públicas deben tener docstrings:

```python
class TranscriptionEngine:
    """
    Motor de transcripción usando Faster-Whisper.
    
    Soporta múltiples idiomas y modelos de diferentes tamaños.
    Optimizado para CPU y GPU.
    """
    
    def transcribe_file(
        self, 
        audio_path: str
    ) -> Dict[str, Any]:
        """
        Transcribir archivo de audio.
        
        Args:
            audio_path: Ruta al archivo de audio
            
        Returns:
            Dict con transcripción completa
            
        Raises:
            FileNotFoundError: Si el archivo no existe
        """
        ...
```

### Comentarios

- **Explica el "por qué"**, no el "qué"
- Evita comentarios obvios: `# Incrementar contador` ❌
- Usa comentarios para decisiones complejas: `# Usamos int8 para reducir memoria en CPU` ✅

## 🔍 Code Review

Tu PR será revisado por:

1. **Funcionalidad**: ¿Hace lo que dice que hace?
2. **Código limpio**: ¿Es legible y mantenible?
3. **Tests**: ¿Hay tests adecuados?
4. **Documentación**: ¿Está documentado?
5. **Performance**: ¿Hay problemas de rendimiento?
6. **Seguridad**: ¿Hay vulnerabilidades?

## 🐛 Reportar Bugs

Abre un issue en GitHub con:

1. **Descripción clara** del problema
2. **Pasos para reproducir**
3. **Comportamiento esperado** vs **comportamiento actual**
4. **Screenshots** (si aplica)
5. **Información del entorno**:
   - OS
   - Versión de Docker
   - Logs relevantes

## 💡 Solicitar Características

Abre un issue con:

1. **Descripción** de la característica
2. **Caso de uso** (¿por qué es útil?)
3. **Alternativas consideradas**
4. **Información adicional**

## ✅ Checklist Antes de Enviar PR

- [ ] Código sigue las convenciones del proyecto
- [ ] Tests añadidos/actualizados y pasando
- [ ] Documentación actualizada
- [ ] Sin errores de linting
- [ ] Commits con mensajes descriptivos
- [ ] PR tiene descripción clara

## 📞 Contacto

Si tienes preguntas, abre un issue o contacta al mantenedor del proyecto.

---

**Gracias por contribuir a AIssistant! 🎉**

