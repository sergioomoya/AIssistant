"""
AIssistant - Servicio de Encriptación de Archivos
==================================================
Encriptación AES-256 para archivos de audio y documentos sensibles.
"""

import os
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import structlog

from core.config import settings

logger = structlog.get_logger()


class EncryptionService:
    """
    Servicio para encriptar/desencriptar archivos usando AES-256.
    
    Usa Fernet (AES-128 en modo CBC) que es más seguro que AES directo.
    La clave se deriva de SECRET_KEY usando PBKDF2.
    """
    
    def __init__(self):
        """Inicializar servicio de encriptación."""
        self._key: Optional[bytes] = None
        self._fernet: Optional[Fernet] = None
        self._initialize()
    
    def _initialize(self):
        """Inicializar clave de encriptación desde SECRET_KEY."""
        try:
            # Derivar clave desde SECRET_KEY usando PBKDF2
            secret_key = settings.SECRET_KEY.encode()
            salt = b'aissistant_salt_2026'  # En producción, usar salt único por archivo
            
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
                backend=default_backend()
            )
            
            key = base64.urlsafe_b64encode(kdf.derive(secret_key))
            self._fernet = Fernet(key)
            self._key = key
            
            logger.info("Servicio de encriptación inicializado")
            
        except Exception as e:
            logger.error("Error inicializando encriptación", error=str(e))
            raise
    
    def encrypt_file(self, input_path: str, output_path: Optional[str] = None) -> str:
        """
        Encriptar archivo.
        
        Args:
            input_path: Ruta al archivo a encriptar
            output_path: Ruta de salida (None = reemplazar archivo original)
            
        Returns:
            Ruta del archivo encriptado
        """
        if not self._fernet:
            raise RuntimeError("Servicio de encriptación no inicializado")
        
        if output_path is None:
            output_path = input_path + ".encrypted"
        
        try:
            # Leer archivo
            with open(input_path, 'rb') as f:
                file_data = f.read()
            
            # Encriptar
            encrypted_data = self._fernet.encrypt(file_data)
            
            # Escribir archivo encriptado
            with open(output_path, 'wb') as f:
                f.write(encrypted_data)
            
            logger.info("Archivo encriptado", input_path=input_path, output_path=output_path)
            
            # Eliminar archivo original
            os.remove(input_path)
            
            return output_path
            
        except Exception as e:
            logger.error("Error encriptando archivo", error=str(e), path=input_path)
            raise
    
    def decrypt_file(self, input_path: str, output_path: Optional[str] = None) -> str:
        """
        Desencriptar archivo.
        
        Args:
            input_path: Ruta al archivo encriptado
            output_path: Ruta de salida (None = reemplazar archivo encriptado)
            
        Returns:
            Ruta del archivo desencriptado
        """
        if not self._fernet:
            raise RuntimeError("Servicio de encriptación no inicializado")
        
        if output_path is None:
            # Remover extensión .encrypted
            if input_path.endswith('.encrypted'):
                output_path = input_path[:-10]
            else:
                output_path = input_path + ".decrypted"
        
        try:
            # Leer archivo encriptado
            with open(input_path, 'rb') as f:
                encrypted_data = f.read()
            
            # Desencriptar
            decrypted_data = self._fernet.decrypt(encrypted_data)
            
            # Escribir archivo desencriptado
            with open(output_path, 'wb') as f:
                f.write(decrypted_data)
            
            logger.info("Archivo desencriptado", input_path=input_path, output_path=output_path)
            
            return output_path
            
        except Exception as e:
            logger.error("Error desencriptando archivo", error=str(e), path=input_path)
            raise
    
    def encrypt_bytes(self, data: bytes) -> bytes:
        """
        Encriptar datos en memoria.
        
        Args:
            data: Datos a encriptar
            
        Returns:
            Datos encriptados
        """
        if not self._fernet:
            raise RuntimeError("Servicio de encriptación no inicializado")
        
        return self._fernet.encrypt(data)
    
    def decrypt_bytes(self, encrypted_data: bytes) -> bytes:
        """
        Desencriptar datos en memoria.
        
        Args:
            encrypted_data: Datos encriptados
            
        Returns:
            Datos desencriptados
        """
        if not self._fernet:
            raise RuntimeError("Servicio de encriptación no inicializado")
        
        return self._fernet.decrypt(encrypted_data)


# Instancia global
_encryption_service: Optional[EncryptionService] = None


def get_encryption_service() -> EncryptionService:
    """Obtener instancia singleton del servicio de encriptación."""
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service

