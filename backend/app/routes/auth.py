from flask import jsonify, make_response, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from flask_restful import Resource

from extensions import api, db
from models.models import Admin



class Login(Resource):
    def post(self):
        payload = request.get_json(silent=True)
        if payload is None:
            return {"status": "error", "message": "A valid JSON body is required."}, 400
        if not isinstance(payload, dict):
            return {"status": "error", "message": "JSON body must be an object."}, 400
        if "username" not in payload or "password" not in payload:
            return {"status": "error", "message": "Username and password are required."}, 400

        username = payload.get("username")
        password = payload.get("password")
        if not isinstance(username, str) or not isinstance(password, str):
            return {"status": "error", "message": "Username and password must be strings."}, 400

        username = username.strip()
        if not username or not password:
            return {"status": "error", "message": "Username and password are required."}, 400

        admin = Admin.query.filter_by(username=username).first()
        if not admin or not admin.check_password(password):
            return make_response(
                jsonify({"status": "error", "message": "Invalid username or password"}), 401
            )

        token = create_access_token(identity=str(admin.id))
        return make_response(
            jsonify(
                {
                    "status": "success",
                    "message": "Login successful",
                    "access_token": token,
                    "admin": {
                        "id": admin.id,
                        "username": admin.username,
                    },
                }
            ),
            200,
        )


class ChangePassword(Resource):
    @jwt_required()
    def post(self):
        payload = request.get_json(silent=True) or {}
        if not isinstance(payload, dict):
            payload = {}
        current_password = payload.get("current_password")
        new_password = payload.get("new_password")

        if (
            not isinstance(current_password, str) or not current_password
            or not isinstance(new_password, str) or not new_password
        ):
            return {"status": "error", "message": "Current and new passwords are required."}, 400

        identity = get_jwt_identity()
        admin = None
        if isinstance(identity, str) and identity.isdecimal():
            admin = db.session.get(Admin, int(identity))
        if not admin or not admin.check_password(current_password):
            return {"status": "error", "message": "Current password is incorrect."}, 401

        admin.set_password(new_password)
        db.session.commit()
        return {"status": "success", "message": "Password updated successfully."}, 200


api.add_resource(Login, "/api/auth/login")
api.add_resource(ChangePassword, "/api/admin/password/change")
