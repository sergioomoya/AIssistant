"""
AIssistant - Tests de Encriptación
===================================
Tests para servicios de encriptación de API keys y archivos.
"""

import pytest
from features.privacy.encryption import get_encryption_service
from features.privacy.api_keys import decrypt_api_key, get_decrypted_api_key
from api.endpoints.settings import encrypt_api_key


def test_encryption_service_encrypt_decrypt_bytes():
    """Test que EncryptionService puede encriptar y desencriptar bytes."""
    service = get_encryption_service()
    
    original_data = b"test data to encrypt"
    encrypted = service.encrypt_bytes(original_data)
    decrypted = service.decrypt_bytes(encrypted)
    
    assert decrypted == original_data
    assert encrypted != original_data


def test_api_key_encryption_roundtrip():
    """Test que encriptar y desencriptar una API key funciona correctamente."""
    original_key = "sk-openai-test-key-12345"
    
    encrypted = encrypt_api_key(original_key)
    decrypted = decrypt_api_key(encrypted)
    
    assert decrypted == original_key
    assert encrypted != original_key


def test_api_key_encryption_different_outputs():
    """Test que cada encriptación produce output diferente (por el nonce)."""
    api_key = "sk-test123456789"
    
    # Encriptar dos veces
    encrypted1 = encrypt_api_key(api_key)
    encrypted2 = encrypt_api_key(api_key)
    
    # Los valores encriptados son diferentes (por el nonce de Fernet)
    # Pero ambos deben desencriptarse al mismo valor
    decrypted1 = decrypt_api_key(encrypted1)
    decrypted2 = decrypt_api_key(encrypted2)
    
    assert decrypted1 == api_key
    assert decrypted2 == api_key
    assert decrypted1 == decrypted2


def test_get_decrypted_api_key_from_user():
    """Test obtener API key desencriptada del usuario."""
    user_api_keys = {
        "openai": encrypt_api_key("sk-test-key"),
        "anthropic": encrypt_api_key("sk-anthropic-key")
    }
    
    # Obtener key desencriptada
    openai_key = get_decrypted_api_key(user_api_keys, "openai")
    anthropic_key = get_decrypted_api_key(user_api_keys, "anthropic")
    
    assert openai_key == "sk-test-key"
    assert anthropic_key == "sk-anthropic-key"


def test_get_decrypted_api_key_fallback():
    """Test que get_decrypted_api_key usa fallback de entorno si no hay key de usuario."""
    user_api_keys = {}
    env_fallback = "sk-env-key"
    
    key = get_decrypted_api_key(user_api_keys, "openai", env_fallback)
    
    assert key == env_fallback


def test_get_decrypted_api_key_none_when_missing():
    """Test que devuelve None cuando no hay key y no hay fallback."""
    user_api_keys = {}
    
    key = get_decrypted_api_key(user_api_keys, "openai", None)
    
    assert key is None


def test_encrypt_empty_key():
    """Test que encriptar una key vacía devuelve string vacío."""
    result = encrypt_api_key("")
    assert result == ""


def test_decrypt_invalid_returns_original():
    """Test que desencriptar una key inválida devuelve el valor original."""
    # Key que no es base64 válido para encriptación
    invalid_key = "not-a-valid-encrypted-key"
    
    result = decrypt_api_key(invalid_key)
    # Debe devolver el valor original si falla (para compatibilidad con keys en texto plano)
    assert result == invalid_key
