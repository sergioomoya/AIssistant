-- ===========================================
-- AIssistant - Inicialización de Base de Datos
-- ===========================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Para búsqueda de texto

-- Índices adicionales para búsqueda eficiente
-- (Las tablas se crean automáticamente por SQLAlchemy)

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Comentario informativo
COMMENT ON DATABASE aissistant_db IS 'Base de datos principal de AIssistant - Asistente de Reuniones con IA';

