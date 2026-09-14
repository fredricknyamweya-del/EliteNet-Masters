import json
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from uuid import uuid4
from zoneinfo import ZoneInfo

from flask import current_app, request
from flask_restful import Resource

from extensions import api
from services.payment_service import update_transaction_from_callback


def _log(level, event, **fields):
    """Logging must never prevent acknowledgement or payment processing."""
    try:
        getattr(current_app.logger, level)(json.dumps({"event": event, **fields}))
    except Exception:
        pass


class MpesaCallback(Resource):
    def post(self):
        ack = {"ResultCode": 0, "ResultDesc": "Success"}
        request_id = None
        try:
            request_id = request.headers.get("X-Request-ID") or str(uuid4())
            allowlist = current_app.config.get("MPESA_CALLBACK_IP_ALLOWLIST")
            if allowlist:
                allowed = [address.strip() for address in allowlist.split(",") if address.strip()]
                if (request.remote_addr or "") not in allowed:
                    _log("warning", "mpesa_callback_ip_reject", request_id=request_id,
                         remote_addr=request.remote_addr)
                    return ack, 200

            try:
                payload = request.get_json(silent=True)
                if not isinstance(payload, dict) or not isinstance(payload.get("Body"), dict):
                    raise ValueError("Missing Body object")
                callback = payload["Body"].get("stkCallback")
                if not isinstance(callback, dict):
                    raise ValueError("Missing stkCallback object")
                checkout = callback.get("CheckoutRequestID")
                code = callback.get("ResultCode")
                description = callback.get("ResultDesc")
                if not isinstance(checkout, str) or not checkout.strip():
                    raise ValueError("Missing CheckoutRequestID")
                if isinstance(code, bool) or not isinstance(code, (int, str)):
                    raise ValueError("Invalid ResultCode")
                code = int(code)
                if not isinstance(description, str):
                    raise ValueError("Missing ResultDesc")
                receipt = amount = paid_at = None
                if code == 0:
                    metadata = callback.get("CallbackMetadata")
                    if not isinstance(metadata, dict) or not isinstance(metadata.get("Item"), list):
                        raise ValueError("Missing success metadata")
                    values = {}
                    for item in metadata["Item"]:
                        if not isinstance(item, dict) or not isinstance(item.get("Name"), str):
                            raise ValueError("Invalid metadata item")
                        values[item["Name"]] = item.get("Value")
                    receipt = values.get("MpesaReceiptNumber")
                    if not isinstance(receipt, str) or not receipt.strip():
                        raise ValueError("Missing MpesaReceiptNumber")
                    amount = Decimal(str(values.get("Amount")))
                    if not amount.is_finite() or amount <= 0:
                        raise ValueError("Invalid Amount")
                    date = str(values.get("TransactionDate"))
                    if len(date) != 14 or not date.isascii() or not date.isdigit():
                        raise ValueError("Invalid TransactionDate")
                    # Daraja timestamps are Nairobi local time; models use naive UTC.
                    paid_at = datetime.strptime(date, "%Y%m%d%H%M%S").replace(
                        tzinfo=ZoneInfo("Africa/Nairobi")
                    ).astimezone(timezone.utc).replace(tzinfo=None)
            except (ValueError, TypeError, InvalidOperation):
                _log("warning", "mpesa_callback_malformed", request_id=request_id)
                return ack, 200

            transaction, updated = update_transaction_from_callback(
                checkout_request_id=checkout.strip(),
                result_code=code,
                result_description=description,
                mpesa_receipt_number=receipt,
                amount_paid=amount,
                paid_at=paid_at,
            )
            if transaction is None:
                event, level = "mpesa_callback_unknown_transaction", "warning"
            elif not updated:
                event, level = "mpesa_callback_duplicate_or_terminal", "info"
            else:
                event, level = "mpesa_callback_updated", "info"
            _log(level, event, request_id=request_id,
                 checkout_request_id=checkout, result_code=code)
        except Exception:
            _log("exception", "mpesa_callback_error", request_id=request_id)
        return ack, 200


api.add_resource(MpesaCallback, "/api/mpesa/callback")
