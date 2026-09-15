from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Enum
from sqlalchemy.orm import relationship

from extensions import db


class Admin(db.Model):
    __tablename__ = "admins"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(100), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    def set_password(self, password):
        from flask_bcrypt import generate_password_hash

        self.password_hash = generate_password_hash(password).decode("utf-8")

    def verify_password(self, password):
        from flask_bcrypt import check_password_hash

        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Client(db.Model):
    __tablename__ = "clients"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    phone_number = db.Column(db.String(15), nullable=False, unique=True, index=True)
    full_name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(100), nullable=True)
    username = db.Column(db.String(50), nullable=True, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    transactions = db.relationship("Transaction", backref="client", lazy=True)
    devices = db.relationship("Device", backref="client", lazy=True)
    redeemed_vouchers = db.relationship(
        "Voucher",
        backref="redeemer",
        lazy=True,
        foreign_keys="Voucher.redeemed_by",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "phone_number": self.phone_number,
            "full_name": self.full_name,
            "email": self.email,
            "username": self.username,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Package(db.Model):
    __tablename__ = "packages"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    transactions = db.relationship("Transaction", backref="package", lazy=True)
    vouchers = db.relationship("Voucher", backref="package", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": str(self.price) if self.price is not None else None,
            "duration_minutes": self.duration_minutes,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Transaction(db.Model):
    __tablename__ = "transactions"

    STATUS_ENUM = db.Enum(
        "pending",
        "success",
        "failed",
        name="transaction_status",
        native_enum=False,
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    phone_number = db.Column(db.String(15), nullable=False, index=True)
    package_id = db.Column(db.Integer, db.ForeignKey("packages.id"), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey("clients.id"), nullable=True)
    status = db.Column(STATUS_ENUM, nullable=False, default="pending", index=True)
    checkout_request_id = db.Column(db.String(100), nullable=True, unique=True, index=True)
    merchant_request_id = db.Column(db.String(100), nullable=True)
    mpesa_receipt_number = db.Column(db.String(20), nullable=True, unique=True, index=True)
    result_code = db.Column(db.Integer, nullable=True)
    result_description = db.Column(db.String(255), nullable=True)
    amount_paid = db.Column(db.Numeric(10, 2), nullable=True)
    paid_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    session = db.relationship("Session", backref="transaction", uselist=False, lazy=True)

    def to_dict(self):
        amount_value = None
        if isinstance(self.amount_paid, Decimal):
            amount_value = str(self.amount_paid)
        elif self.amount_paid is not None:
            amount_value = str(self.amount_paid)

        return {
            "id": self.id,
            "phone_number": self.phone_number,
            "package_id": self.package_id,
            "client_id": self.client_id,
            "status": self.status,
            "checkout_request_id": self.checkout_request_id,
            "merchant_request_id": self.merchant_request_id,
            "mpesa_receipt_number": self.mpesa_receipt_number,
            "result_code": self.result_code,
            "result_description": self.result_description,
            "amount_paid": amount_value,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Voucher(db.Model):
    __tablename__ = "vouchers"

    STATUS_ENUM = db.Enum(
        "unused",
        "redeemed",
        "expired",
        name="voucher_status",
        native_enum=False,
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    code = db.Column(db.String(50), nullable=False, unique=True, index=True)
    package_id = db.Column(db.Integer, db.ForeignKey("packages.id"), nullable=False)
    redeemed_by = db.Column(db.Integer, db.ForeignKey("clients.id"), nullable=True)
    status = db.Column(STATUS_ENUM, nullable=False, default="unused", index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    redeemed_at = db.Column(db.DateTime, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True, index=True)

    session = db.relationship("Session", backref="voucher", uselist=False, lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "code": self.code,
            "package_id": self.package_id,
            "redeemed_by": self.redeemed_by,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "redeemed_at": self.redeemed_at.isoformat() if self.redeemed_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }


class Device(db.Model):
    __tablename__ = "devices"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    client_id = db.Column(db.Integer, db.ForeignKey("clients.id"), nullable=False)
    mac_address = db.Column(db.String(20), nullable=False, unique=True, index=True)
    device_name = db.Column(db.String(100), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    last_seen_at = db.Column(db.DateTime, nullable=True)

    sessions = db.relationship("Session", backref="device", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "client_id": self.client_id,
            "mac_address": self.mac_address,
            "device_name": self.device_name,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None,
        }


class Router(db.Model):
    __tablename__ = "routers"

    STATUS_ENUM = db.Enum(
        "online",
        "offline",
        "restarting",
        name="router_status",
        native_enum=False,
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    ip_address = db.Column(db.String(45), nullable=False, unique=True, index=True)
    location = db.Column(db.String(100), nullable=True)
    status = db.Column(STATUS_ENUM, nullable=False, default="offline", index=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    last_seen_at = db.Column(db.DateTime, nullable=True)

    sessions = db.relationship("Session", backref="router", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "ip_address": self.ip_address,
            "location": self.location,
            "status": self.status,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_seen_at": self.last_seen_at.isoformat() if self.last_seen_at else None,
        }


class Session(db.Model):
    __tablename__ = "sessions"

    __table_args__ = (
        CheckConstraint(
            """
            (transaction_id IS NOT NULL AND voucher_id IS NULL)
            OR
            (transaction_id IS NULL AND voucher_id IS NOT NULL)
            """,
            name="check_session_exactly_one_access_source",
        ),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    device_id = db.Column(db.Integer, db.ForeignKey("devices.id"), nullable=True)
    router_id = db.Column(db.Integer, db.ForeignKey("routers.id"), nullable=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey("transactions.id"), nullable=True, unique=True)
    voucher_id = db.Column(db.Integer, db.ForeignKey("vouchers.id"), nullable=True, unique=True)
    phone_number = db.Column(db.String(15), nullable=True, index=True)
    routeros_username = db.Column(db.String(50), nullable=True)
    started_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    ip_address = db.Column(db.String(45), nullable=True)
    mac_address = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "transaction_id": self.transaction_id,
            "device_id": self.device_id,
            "router_id": self.router_id,
            "voucher_id": self.voucher_id,
            "phone_number": self.phone_number,
            "routeros_username": self.routeros_username,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "is_active": self.is_active,
            "ip_address": self.ip_address,
            "mac_address": self.mac_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
