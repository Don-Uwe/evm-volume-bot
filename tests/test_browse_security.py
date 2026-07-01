"""Tests for browse path sandboxing."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.config import reset_settings
from src.web.app import app


@pytest.fixture(autouse=True)
def _reset() -> None:
    reset_settings()
    yield
    reset_settings()


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> TestClient:
    monkeypatch.setenv("AVE_BROWSE_ROOTS", str(tmp_path))
    reset_settings()
    return TestClient(app)


def test_browse_rejects_path_outside_roots(client: TestClient) -> None:
    response = client.get("/api/browse", params={"path": "C:\\Windows"})
    assert response.status_code == 403


def test_browse_lists_allowed_directory(client: TestClient, tmp_path: Path) -> None:
    (tmp_path / "clip.mp4").write_bytes(b"")
    response = client.get("/api/browse", params={"path": str(tmp_path)})
    assert response.status_code == 200
    assert response.json()["video_count"] == 1
