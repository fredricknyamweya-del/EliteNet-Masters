import os
from datetime import datetime, timedelta
from decimal import Decimal

from flask import Flask

from config import config_by_name
from extensions import bcrypt, db
from app.models import Admin, Package, Client, Device, Router, Session, Transaction, Voucher


def create_app_for_seed():
    app = Flask(__name__)
    config_name = os.getenv("FLASK_ENV", "development")
    app.config.from_object(config_by_name[config_name])

    database_url = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_DATABASE_URL")
    if database_url:
        app.config["SQLALCHEMY_DATABASE_URI"] = database_url.replace("postgres://", "postgresql://", 1)

    db.init_app(app)
    bcrypt.init_app(app)
    with app.app_context():
        db.create_all()
    return app


def seed_default_admin():
    admin = Admin.query.filter_by(username="admin").first()
    if admin is None:
        admin = Admin(username="admin")
        admin.set_password("Admin@2026")
        db.session.add(admin)
    elif not admin.password_hash:
        admin.set_password("Admin@2026")
    db.session.commit()


def seed_default_packages():
    packages = [
        ("30 Minutes", Decimal("5.00"), 30),
        ("1 Hour", Decimal("10.00"), 60),
        ("2 Hours", Decimal("20.00"), 120),
        ("4 Hours", Decimal("35.00"), 240),
        ("6 Hours", Decimal("45.00"), 360),
        ("24 Hours", Decimal("55.00"), 1440),
        ("Weekly", Decimal("195.00"), 10080),
        ("Monthly", Decimal("575.00"), 43200),
    ]

    for name, price, duration_minutes in packages:
        existing = Package.query.filter_by(name=name).first()
        if existing is None:
            db.session.add(Package(name=name, price=price, duration_minutes=duration_minutes, is_active=True))
        else:
            existing.price = price
            existing.duration_minutes = duration_minutes
            existing.is_active = True

    db.session.commit()


def seed_sample_data():
    if Client.query.count() == 0:
        client = Client(
            phone_number="+254712345678",
            full_name="Demo Client",
            email="client@example.com",
            username="demo_client",
        )
        client.password_hash = bcrypt.generate_password_hash("demo1234").decode("utf-8")
        db.session.add(client)
        db.session.commit()

    if Router.query.count() == 0:
        db.session.add(
            Router(
                name="Main MikroTik",
                ip_address="192.168.88.1",
                location="Head Office",
                status="online",
                is_active=True,
            )
        )
        db.session.commit()

    if Package.query.count() == 0:
        seed_default_packages()

    if Voucher.query.count() == 0:
        package = Package.query.order_by(Package.id).first()
        if package:
            voucher = Voucher(
                code="VIP-2026",
                package_id=package.id,
                status="unused",
                expires_at=datetime.utcnow() + timedelta(days=7),
            )
            db.session.add(voucher)
            db.session.commit()


def seed_all():
    app = create_app_for_seed()
    with app.app_context():
        db.create_all()
        seed_default_admin()
        seed_default_packages()
        seed_sample_data()
        print("Database seeded successfully.")


if __name__ == "__main__":
    seed_all()
