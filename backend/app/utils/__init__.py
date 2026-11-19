from datetime import datetime, timezone


def utcnow() -> datetime:
    """Naive UTC timestamp (matches MySQL DATETIME columns)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
