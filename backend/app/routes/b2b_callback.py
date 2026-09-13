"""
Business Pay Bill (B2B) callback routes.

Handles async callbacks from Daraja B2B API:
- QueueTimeOutURL: Invoked if request isn't processed within timeout window
- ResultURL: Invoked with final result (success/failure)

Both use the fast-ack pattern: return 200 JSON immediately, then process
the callback asynchronously to avoid Daraja timeout.
"""

import json
from flask import Blueprint, request, current_app, jsonify
from uuid import uuid4

from services.b2b_service import (
    parse_b2b_result_callback,
    parse_b2b_timeout_callback,
    update_b2b_settlement_from_result,
    update_b2b_settlement_from_timeout,
)


b2b_callback_bp = Blueprint("b2b_callback", __name__)


@b2b_callback_bp.post("/api/b2b/result")
def b2b_result():
    """
    Handle B2B result callback from Daraja.
    
    Called when the B2B settlement request completes (success or failure).
    The ResultURL is configured at request submission time.
    
    Expected payload (from Daraja):
    {
        "Result": {
            "ResultCode": 0,  # 0 = success
            "ResultDesc": "success",
            "ConversationID": "...",
            "TransactionID": "...",
            "ResultParameters": { ... }
        }
    }
    """
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    payload = request.get_json(silent=True) or {}
    
    # Always ack Daraja quickly with 200 JSON
    ack = {"ResultCode": 0, "ResultDesc": "Success"}
    
    try:
        # Log receipt
        current_app.logger.info(
            json.dumps({
                "event": "b2b_result_callback_received",
                "request_id": request_id,
            })
        )
        
        # Parse the callback
        parsed = parse_b2b_result_callback(payload)
        if not parsed:
            current_app.logger.error(
                json.dumps({
                    "event": "b2b_result_callback_parse_failed",
                    "request_id": request_id,
                })
            )
            return jsonify(ack), 200
        
        # Extract the request ID that we need to match against
        # Daraja sends back the OriginatorConversationID (which we sent)
        daraja_request_id = parsed.get("originator_conversation_id")
        if not daraja_request_id:
            # Fallback to ConversationID if OriginatorConversationID not present
            daraja_request_id = parsed.get("conversation_id")
        
        if not daraja_request_id:
            current_app.logger.error(
                json.dumps({
                    "event": "b2b_result_callback_no_request_id",
                    "request_id": request_id,
                })
            )
            return jsonify(ack), 200
        
        # Update the settlement record
        updated = update_b2b_settlement_from_result(
            daraja_request_id=daraja_request_id,
            result_code=parsed.get("result_code"),
            result_description=parsed.get("result_description"),
            transaction_id=parsed.get("transaction_id"),
        )
        
        if updated:
            current_app.logger.info(
                json.dumps({
                    "event": "b2b_result_callback_success",
                    "request_id": request_id,
                    "daraja_request_id": daraja_request_id,
                    "result_code": parsed.get("result_code"),
                })
            )
        else:
            current_app.logger.warning(
                json.dumps({
                    "event": "b2b_result_callback_settlement_not_found",
                    "request_id": request_id,
                    "daraja_request_id": daraja_request_id,
                })
            )
        
    except Exception as exc:
        current_app.logger.exception(
            json.dumps({
                "event": "b2b_result_callback_error",
                "request_id": request_id,
                "error": str(exc),
            })
        )
    
    # Always return 200 JSON per Daraja spec
    return jsonify(ack), 200


@b2b_callback_bp.post("/api/b2b/queue-timeout")
def b2b_queue_timeout():
    """
    Handle B2B queue timeout callback from Daraja.
    
    Called if the B2B request isn't processed within the timeout window
    (typically a few hours). Indicates an "unknown outcome" state — 
    we don't know if the payment went through or not.
    
    Settlement status changes to "timeout" and requires manual review.
    
    Expected payload structure (from Daraja):
    {
        "ResultCode": <code>,
        "ResultDesc": "Request timeout",
        "ConversationID": "...",
        "OriginatorConversationID": "..."
    }
    """
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    payload = request.get_json(silent=True) or {}
    
    # Always ack Daraja quickly with 200 JSON
    ack = {"ResultCode": 0, "ResultDesc": "Success"}
    
    try:
        # Log receipt
        current_app.logger.info(
            json.dumps({
                "event": "b2b_timeout_callback_received",
                "request_id": request_id,
            })
        )
        
        # Parse the timeout callback
        parsed = parse_b2b_timeout_callback(payload)
        if not parsed:
            current_app.logger.error(
                json.dumps({
                    "event": "b2b_timeout_callback_parse_failed",
                    "request_id": request_id,
                })
            )
            return jsonify(ack), 200
        
        # Extract request ID for matching
        daraja_request_id = parsed.get("originator_conversation_id")
        if not daraja_request_id:
            # Fallback to ConversationID
            daraja_request_id = parsed.get("conversation_id")
        
        if not daraja_request_id:
            current_app.logger.error(
                json.dumps({
                    "event": "b2b_timeout_callback_no_request_id",
                    "request_id": request_id,
                })
            )
            return jsonify(ack), 200
        
        # Update the settlement record
        updated = update_b2b_settlement_from_timeout(
            daraja_request_id=daraja_request_id,
            result_description=parsed.get("result_description"),
        )
        
        if updated:
            current_app.logger.warning(
                json.dumps({
                    "event": "b2b_timeout_callback_success",
                    "request_id": request_id,
                    "daraja_request_id": daraja_request_id,
                    "message": "B2B settlement timed out; manual review recommended",
                })
            )
        else:
            current_app.logger.warning(
                json.dumps({
                    "event": "b2b_timeout_callback_settlement_not_found",
                    "request_id": request_id,
                    "daraja_request_id": daraja_request_id,
                })
            )
        
    except Exception as exc:
        current_app.logger.exception(
            json.dumps({
                "event": "b2b_timeout_callback_error",
                "request_id": request_id,
                "error": str(exc),
            })
        )
    
    # Always return 200 JSON per Daraja spec
    return jsonify(ack), 200