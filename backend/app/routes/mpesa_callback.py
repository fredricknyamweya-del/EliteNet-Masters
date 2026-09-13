import json
from flask import Blueprint, request, current_app, jsonify
from app.services.mpesa.callback import (
    parse_stk_callback,
    is_duplicate_checkout,
    trigger_background_emit,
    PaymentCallbackEvent,
)
from uuid import uuid4


mpesa_bp = Blueprint("mpesa_callback", __name__)


@mpesa_bp.post("/api/mpesa/callback")
def mpesa_callback():
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    payload = request.get_json(silent=True) or {}

    # Always ack Safaricom quickly
    ack = {"ResultCode": 0, "ResultDesc": "Success"}

    try:
        # Basic IP allowlist check (optional): configured as comma separated
        allowlist = current_app.config.get("MPESA_CALLBACK_IP_ALLOWLIST")
        if allowlist:
            # If configured, validate remote addr
            allowed = [a.strip() for a in allowlist.split(",") if a.strip()]
            remote = request.remote_addr or ""
            if remote not in allowed:
                current_app.logger.warning(
                    json.dumps({
                        "event": "mpesa_callback_ip_reject",
                        "request_id": request_id,
                        "remote_addr": remote,
                    })
                )
                # Still return ack to Safaricom but do not process
                return jsonify(ack), 200

        parsed = parse_stk_callback(payload)

        # Structured log for audit
        current_app.logger.info(
            json.dumps(
                {
                    "event": "mpesa_callback_received",
                    "request_id": request_id,
                    "checkout_request_id": parsed.checkout_request_id,
                    "result_code": parsed.result_code,
                }
            )
        )

        # Idempotency: dedupe on CheckoutRequestID
        if is_duplicate_checkout(parsed.checkout_request_id):
            current_app.logger.info(
                json.dumps(
                    {
                        "event": "mpesa_callback_duplicate",
                        "request_id": request_id,
                        "checkout_request_id": parsed.checkout_request_id,
                    }
                )
            )
            return jsonify(ack), 200

        # Fire-and-forget handoff to persistence (background)
        trigger_background_emit(current_app, parsed)

        # emit simple metric via logs
        metric = (
            "mpesa_callback_success=1"
            if parsed.status == "success"
            else "mpesa_callback_failed=1"
        )
        current_app.logger.info(json.dumps({"metric": metric, "request_id": request_id}))

    except Exception as exc:
        # parse_stk_callback should never raise, but guard anyway
        current_app.logger.exception(
            json.dumps({"event": "mpesa_callback_error", "request_id": request_id, "error": str(exc)})
        )

    # Always ack with 200 JSON payload required by Daraja
    return jsonify(ack), 200