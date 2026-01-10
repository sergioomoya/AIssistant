"""
AIssistant - Configuración de Tests
===================================
Fixtures compartidos para todos los tests.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from core.database import Base, get_db
from core.config import settings
from core.security import create_access_token, get_password_hash
from main import app
from models.user import User


# Base de datos de test en memoria (SQLite para tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


@pytest.fixture(scope="function")
async def db_session():
    """Crear sesión de base de datos para tests."""
    # Crear tablas
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Crear sesión
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()
    
    # Limpiar tablas
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
def client():
    """Cliente de test para FastAPI."""
    # Override de get_db para usar base de datos de test
    async def override_get_db():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        async with TestSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()
    
    # Limpiar después de cada test
    async def cleanup():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
    
    import asyncio
    asyncio.run(cleanup())


@pytest.fixture
async def test_user(client):
    """Crear usuario de test."""
    from sqlalchemy import select
    
    # Crear usuario directamente en la BD de test
    async with TestSessionLocal() as session:
        # Verificar si ya existe
        result = await session.execute(
            select(User).where(User.email == "test@example.com")
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            return existing_user
        
        user = User(
            email="test@example.com",
            hashed_password=get_password_hash("testpassword"),
            full_name="Test User",
            is_active=True,
            is_verified=True,
            deployment_mode="hybrid"
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest.fixture
async def auth_token(test_user):
    """Crear token JWT para usuario de test."""
    user = await test_user
    token_data = {"sub": str(user.id), "email": user.email}
    return create_access_token(data=token_data)

