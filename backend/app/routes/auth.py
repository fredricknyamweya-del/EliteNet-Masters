from flask import Blueprint, g, jsonify, request

from services.auth import issue_admin_token, require_admin_auth, verify_admin_credentials


auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/api/auth/login")
def login():
    payload = request.get_json(silent=True) or {}
    username = payload.get("username")
    password = payload.get("password")

    admin = verify_admin_credentials(username, password)
    if not admin:
        return jsonify({"status": "error", "message": "Invalid username or password"}), 401

    token = issue_admin_token(admin)
    return (
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


@auth_bp.post("/api/admin/password/change")
@require_admin_auth
def change_password():
    payload = request.get_json(silent=True) or {}
    current_password = payload.get("current_password")
    new_password = payload.get("new_password")

    if not current_password or not new_password:
        return jsonify({"status": "error", "message": "Current and new passwords are required."}), 400

    admin = g.get("current_admin")
    if not admin or not admin.verify_password(current_password):
        return jsonify({"status": "error", "message": "Current password is incorrect."}), 401

    admin.set_password(new_password)
    from app.extensions import db
    db.session.commit()

    return jsonify({"status": "success", "message": "Password updated successfully."}), 200