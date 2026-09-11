from datetime import datetime

from services.router_service import (
    provision_hotspot_user as service_provision_hotspot_user,
    revoke_hotspot_user as service_revoke_hotspot_user,
)


def provision_hotspot_user(phone_number, routeros_username, expires_at, package_name=None, duration_minutes=None, rate_limit=None):
    """Compatibility wrapper for the production RouterOS service layer."""
    if duration_minutes is None and expires_at is not None:
        try:
            duration_minutes = max(1, int((expires_at - datetime.utcnow()).total_seconds() // 60))
        except Exception:
            duration_minutes = 60

    if package_name is None:
        package_name = "custom"

    return service_provision_hotspot_user(
        phone_number=phone_number,
        package_name=package_name,
        duration_minutes=duration_minutes or 60,
        expires_at=expires_at,
        username=routeros_username,
        rate_limit=rate_limit,
    )


def revoke_hotspot_user(routeros_username, disconnect=True):
    """Disable MikroTik hotspot access via the canonical RouterOS service."""
    return service_revoke_hotspot_user(routeros_username, disconnect=disconnect)