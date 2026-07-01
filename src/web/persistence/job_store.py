"""Optional Redis-backed persistence for job snapshots."""

from __future__ import annotations

import json
import logging
from typing import Any

from src.config import get_settings

logger = logging.getLogger(__name__)

try:
    import redis
except ImportError:  # pragma: no cover - optional dependency
    redis = None  # type: ignore[assignment]


class JobPersistence:
    """Persist serialized job payloads to Redis when configured."""

    def __init__(self) -> None:
        settings = get_settings()
        self._prefix = settings.redis_key_prefix
        self._client: Any | None = None
        if settings.redis_enabled and settings.redis_url and redis is not None:
            self._client = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                retry_on_timeout=True,
            )
            logger.info("Job persistence connected to Redis")
        elif settings.redis_enabled and settings.redis_url and redis is None:
            logger.warning("REDIS_URL set but redis package is not installed")

    @property
    def enabled(self) -> bool:
        return self._client is not None

    def _key(self, job_id: str) -> str:
        return f"{self._prefix}jobs:{job_id}"

    def save_job(self, job_id: str, payload: dict[str, Any]) -> None:
        if not self._client:
            return
        try:
            self._client.set(self._key(job_id), json.dumps(payload))
            self._client.sadd(f"{self._prefix}job_ids", job_id)
        except Exception:
            logger.exception("Failed to persist job %s", job_id)

    def load_job_ids(self) -> list[str]:
        if not self._client:
            return []
        try:
            return sorted(self._client.smembers(f"{self._prefix}job_ids"))
        except Exception:
            logger.exception("Failed to load job ids from Redis")
            return []

    def load_job(self, job_id: str) -> dict[str, Any] | None:
        if not self._client:
            return None
        try:
            raw = self._client.get(self._key(job_id))
            return json.loads(raw) if raw else None
        except Exception:
            logger.exception("Failed to load job %s from Redis", job_id)
            return None

    def close(self) -> None:
        if self._client is not None:
            try:
                self._client.close()
            except Exception:
                logger.exception("Error closing Redis client")
