from flask import Blueprint, current_app, jsonify, request

from app.extensions import db
from services.daraja import trigger_stk_push
from services.payment_service import (
    create_pending_transaction,
    expire_stale_pending_transaction,
    get_transaction_status,
)


stkpush_bp = Blueprint("stkpush", __name__)


@stkpush_bp.post("/api/stkpush")
def stkpush():
    """
    Initiate STK Push payment request.
    
    Expected payload:
    {
        "phone_number": "0708419329",  # Kenyan number format
        "package_id": 1,                # ID of the package/plan to purchase
        "amount": 100                   # Amount in KES (optional, derived from package if not provided)
    }
    """
    try:
        payload = request.get_json(silent=True) or {}
        
        # Validate required fields
        phone_number = payload.get("phone_number")
        package_id = payload.get("package_id")
        amount = payload.get("amount")
        
        if not phone_number:
            return jsonify({
                "status": "error",
                "message": "Phone number is required."
            }), 400
        
        if not package_id:
            return jsonify({
                "status": "error",
                "message": "Package ID is required."
            }), 400
        
        if amount is None:
            return jsonify({
                "status": "error",
                "message": "Amount is required."
            }), 400
        
        # Validate amount is a number and positive
        try:
            amount = float(amount)
            if amount <= 0:
                return jsonify({
                    "status": "error",
                    "message": "Amount must be greater than 0."
                }), 400
            if amount > 500000:  # Set reasonable max limit
                return jsonify({
                    "status": "error",
                    "message": "Amount exceeds maximum limit of 500,000."
                }), 400
        except (ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": "Amount must be a valid number."
            }), 400
        
        # Validate package exists
        try:
            from models.models import Package
            package = Package.query.get(package_id)
            if not package:
                return jsonify({
                    "status": "error",
                    "message": "Package not found."
                }), 404
        except Exception as e:
            current_app.logger.exception(f"Error validating package: {str(e)}")
            return jsonify({
                "status": "error",
                "message": "An error occurred while validating the package."
            }), 500
        
        # Validate and normalize phone number
        from services.daraja import validate_phone_number
        is_valid, normalized_phone, error_msg = validate_phone_number(phone_number)
        if not is_valid:
            return jsonify({
                "status": "error",
                "message": error_msg
            }), 400
        
        # Trigger STK Push with Daraja
        stk_response, stk_status_code = trigger_stk_push(normalized_phone, amount)
        
        # If STK Push failed, return error immediately (no transaction created)
        if stk_status_code != 200:
            return jsonify(stk_response), stk_status_code
        
        # Extract checkout_request_id from successful response
        checkout_request_id = stk_response.get("checkout_request_id")
        merchant_request_id = stk_response.get("merchant_request_id")
        
        if not checkout_request_id:
            current_app.logger.error(
                "STK Push succeeded but no checkout_request_id returned"
            )
            return jsonify({
                "status": "error",
                "message": "Payment request failed. Please try again."
            }), 500
        
        # Create pending transaction to match callback
        try:
            transaction, created = create_pending_transaction(
                phone_number=normalized_phone,
                package_id=package_id,
                checkout_request_id=checkout_request_id,
                merchant_request_id=merchant_request_id,
                client_id=None,  # Client is identified by phone_number in callback
            )
            
            current_app.logger.info(
                f"Pending transaction created - ID: {transaction.id}, "
                f"CheckoutRequestID: {checkout_request_id}, "
                f"Phone: {normalized_phone}"
            )
            
            # Return success response with transaction details
            return jsonify({
                "status": "pending",
                "message": "STK push request sent successfully",
                "transaction_id": transaction.id,
                "checkout_request_id": checkout_request_id,
                "merchant_request_id": merchant_request_id,
                "phone_number": stk_response.get("phone_number"),
                "amount": stk_response.get("amount"),
            }), 200
            
        except Exception as e:
            current_app.logger.exception(
                f"Error creating pending transaction for CheckoutRequestID "
                f"{checkout_request_id}: {str(e)}"
            )
            # Even if transaction creation fails, STK was sent to user
            # Log this for manual reconciliation
            return jsonify({
                "status": "error",
                "message": "STK push sent but unable to track request. "
                          "Please contact support."
            }), 500
        
    except Exception as e:
        current_app.logger.exception("Unexpected error in STK Push endpoint")
        return jsonify({
            "status": "error",
            "message": "An error occurred while processing the payment request."
        }), 500


@stkpush_bp.get("/api/payment/status/<int:transaction_id>")
def payment_status(transaction_id):
    try:
        transaction = get_transaction_status(transaction_id)
        if transaction is not None:
            transaction, _ = expire_stale_pending_transaction(
                transaction,
                timeout_minutes=current_app.config[
                    "MPESA_STK_TIMEOUT_MINUTES"
                ],
            )
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Unable to load payment status for transaction %s", transaction_id
        )
        return jsonify({
            "status": "error",
            "message": "Unable to check payment status.",
        }), 500

    if transaction is None:
        return jsonify({
            "status": "error",
            "message": "Transaction not found.",
            "transaction_id": transaction_id,
        }), 404

    messages = {
        "pending": "Payment is pending.",
        "success": "Payment completed successfully.",
        "failed": transaction.result_description or "Payment failed.",
    }
    response = {
        "transaction_id": transaction.id,
        "status": transaction.status,
        "result_code": transaction.result_code,
        "result_description": transaction.result_description,
        "message": messages[transaction.status],
    }

    if transaction.status == "success":
        response.update({
            "mpesa_receipt_number": transaction.mpesa_receipt_number,
            "amount_paid": (
                str(transaction.amount_paid)
                if transaction.amount_paid is not None
                else None
            ),
            "paid_at": (
                transaction.paid_at.isoformat()
                if transaction.paid_at
                else None
            ),
        })

    return jsonify(response), 200