import json
import logging
import os
from datetime import datetime

from app import app as flask_app
from app.extensions import db
from models.models import Session
from network.routeros import revoke_hotspot_user

logger = logging.getLogger(__name__)


def get_lapsed_sessions(now=None):
    if now is None:
        now = datetime.utcnow()

    return Session.query.filter(
        Session.is_active.is_(True),
        Session.expires_at <= now,
    ).all()


def run_expiry_sweep(now=None):
    now = now or datetime.utcnow()
    sessions = get_lapsed_sessions(now=now)
    checked_count = len(sessions)
    expired_count = 0
    disconnected_count = 0
    failed_count = 0

    for session in sessions:
        live_session = Session.query.filter(
            Session.id == session.id,
            Session.is_active.is_(True),
        ).first()
        if live_session is None:
            continue

        if not live_session.routeros_username:
            live_session.is_active = False
            expired_count += 1
            continue

        try:
            result = revoke_hotspot_user(live_session.routeros_username, disconnect=True)
        except Exception as exc:  # pragma: no cover - exercised via exception path in tests
            result = {
                "status": "error",
                "message": "RouterOS disconnect raised an exception.",
                "code": "routeros_error",
                "details": str(exc),
            }

        if result.get("status") == "success":
            disconnected_count += 1
            live_session.is_active = False
            expired_count += 1
        else:
            failed_count += 1
            logger.warning(
                "Session expiry disconnect failed for routeros_username=%s session_id=%s result=%s",
                live_session.routeros_username,
                live_session.id,
                result,
            )

    if expired_count:
        db.session.commit()

    summary = {
        "checked_at": now.isoformat(),
        "checked_count": checked_count,
        "expired_count": expired_count,
        "disconnected_count": disconnected_count,
        "failed_count": failed_count,
    }
    logger.info("Session expiry sweep summary: %s", summary)
    return summary


def expire_sessions():
    """Backward-compatible entry point for scheduled jobs and manual invocations."""
    with flask_app.app_context():
        return run_expiry_sweep()


if __name__ == "__main__":
    with flask_app.app_context():
        summary = run_expiry_sweep()
    print(json.dumps(summary, sort_keys=True))