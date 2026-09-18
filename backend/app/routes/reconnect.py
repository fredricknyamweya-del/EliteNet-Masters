from datetime import datetime

from flask import current_app, request
from flask_restful import Resource
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
import re

from extensions import api, db
from app.models import Device, Session


class Reconnect(Resource):
    def post(self):
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict):
            return {"status": "error", "message": "A JSON object is required."}, 400
        mac_address = payload.get("mac_address")
        if not isinstance(mac_address, str):
            return {"status": "error", "message": "mac_address is required."}, 400
        mac_address = mac_address.strip().replace("-", ":").lower()
        if not re.fullmatch(r"[0-9a-f]{2}(?::[0-9a-f]{2}){5}", mac_address):
            return {"status": "error", "message": "A valid MAC address is required."}, 400

        try:
            device = Device.query.filter(
                func.lower(func.replace(Device.mac_address, "-", ":")) == mac_address
            ).first()
            if device is None:
                return {"status": "error", "message": "Device not found."}, 404

            now = datetime.utcnow()
            session = Session.query.filter(
                Session.device_id == device.id,
                Session.is_active.is_(True),
                Session.started_at <= now,
                Session.expires_at > now,
            ).first()
            if session is None:
                return {
                    "status": "error",
                    "message": "No active, unexpired session is available for this device.",
                }, 409

            # The existing RouterOS wrapper depends on a missing router_service.
            # Do not provision access, extend time, or claim a reconnection.
            return {
                "status": "error",
                "message": "Router reconnection integration is unavailable; device was not reconnected.",
            }, 500
        except SQLAlchemyError:
            db.session.rollback()
            current_app.logger.exception("Unable to check device reconnection eligibility")
            return {"status": "error", "message": "Unable to process reconnection."}, 500


api.add_resource(Reconnect, "/api/reconnect")
