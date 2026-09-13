from flask import current_app
from flask_restful import Resource
from sqlalchemy.exc import SQLAlchemyError

from extensions import api, db
from app.models import Package


class Packages(Resource):
    def get(self):
        try:
            packages = Package.query.filter_by(is_active=True).order_by(
                Package.duration_minutes.asc(), Package.id.asc()
            ).all()
            return {
                "status": "success",
                "packages": [
                    {
                        "id": package.id,
                        "name": package.name,
                        "price": float(package.price) if package.price is not None else None,
                        "duration_minutes": package.duration_minutes,
                        "is_active":package.is_active,
                    }
                    for package in packages
                ],
            }, 200
        except SQLAlchemyError:
            db.session.rollback()
            current_app.logger.exception("Unable to retrieve packages")
            return {"status": "error", "message": "Unable to retrieve packages."}, 500


api.add_resource(Packages, "/api/packages")
