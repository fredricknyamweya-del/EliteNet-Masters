"""
Business Pay Bill (B2B) settlement scheduled job.

Daily batch sweep to forward collected M-Pesa funds from the business Utility account
to the configured Co-operative Bank account (Paybill 400200).

This job:
1. Calculates the settlement period (typically previous calendar day)
2. Queries confirmed transactions from that period
3. Checks for existing settlement record (idempotency)
4. If not exists, sums amounts and submits B2B request
5. Stores result in B2BSettlement table for audit trail

Environment variable:
- B2B_SETTLEMENT_ENABLED: Set to "true" to enable this job (default: false for safety)

Run frequency:
- Typically daily via Render Cron Job (see render.yaml)
- Can also be triggered manually via admin endpoint
"""

import json
import logging
import os
from datetime import datetime, timedelta
from decimal import Decimal

from app import app as flask_app
from app.extensions import db
from models.models import Transaction, B2BSettlement
from services.b2b_service import submit_b2b_request

logger = logging.getLogger(__name__)


def get_settlement_period_transactions(settlement_date):
    """
    Query confirmed transactions from a specific date.
    
    Returns transactions that:
    - Have status='success' (confirmed M-Pesa payment)
    - Have paid_at on the specified date
    - Total amount to be forwarded
    
    Args:
        settlement_date: datetime.date object for the settlement period
        
    Returns:
        List of Transaction objects matching criteria
    """
    start_of_day = datetime.combine(settlement_date, datetime.min.time())
    end_of_day = datetime.combine(settlement_date, datetime.max.time())
    
    return Transaction.query.filter(
        Transaction.status == "success",
        Transaction.paid_at >= start_of_day,
        Transaction.paid_at <= end_of_day,
    ).all()


def calculate_settlement_amount(transactions):
    """
    Sum the amount_paid from a list of transactions.
    
    Args:
        transactions: List of Transaction objects
        
    Returns:
        Decimal amount, or 0 if no transactions
    """
    if not transactions:
        return Decimal("0.00")
    
    total = Decimal("0.00")
    for txn in transactions:
        if txn.amount_paid:
            total += Decimal(str(txn.amount_paid))
    
    return total


def check_settlement_exists(settlement_date):
    """
    Check if a settlement attempt already exists for this period.
    
    Prevents duplicate forwarding of the same collected funds.
    
    Args:
        settlement_date: datetime.date object
        
    Returns:
        B2BSettlement record if exists, None otherwise
    """
    return B2BSettlement.query.filter(
        B2BSettlement.settlement_period == settlement_date,
        B2BSettlement.status.in_(["pending", "submitted", "success"])
    ).first()


def run_b2b_settlement(settlement_date=None):
    """
    Run the B2B settlement job for a specific date.
    
    Typical flow:
    1. Query transactions from settlement_date
    2. Calculate total
    3. Check for existing settlement (idempotency)
    4. If new, create B2BSettlement record and submit request
    5. Return summary
    
    Args:
        settlement_date: datetime.date object (default: yesterday)
        
    Returns:
        Dict with summary of the settlement run
    """
    # Default to yesterday if not specified
    if settlement_date is None:
        settlement_date = (datetime.utcnow() - timedelta(days=1)).date()
    
    # Check if job is enabled (safety flag)
    enabled = os.getenv("B2B_SETTLEMENT_ENABLED", "false").lower() == "true"
    if not enabled:
        logger.warning(
            json.dumps({
                "event": "b2b_settlement_disabled",
                "settlement_date": settlement_date.isoformat(),
                "message": "B2B_SETTLEMENT_ENABLED not set to 'true'; skipping",
            })
        )
        return {
            "settlement_date": settlement_date.isoformat(),
            "status": "skipped",
            "reason": "B2B_SETTLEMENT_ENABLED not set to 'true'",
            "transaction_count": 0,
            "settlement_amount": "0.00",
        }
    
    try:
        logger.info(
            json.dumps({
                "event": "b2b_settlement_start",
                "settlement_date": settlement_date.isoformat(),
            })
        )
        
        # Query confirmed transactions from the settlement period
        transactions = get_settlement_period_transactions(settlement_date)
        transaction_count = len(transactions)
        
        # Calculate total amount
        settlement_amount = calculate_settlement_amount(transactions)
        
        logger.info(
            json.dumps({
                "event": "b2b_settlement_transactions_queried",
                "settlement_date": settlement_date.isoformat(),
                "transaction_count": transaction_count,
                "settlement_amount": str(settlement_amount),
            })
        )
        
        # Check for existing settlement (idempotency)
        existing = check_settlement_exists(settlement_date)
        if existing:
            logger.warning(
                json.dumps({
                    "event": "b2b_settlement_already_exists",
                    "settlement_date": settlement_date.isoformat(),
                    "existing_settlement_id": existing.id,
                    "existing_status": existing.status,
                    "message": "Settlement for this period already submitted; skipping duplicate",
                })
            )
            return {
                "settlement_date": settlement_date.isoformat(),
                "status": "skipped",
                "reason": "Settlement already exists for this period",
                "existing_settlement_id": existing.id,
                "existing_status": existing.status,
                "transaction_count": transaction_count,
                "settlement_amount": str(settlement_amount),
            }
        
        # If no transactions or zero amount, skip submission
        if settlement_amount <= 0:
            logger.info(
                json.dumps({
                    "event": "b2b_settlement_no_amount",
                    "settlement_date": settlement_date.isoformat(),
                    "transaction_count": transaction_count,
                    "message": "No confirmed transactions to forward; skipping submission",
                })
            )
            return {
                "settlement_date": settlement_date.isoformat(),
                "status": "skipped",
                "reason": "No confirmed transactions to forward",
                "transaction_count": transaction_count,
                "settlement_amount": "0.00",
            }
        
        # Create B2BSettlement record in "pending" state
        settlement = B2BSettlement(
            settlement_period=settlement_date,
            amount_requested=settlement_amount,
            status="pending",
        )
        db.session.add(settlement)
        db.session.flush()  # Flush to get ID but don't commit yet
        
        # Submit B2B request to Daraja
        response, status_code = submit_b2b_request(
            amount=float(settlement_amount),
            settlement_period_date=settlement_date,
        )
        
        if status_code != 200:
            # Request failed
            error_message = response.get("message", "Unknown error") if response else "No response"
            settlement.status = "failed"
            settlement.result_description = f"Request submission failed: {error_message}"
            settlement.completed_at = datetime.utcnow()
            db.session.commit()
            
            logger.error(
                json.dumps({
                    "event": "b2b_settlement_request_failed",
                    "settlement_date": settlement_date.isoformat(),
                    "settlement_id": settlement.id,
                    "http_status": status_code,
                    "error": error_message,
                })
            )
            
            return {
                "settlement_date": settlement_date.isoformat(),
                "status": "failed",
                "reason": "B2B request submission failed",
                "settlement_id": settlement.id,
                "http_status": status_code,
                "error": error_message,
                "transaction_count": transaction_count,
                "settlement_amount": str(settlement_amount),
            }
        
        # Request succeeded (accepted for processing)
        daraja_request_id = response.get("daraja_request_id")
        settlement.status = "submitted"
        settlement.daraja_request_id = daraja_request_id
        settlement.submitted_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(
            json.dumps({
                "event": "b2b_settlement_submitted",
                "settlement_date": settlement_date.isoformat(),
                "settlement_id": settlement.id,
                "daraja_request_id": daraja_request_id,
                "transaction_count": transaction_count,
                "settlement_amount": str(settlement_amount),
                "message": "B2B settlement request submitted; awaiting async callback",
            })
        )
        
        return {
            "settlement_date": settlement_date.isoformat(),
            "status": "submitted",
            "settlement_id": settlement.id,
            "daraja_request_id": daraja_request_id,
            "transaction_count": transaction_count,
            "settlement_amount": str(settlement_amount),
        }
        
    except Exception as e:
        logger.exception(
            json.dumps({
                "event": "b2b_settlement_error",
                "settlement_date": settlement_date.isoformat(),
                "error": str(e),
            })
        )
        return {
            "settlement_date": settlement_date.isoformat(),
            "status": "error",
            "error": str(e),
            "transaction_count": 0,
            "settlement_amount": "0.00",
        }


if __name__ == "__main__":
    """
    Entry point for Render Cron Job execution.
    
    Scheduled to run daily via render.yaml:
    schedule: "0 2 * * *"  (2 AM UTC daily)
    """
    with flask_app.app_context():
        summary = run_b2b_settlement()
        logger.info(
            json.dumps({
                "event": "b2b_settlement_job_complete",
                "summary": summary,
            })
        )