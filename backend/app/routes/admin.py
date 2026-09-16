from decimal import Decimal

from flask import current_app, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restful import Resource
from sqlalchemy.exc import SQLAlchemyError

from extensions import api, db
from app.models import Admin, Announcement, Package, Router, Session, Transaction


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

            query = Transaction.query.order_by(Transaction.created_at.desc())
            status = request.args.get("status")
            if status in {"pending", "success", "failed"}:
                query = query.filter_by(status=status)
            if request.args.get("date") == "today":
                from datetime import datetime, timezone
                today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
                query = query.filter(Transaction.created_at >= today)
            records = query.all()
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
            data = []
            for record in active_sessions:
                item = record.to_dict()
                item["package"] = (
                    record.transaction.package.name
                    if record.transaction and record.transaction.package
                    else record.voucher.package.name
                    if record.voucher and record.voucher.package
                    else "Unknown"
                )
                data.append(item)
            return {"status": "success", "data": data}, 200
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

    @jwt_required()
    def post(self):
        if _admin_id() is None:
            return {"status": "error", "message": "Unauthorized admin access."}, 401
        payload = request.get_json(silent=True) or {}
        name = payload.get("name", "").strip()
        price = payload.get("price")
        duration_minutes = payload.get("duration_minutes")
        if not name or len(name) > 100:
            return {"status": "error", "message": "A plan name is required."}, 400
        try:
            normalized_price = Decimal(str(price))
            normalized_duration = int(duration_minutes)
            if normalized_price <= 0 or normalized_duration <= 0:
                raise ValueError
        except (TypeError, ValueError, ArithmeticError):
            return {"status": "error", "message": "Price and duration must be positive numbers."}, 400
        plan = Package(
            name=name,
            price=normalized_price,
            duration_minutes=normalized_duration,
            is_active=True,
        )
        db.session.add(plan)
        db.session.commit()
        return {"status": "success", "data": {
            "id": plan.id,
            "name": plan.name,
            "price": float(plan.price),
            "duration_minutes": plan.duration_minutes,
            "is_active": plan.is_active,
        }}, 201


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

    @jwt_required()
    def delete(self, plan_id):
        if _admin_id() is None:
            return {"status": "error", "message": "Unauthorized admin access."}, 401
        plan = db.session.get(Package, plan_id)
        if plan is None:
            return {"status": "error", "message": "Plan not found."}, 404
        plan.is_active = False
        db.session.commit()
        return {"status": "success", "message": "Plan archived.", "data": {"id": plan.id}}, 200


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


def _admin_id():
    try:
        admin_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        return None
    return admin_id if db.session.get(Admin, admin_id) else None


class AdminSessions(Resource):
    @jwt_required()
    def get(self):
        if _admin_id() is None:
            return {"status": "error", "message": "Unauthorized admin access."}, 401
        status = request.args.get("status", "all")
        query = Session.query.order_by(Session.created_at.desc())
        if status == "active":
            query = query.filter(Session.is_active.is_(True))
        elif status == "expired":
            query = query.filter(Session.is_active.is_(False))
        sessions = query.all()
        data = []
        for session in sessions:
            package = None
            if session.transaction and session.transaction.package:
                package = session.transaction.package.name
            elif session.voucher and session.voucher.package:
                package = session.voucher.package.name
            item = session.to_dict()
            item["package"] = package or "Unknown"
            data.append(item)
        return {"status": "success", "data": data}, 200


class AdminNetworkStats(Resource):
    @jwt_required()
    def get(self):
        if _admin_id() is None:
            return {"status": "error", "message": "Unauthorized admin access."}, 401
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        sessions = Session.query.filter(Session.created_at >= today).all()
        active = Session.query.filter_by(is_active=True).count()
        hourly = [0] * 24
        for session in sessions:
            created = session.created_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            hourly[created.hour] += 1
        peak_hour = max(range(24), key=lambda hour: hourly[hour])
        return {
            "status": "success",
            "data": {
                "total_data_mb": 0,
                "peak_hour": f"{peak_hour}:00 - {(peak_hour + 1) % 24}:00",
                "busiest_package": "N/A",
                "total_sessions_today": len(sessions),
                "active_connections": active,
                "hourly_usage": hourly,
            },
        }, 200


class AdminAnnouncement(Resource):
    @jwt_required()
    def get(self):
        if _admin_id() is None:
            return {"status": "error", "message": "Unauthorized admin access."}, 401
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc)
        announcement = Announcement.query.filter(
            db.or_(Announcement.expires_at.is_(None), Announcement.expires_at > now)
        ).order_by(Announcement.created_at.desc()).first()
        return {"status": "success", "data": announcement.to_dict() if announcement else None}, 200

    @jwt_required()
    def post(self):
        admin_id = _admin_id()
        if admin_id is None:
            return {"status": "error", "message": "Unauthorized admin access."}, 401
        payload = request.get_json(silent=True) or {}
        message = payload.get("message", "").strip()
        expiry = payload.get("expiry", "1h")
        if not message or len(message) > 200:
            return {"status": "error", "message": "Message must be between 1 and 200 characters."}, 400
        from datetime import datetime, timedelta, timezone

        durations = {"1h": timedelta(hours=1), "6h": timedelta(hours=6), "24h": timedelta(hours=24)}
        expires_at = None if expiry == "until_cleared" else datetime.now(timezone.utc) + durations.get(expiry, durations["1h"])
        announcement = Announcement(content=message, expires_at=expires_at, created_by=admin_id)
        db.session.add(announcement)
        db.session.commit()
        return {"status": "success", "message": "Announcement published", "data": announcement.to_dict()}, 201

    @jwt_required()
    def delete(self):
        if _admin_id() is None:
            return {"status": "error", "message": "Unauthorized admin access."}, 401
        announcement = Announcement.query.order_by(Announcement.created_at.desc()).first()
        if announcement is None:
            return {"status": "error", "message": "No announcement to clear."}, 404
        db.session.delete(announcement)
        db.session.commit()
        return {"status": "success", "message": "Announcement cleared."}, 200


api.add_resource(AdminSessions, "/api/admin/sessions")
api.add_resource(AdminNetworkStats, "/api/admin/network-stats")
api.add_resource(AdminAnnouncement, "/api/admin/announcement")
