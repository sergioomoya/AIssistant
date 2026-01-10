"""
AIssistant - Utilidades para Gestión de API Keys
================================================
Funciones helper para encriptar/desencriptar API keys de forma segura.
"""

from typing import Optional, Dict
import structlog

from features.privacy.encryption import get_encryption_service

logger = structlog.get_logger()


def decrypt_api_key(encrypted_key: str) -> Optional[str]:
    """
    Desencriptar API key desde almacenamiento.
    
    Args:
        encrypted_key: API key encriptada como string base64
        
    Returns:
        API key en texto plano, o None si hay error
    """
    if not encrypted_key:
        return None
    
    try:
        import base64
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_key.encode('utf-8'))
        encryption_service = get_encryption_service()
        decrypted_bytes = encryption_service.decrypt_bytes(encrypted_bytes)
        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        logger.warning("Error desencriptando API key", error=str(e))
        # Si falla la desencriptación, puede ser que la key esté en texto plano (migración)
        # Intentar devolverla tal cual
        return encrypted_key


def decrypt_api_keys_dict(encrypted_keys: Dict[str, str]) -> Dict[str, str]:
    """
    Desencriptar un diccionario completo de API keys.
    
    Args:
        encrypted_keys: Diccionario con keys encriptadas
        
    Returns:
        Diccionario con keys desencriptadas
    """
    if not encrypted_keys:
        return {}
    
    decrypted = {}
    for provider, encrypted_key in encrypted_keys.items():
        if encrypted_key:
            decrypted_key = decrypt_api_key(encrypted_key)
            if decrypted_key:
                decrypted[provider] = decrypted_key
    
    return decrypted


def get_decrypted_api_key(user_api_keys: Optional[Dict], provider: str, env_fallback: Optional[str] = None) -> Optional[str]:
    """
    Obtener API key desencriptada del usuario o del entorno.
    
    Prioridad:
    1. API key del usuario (desencriptada)
    2. Variable de entorno (fallback)
    
    Args:
        user_api_keys: Diccionario de API keys del usuario (pueden estar encriptadas)
        provider: Nombre del proveedor (openai, anthropic, google, etc.)
        env_fallback: Valor de fallback desde variables de entorno
        
    Returns:
        API key en texto plano, o None si no está disponible
    """
    # Intentar desde las keys del usuario
    if user_api_keys and provider in user_api_keys:
        encrypted_key = user_api_keys[provider]
        if encrypted_key:
            decrypted = decrypt_api_key(encrypted_key)
            if decrypted:
                return decrypted
    
    # Fallback a variable de entorno
    return env_fallback

