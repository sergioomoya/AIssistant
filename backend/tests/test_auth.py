"""
AIssistant - Tests de Autenticación
===================================
Tests para endpoints de autenticación y seguridad.
"""

import pytest
from fastapi import status


def test_health_check(client):
    """Test del endpoint de health check."""
    response = client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "healthy"
    assert "components" in data


def test_root_endpoint(client):
    """Test del endpoint raíz."""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "online"
    assert data["service"] == "AIssistant API"


def test_get_user_settings_requires_auth(client):
    """Test que el endpoint de settings requiere autenticación."""
    response = client.get("/api/v1/settings/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
async def test_get_user_settings_with_auth(client, test_user, auth_token):
    """Test obtener configuración de usuario con autenticación."""
    token = await auth_token
    
    response = client.get(
        "/api/v1/settings/",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "deployment_mode" in data
    assert "has_openai_key" in data
    assert "onboarding_completed" in data

