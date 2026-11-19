"""Request limits: per-user scan rate limit and a cap on concurrent scans."""
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, status

from app.core.config import settings

_lock = threading.Lock()
_history: dict[int, deque] = defaultdict(deque)
_active = threading.BoundedSemaphore(settings.MAX_CONCURRENT_SCANS)


def check_rate_limit(user_id: int) -> None:
    """Allow at most SCAN_RATE_LIMIT_PER_HOUR scans per user per rolling hour."""
    now = time.monotonic()
    with _lock:
        q = _history[user_id]
        while q and now - q[0] > 3600:
            q.popleft()
        if len(q) >= settings.SCAN_RATE_LIMIT_PER_HOUR:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                                f"Scan limit reached ({settings.SCAN_RATE_LIMIT_PER_HOUR} per hour). Try again later.")
        q.append(now)


def reset() -> None:  # used by tests
    with _lock:
        _history.clear()


class scan_slot:
    """Context manager: refuse (503) instead of queueing when the server is already busy scanning."""

    def __enter__(self):
        if not _active.acquire(blocking=False):
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE,
                                "The scanner is busy. Please retry in a minute.")
        return self

    def __exit__(self, *exc):
        _active.release()
        return False
