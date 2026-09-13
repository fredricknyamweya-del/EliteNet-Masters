from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional, Tuple

from sqlalchemy.exc import IntegrityError

from extensions import db
from models.models import Client, Package, Transaction


def create_pending_transaction(
    phone_number: str,
    package_id: int,
    checkout_request_id: str,
    merchant_request_id: Optional[str] = None,
    client_id: Optional[int] = None,
) -> Tuple[Transaction, bool]:
    """Persist an accepted STK Push request as a pending transaction.

    Returns the transaction and a boolean indicating whether it was newly
    created. Repeated calls with the same CheckoutRequestID return the
    existing transaction without creating a duplicate.
    """
    phone_number = str(phone_number).strip() if phone_number is not None else ""
    checkout_request_id = (
        str(checkout_request_id).strip()
        if checkout_request_id is not None
        else ""
    )

    if not phone_number:
        raise ValueError("phone_number is required")
    if not checkout_request_id:
        raise ValueError("checkout_request_id is required")

    try:
        existing_transaction = Transaction.query.filter_by(
            checkout_request_id=checkout_request_id
        ).first()
        if existing_transaction is not None:
            return existing_transaction, False

        package = Package.query.get(package_id)
        if package is None:
            raise ValueError("Package not found")

        if client_id is not None and Client.query.get(client_id) is None:
            raise ValueError("Client not found")

        transaction = Transaction(
            phone_number=phone_number,
            package_id=package.id,
            client_id=client_id,
            status="pending",
            checkout_request_id=checkout_request_id,
            merchant_request_id=merchant_request_id,
        )
        db.session.add(transaction)
        db.session.commit()
        return transaction, True
    except IntegrityError:
        # The unique CheckoutRequestID constraint handles concurrent retries.
        db.session.rollback()
        existing_transaction = Transaction.query.filter_by(
            checkout_request_id=checkout_request_id
        ).first()
        if existing_transaction is not None:
            return existing_transaction, False
        raise
    except Exception:
        db.session.rollback()
        raise


def update_transaction_from_callback(
    checkout_request_id: str,
    result_code: int,
    result_description: str,
    mpesa_receipt_number: Optional[str] = None,
    amount_paid: Optional[Decimal] = None,
    paid_at: Optional[datetime] = None,
) -> Tuple[Optional[Transaction], bool]:
    """Apply a validated M-Pesa callback to its pending transaction.

    Returns the matched transaction and whether it was updated. A missing
    transaction returns ``(None, False)``, while callbacks for transactions
    already in a terminal state return the existing row with ``False``.
    """
    checkout_request_id = (
        str(checkout_request_id).strip()
        if checkout_request_id is not None
        else ""
    )
    if not checkout_request_id:
        raise ValueError("checkout_request_id is required")

    try:
        result_code = int(result_code)
        transaction = (
            Transaction.query.filter_by(
                # matching transaction
                checkout_request_id=checkout_request_id
            )
            .with_for_update()
            .first()
        )

        if transaction is None:
            return None, False 
        #return None when a transaction is missing or none with a bool value (false )meaning transaction was'nt updated 

        if transaction.status in ("success", "failed"):
            return transaction, False

        transaction.result_code = result_code
        transaction.result_description = (
            str(result_description) if result_description is not None else ""
        )

        if result_code == 0:
            transaction.status = "success"
            if mpesa_receipt_number is not None:
                transaction.mpesa_receipt_number = str(mpesa_receipt_number)
            if amount_paid is not None:
                transaction.amount_paid = Decimal(str(amount_paid))
            if paid_at is not None:
                transaction.paid_at = paid_at
        else:
            transaction.status = "failed"

        db.session.commit()
        return transaction, True # update the transaction(callback persistence)
    except Exception:
        db.session.rollback()
        raise


def get_transaction_status(transaction_id: int) -> Optional[Transaction]:
    """Return a transaction by its internal ID without modifying it."""
    return Transaction.query.get(transaction_id)


def expire_stale_pending_transaction(
    transaction: Transaction,
    timeout_minutes: int,
) -> Tuple[Transaction, bool]:
    """Fail a pending transaction once its configured STK timeout passes."""
    timeout_minutes = int(timeout_minutes)
    if timeout_minutes <= 0:
        raise ValueError("timeout_minutes must be greater than zero")

    if transaction.status != "pending":
        return transaction, False

    try:
        # Re-read with a lock where supported so a callback cannot be
        # overwritten after finalizing the same transaction concurrently.
        locked_transaction = (
            Transaction.query.filter_by(id=transaction.id)
            .with_for_update()
            .first()
        )
        if locked_transaction is None:
            return transaction, False

        if locked_transaction.status != "pending":
            return locked_transaction, False

        created_at = locked_transaction.created_at
        if created_at.tzinfo is None:
            current_time = datetime.utcnow()
        else:
            current_time = datetime.now(timezone.utc)

        timeout_at = created_at + timedelta(minutes=timeout_minutes)
        if current_time < timeout_at:
            return locked_transaction, False

        locked_transaction.status = "failed"
        locked_transaction.result_code = None
        locked_transaction.result_description = "Payment request timed out."
        db.session.commit()
        return locked_transaction, True
    except Exception:
        db.session.rollback()
        raise