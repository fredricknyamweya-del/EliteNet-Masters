import random
import string
from datetime import datetime, timedelta, timezone

from flask import current_app, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restful import Resource
from sqlalchemy.exc import SQLAlchemyError

from extensions import api, db
from app.models import Admin, Package, Voucher


def _utc_now():
    return datetime.now(timezone.utc)


def _voucher_code():
    chars = string.ascii_uppercase + string.digits
    return "VCH-" + "".join(random.choice(chars) for _ in range(8))


class VoucherGenerate(Resource):
    @jwt_required()
    def post(self):
        try:
            admin_id = int(get_jwt_identity())
        except (TypeError, ValueError):
            return {"status": "error", "message": "Unauthorized admin access."}, 401

        try:
            if db.session.get(Admin, admin_id) is None:
                return {"status": "error", "message": "Unauthorized admin access."}, 401

            payload = request.get_json(silent=True) or {}
            package_id = payload.get("package_id")
            client_name = (payload.get("client_name") or "Walk-in").strip()

            if package_id is None:
                return {"status": "error", "message": "package_id is required."}, 400

            package = Package.query.get(package_id)
            if not package:
                return {"status": "error", "message": "Package not found."}, 404

            code = _voucher_code()
            while Voucher.query.filter_by(code=code).first():
                code = _voucher_code()

            voucher = Voucher(
                code=code,
                package_id=package.id,
                status="unused",
                expires_at=_utc_now() + timedelta(days=30),
            )
            db.session.add(voucher)
            db.session.commit()

            return {
                "status": "success",
                "message": "Voucher generated",
                "code": code,
                "package": package.name,
                "package_id": package.id,
                "client_name": client_name,
            }, 201
        except SQLAlchemyError:
            db.session.rollback()
            current_app.logger.exception("Unable to generate voucher")
            return {"status": "error", "message": "Unable to generate voucher."}, 500


class VoucherActivate(Resource):
    def post(self):
        try:
            payload = request.get_json(silent=True) or {}
            code = (payload.get("code") or "").strip().upper()

            if not code:
                return {"status": "error", "message": "Voucher code is required."}, 400

            voucher = Voucher.query.filter_by(code=code).first()
            if not voucher:
                return {"status": "error", "message": "Voucher not found."}, 404

            if voucher.status == "redeemed":
                return {"status": "error", "message": "Voucher already used."}, 409

            if voucher.expires_at and voucher.expires_at < _utc_now():
                voucher.status = "expired"
                db.session.commit()
                return {"status": "error", "message": "Voucher has expired."}, 410

            voucher.status = "redeemed"
            voucher.redeemed_at = _utc_now()
            db.session.commit()

            return {
                "status": "success",
                "message": "Voucher activated",
                "code": voucher.code,
                "package_id": voucher.package_id,
                "duration_minutes": voucher.package.duration_minutes if voucher.package else None,
            }, 200
        except SQLAlchemyError:
            db.session.rollback()
            current_app.logger.exception("Unable to activate voucher")
            return {"status": "error", "message": "Unable to activate voucher."}, 500


api.add_resource(VoucherActivate, "/api/vouchers/activate")
api.add_resource(VoucherGenerate, "/api/vouchers/generate")
