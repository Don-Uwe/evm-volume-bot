"""Tests for centralized application settings."""

from __future__ import annotations

import pytest

from src.config import get_settings, reset_settings


@pytest.fixture(autouse=True)
def _reset_settings() -> None:
    reset_settings()
    yield
    reset_settings()


def test_default_cors_origins() -> None:
    settings = get_settings()
    assert "http://localhost:3000" in settings.cors_origins


def test_redis_disabled_via_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REDIS_ENABLED", "false")
    reset_settings()
    settings = get_settings()
    assert settings.redis_enabled is False


def test_browse_roots_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AVE_BROWSE_ROOTS", "/tmp,/var")
    reset_settings()
    settings = get_settings()
    assert len(settings.browse_roots) == 2
