"""
AIssistant - Schemas de API
===========================
"""

from api.schemas.meetings import (
    ParticipantCreate,
    MeetingCreate,
    MeetingUpdate,
    ParticipantResponse,
    ActionItemResponse,
    MeetingResponse,
    MeetingListResponse,
    DashboardStatsResponse,
)

from api.schemas.settings import (
    DeploymentModeUpdate,
    APIKeysUpdate,
    PrivacySettingsUpdate,
    PreferencesUpdate,
    UserSettingsResponse,
    TranscriptionModelsResponse,
    LLMModelsResponse,
    StorageStatusResponse,
    CleanupResponse,
)

__all__ = [
    # Meetings
    "ParticipantCreate",
    "MeetingCreate",
    "MeetingUpdate",
    "ParticipantResponse",
    "ActionItemResponse",
    "MeetingResponse",
    "MeetingListResponse",
    "DashboardStatsResponse",
    # Settings
    "DeploymentModeUpdate",
    "APIKeysUpdate",
    "PrivacySettingsUpdate",
    "PreferencesUpdate",
    "UserSettingsResponse",
    "TranscriptionModelsResponse",
    "LLMModelsResponse",
    "StorageStatusResponse",
    "CleanupResponse",
]

