from flask import Blueprint, jsonify, request


callback_bp = Blueprint("callback", __name__)


@callback_bp.post("/api/callback")
def mpesa_callback():
    payload = request.get_json(silent=True) or {}
    return jsonify({"message": "Callback received", "payload": payload}), 200