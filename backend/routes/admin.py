from decimal import Decimal
from functools import wraps

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restful import Resource
from sqlalchemy.exc import SQLAlchemyError

from extensions import api, db
from models.models import Admin, Package, Router, Session, Transaction


def require_admin_auth(view):
    # Defer the legacy dependency while these endpoints remain unregistered.
    @wraps(view)
    def wrapped(*args, **kwargs):
        from services.auth import require_admin_auth as legacy_require_admin_auth

        return legacy_require_admin_auth(view)(*args, **kwargs)

    return wrapped


admin_bp = Blueprint("admin", __name__)


class AdminTransactions(Resource):
    @jwt_required()
    def get(self):
        try:
            admin_id = int(get_jwt_identity())
        except (TypeError, ValueError):
            return {
                "status": "error",
                "message": "Unauthorized admin access."
            }, 401
        try:
            if db.session.get(Admin, admin_id) is None:
                return {"status": "error", "message": "Unauthorized admin access."}, 401

            records = Transaction.query.order_by(Transaction.created_at.desc()).all()
            return {"status": "success", "data": [record.to_dict() for record in records]}, 200
        except SQLAlchemyError:
            db.session.rollback()
            current_app.logger.exception("Failed to retrieve admin transactions")
            return {"status": "error", "message": "Unable to retrieve transactions."}, 500


api.add_resource(AdminTransactions, "/api/admin/transactions")


@admin_bp.get("/api/admin/active-users")
@require_admin_auth
def list_active_users():
    active_sessions = Session.query.filter_by(is_active=True).all()
    return jsonify({"status": "success", "data": [record.to_dict() for record in active_sessions]}), 200


@admin_bp.get("/api/admin/routers")
@require_admin_auth
def list_routers():
    records = Router.query.order_by(Router.created_at.desc()).all()
    return jsonify({"status": "success", "data": [record.to_dict() for record in records]}), 200


@admin_bp.get("/api/admin/plans")
@require_admin_auth
def list_plans():
    records = Package.query.order_by(Package.duration_minutes.asc()).all()
    return jsonify({
        "status": "success",
        "data": [
            {
                "id": record.id,
                "name": record.name,
                "price": float(record.price) if record.price is not None else 0,
                "duration_minutes": record.duration_minutes,
                "is_active": record.is_active,
            }
            for record in records
        ],
    }), 200


@admin_bp.patch("/api/admin/plans/<int:plan_id>")
@require_admin_auth
def update_plan(plan_id):
    payload = request.get_json(silent=True) or {}
    price = payload.get("price")

    if price is None:
        return jsonify({"status": "error", "message": "price is required."}), 400

    try:
        normalized_price = Decimal(str(price))
    except Exception:
        return jsonify({"status": "error", "message": "price must be numeric."}), 400

    plan = Package.query.get(plan_id)
    if not plan:
        return jsonify({"status": "error", "message": "Plan not found."}), 404

    plan.price = normalized_price
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": "Plan updated successfully.",
        "data": {
            "id": plan.id,
            "name": plan.name,
            "price": float(plan.price),
            "duration_minutes": plan.duration_minutes,
            "is_active": plan.is_active,
        },
    }), 200


@admin_bp.post("/api/admin/restart")
@require_admin_auth
def restart_router():
    payload = request.get_json(silent=True) or {}
    router_id = payload.get("router_id")

    if router_id is None:
        return jsonify({"status": "error", "message": "router_id is required."}), 400

    router = Router.query.get(router_id)
    if not router:
        return jsonify({"status": "error", "message": "Router not found."}), 404

    router.status = "restarting"
    db.session.commit()

    return jsonify({
        "status": "success",
        "message": f"Router '{router.name}' is restarting.",
        "data": router.to_dict(),
    }), 200
