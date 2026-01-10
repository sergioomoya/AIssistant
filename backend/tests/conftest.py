"""
AIssistant - Configuración de Tests
===================================
Fixtures compartidos para todos los tests.

NOTA: Los tests de endpoints con TestClient tienen conflictos con el lifespan
async de FastAPI + PostgreSQL async. Los tests de integración de endpoints
se ejecutarán por separado o con mocks de la BD.

Aquí se mantienen fixtures para tests unitarios.
"""

import pytest
from datetime import timedelta

from core.security import create_access_token


@pytest.fixture(scope="function")
def test_user_data():
    """Datos de usuario de test."""
    return {
        "id": 1,
        "email": "test@example.com",
        "full_name": "Test User",
        "deployment_mode": "hybrid"
    }


@pytest.fixture(scope="function")
def auth_token(test_user_data):
    """Token JWT válido para tests."""
    token_data = {
        "sub": str(test_user_data["id"]),
        "email": test_user_data["email"]
    }
    return create_access_token(data=token_data)


@pytest.fixture(scope="function")
def expired_token(test_user_data):
    """Token JWT expirado para tests."""
    token_data = {
        "sub": str(test_user_data["id"]),
        "email": test_user_data["email"]
    }
    # Crear token con expiración negativa
    return create_access_token(
        data=token_data,
        expires_delta=timedelta(seconds=-1)
    )
