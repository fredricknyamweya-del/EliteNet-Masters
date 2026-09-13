from decimal import Decimal

from flask import current_app, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restful import Resource
from sqlalchemy.exc import SQLAlchemyError

from extensions import api, db
from models.models import Admin, Package, Router, Session, Transaction


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


class AdminActiveUsers(Resource):
    @jwt_required()
    def get(self):
        try:
            admin_id = int(get_jwt_identity())
        except (TypeError, ValueError):
            return {"status": "error", "message": "Unauthorized admin access."}, 401

        try:
            if db.session.get(Admin, admin_id) is None:
                return {"status": "error", "message": "Unauthorized admin access."}, 401

            active_sessions = Session.query.filter_by(is_active=True).all()
            return {"status": "success", "data": [record.to_dict() for record in active_sessions]}, 200
        except SQLAlchemyError:
            db.session.rollback()
            current_app.logger.exception("Failed to retrieve admin active users")
            return {"status": "error", "message": "Unable to retrieve active users."}, 500


api.add_resource(AdminActiveUsers, "/api/admin/active-users")


class AdminRouters(Resource):
    @jwt_required()
    def get(self):
        try:
            admin_id = int(get_jwt_identity())
        except (TypeError, ValueError):
            return {"status": "error", "message": "Unauthorized admin access."}, 401

        try:
            if db.session.get(Admin, admin_id) is None:
                return {"status": "error", "message": "Unauthorized admin access."}, 401

            records = Router.query.order_by(Router.created_at.desc()).all()
            return {"status": "success", "data": [record.to_dict() for record in records]}, 200
        except SQLAlchemyError:
            db.session.rollback()
            current_app.logger.exception("Failed to retrieve admin routers")
            return {"status": "error", "message": "Unable to retrieve routers."}, 500


api.add_resource(AdminRouters, "/api/admin/routers")


class AdminPlans(Resource):
    @jwt_required()
    def get(self):
        try:
            admin_id = int(get_jwt_identity())
        except (TypeError, ValueError):
            return {"status": "error", "message": "Unauthorized admin access."}, 401

        try:
            if db.session.get(Admin, admin_id) is None:
                return {"status": "error", "message": "Unauthorized admin access."}, 401

            records = Package.query.order_by(Package.duration_minutes.asc()).all()
            return {
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
            }, 200
        except SQLAlchemyError:
            db.session.rollback()
            current_app.logger.exception("Failed to retrieve admin plans")
            return {"status": "error", "message": "Unable to retrieve plans."}, 500


class AdminPlan(Resource):
    @jwt_required()
    def patch(self, plan_id):
        try:
            admin_id = int(get_jwt_identity())
        except (TypeError, ValueError):
            return {"status": "error", "message": "Unauthorized admin access."}, 401

        try:
            if db.session.get(Admin, admin_id) is None:
                return {"status": "error", "message": "Unauthorized admin access."}, 401

            payload = request.get_json(silent=True) or {}
            price = payload.get("price")

            if price is None:
                return {"status": "error", "message": "price is required."}, 400
            if not isinstance(price, (int, float)) or isinstance(price, bool):

                 return { "status": "error", "message": "Price must be a number." }, 400

            try:
                normalized_price = Decimal(str(price))
            except Exception:
                return {"status": "error", "message": "price must be numeric."}, 400

            plan = Package.query.get(plan_id)
            if not plan:
                return {"status": "error", "message": "Plan not found."}, 404

            plan.price = normalized_price
            db.session.commit()

            return {
                "status": "success",
                "message": "Plan updated successfully.",
                "data": {
                    "id": plan.id,
                    "name": plan.name,
                    "price": float(plan.price),
                    "duration_minutes": plan.duration_minutes,
                    "is_active": plan.is_active,
                },
            }, 200
        except SQLAlchemyError:
            db.session.rollback()
            current_app.logger.exception("Failed to update admin plan")
            return {"status": "error", "message": "Unable to update plan."}, 500


api.add_resource(AdminPlans, "/api/admin/plans")
api.add_resource(AdminPlan, "/api/admin/plans/<int:plan_id>")


class AdminRestart(Resource):
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
            if not isinstance(payload, dict):
                return {"status": "error", "message": "JSON body must be an object."}, 400
            router_id = payload.get("router_id")

            if router_id is None:
                return {"status": "error", "message": "router_id is required."}, 400
            if isinstance(router_id, bool) or not isinstance(router_id, (int, str)):
                return {"status": "error", "message": "router_id must be an integer."}, 400
            try:
                router_id = int(router_id)
            except ValueError:
                return {"status": "error", "message": "router_id must be an integer."}, 400

            router = Router.query.get(router_id)
            if not router:
                return {"status": "error", "message": "Router not found."}, 404

            router.status = "restarting"
            db.session.commit()

            return {
                "status": "success",
                "message": f"Router '{router.name}' is restarting.",
                "data": router.to_dict(),
            }, 200
        except SQLAlchemyError:
            db.session.rollback()
            current_app.logger.exception("Failed to restart admin router")
            return {"status": "error", "message": "Unable to restart router."}, 500


api.add_resource(AdminRestart, "/api/admin/restart")
