import random
import string
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

from app.extensions import db
from models.models import Package, Voucher
from services.auth import require_admin_auth


vouchers_bp = Blueprint("vouchers", __name__)


def _voucher_code():
    chars = string.ascii_uppercase + string.digits
    return "VCH-" + "".join(random.choice(chars) for _ in range(8))


@vouchers_bp.post("/api/vouchers/generate")
@require_admin_auth
def generate_voucher():
    payload = request.get_json(silent=True) or {}
    package_id = payload.get("package_id")
    client_name = (payload.get("client_name") or "Walk-in").strip()

    if package_id is None:
        return jsonify({"status": "error", "message": "package_id is required."}), 400

    package = Package.query.get(package_id)
    if not package:
        return jsonify({"status": "error", "message": "Package not found."}), 404

    code = _voucher_code()
    while Voucher.query.filter_by(code=code).first():
        code = _voucher_code()

    voucher = Voucher(
        code=code,
        package_id=package.id,
        status="unused",
        expires_at=datetime.utcnow() + timedelta(days=30),
    )
    db.session.add(voucher)
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Voucher generated",
        "code": code,
        "package": package.name,
        "package_id": package.id,
        "client_name": client_name,
    }), 201


@vouchers_bp.post("/api/vouchers/activate")
def activate_voucher():
    payload = request.get_json(silent=True) or {}
    code = (payload.get("code") or "").strip().upper()

    if not code:
        return jsonify({"status": "error", "message": "Voucher code is required."}), 400

    voucher = Voucher.query.filter_by(code=code).first()
    if not voucher:
        return jsonify({"status": "error", "message": "Voucher not found."}), 404

    if voucher.status == "redeemed":
        return jsonify({"status": "error", "message": "Voucher already used."}), 409

    if voucher.expires_at and voucher.expires_at < datetime.utcnow():
        voucher.status = "expired"
        db.session.commit()
        return jsonify({"status": "error", "message": "Voucher has expired."}), 410

    voucher.status = "redeemed"
    voucher.redeemed_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Voucher activated",
        "code": voucher.code,
        "package_id": voucher.package_id,
        "duration_minutes": voucher.package.duration_minutes if voucher.package else None,
    }), 200