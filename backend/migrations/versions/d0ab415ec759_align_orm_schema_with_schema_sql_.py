"""Align ORM schema with schema.sql PostgreSQL DDL.

Revision ID: d0ab415ec759
Revises:
Create Date: 2026-09-16 23:55:14.564487
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "d0ab415ec759"
down_revision = None
branch_labels = None
depends_on = None


ENUMS = {
    "transaction_status": ("pending", "success", "failed"),
    "voucher_status": ("unused", "redeemed", "expired"),
    "router_status": ("online", "offline", "restarting"),
}

FOREIGN_KEYS = (
    ("transactions", "transactions_package_id_fkey", "packages", "package_id", "RESTRICT"),
    ("transactions", "transactions_client_id_fkey", "clients", "client_id", "SET NULL"),
    ("vouchers", "vouchers_package_id_fkey", "packages", "package_id", "RESTRICT"),
    ("vouchers", "vouchers_redeemed_by_fkey", "clients", "redeemed_by", "SET NULL"),
    ("devices", "devices_client_id_fkey", "clients", "client_id", "CASCADE"),
    ("sessions", "sessions_device_id_fkey", "devices", "device_id", "SET NULL"),
    ("sessions", "sessions_router_id_fkey", "routers", "router_id", "SET NULL"),
    ("sessions", "sessions_transaction_id_fkey", "transactions", "transaction_id", "SET NULL"),
    ("sessions", "sessions_voucher_id_fkey", "vouchers", "voucher_id", "SET NULL"),
)

TIMESTAMP_COLUMNS = {
    "admins": ("created_at", "updated_at"),
    "clients": ("created_at",),
    "packages": ("created_at", "updated_at"),
    "transactions": ("paid_at", "created_at"),
    "vouchers": ("created_at", "redeemed_at", "expires_at"),
    "devices": ("created_at", "last_seen_at"),
    "routers": ("created_at", "last_seen_at"),
    "sessions": ("started_at", "expires_at", "created_at"),
}



def upgrade():
    bind = op.get_bind()

    for enum_name, values in ENUMS.items():
        postgresql.ENUM(*values, name=enum_name).create(bind, checkfirst=True)

    for table_name, columns in TIMESTAMP_COLUMNS.items():
        for column_name in columns:
            has_default = column_name in {"created_at", "updated_at", "started_at"}
            is_nullable = column_name in {"paid_at", "redeemed_at", "expires_at", "last_seen_at"}
            op.alter_column(
                table_name,
                column_name,
                existing_type=postgresql.TIMESTAMP(),
                type_=sa.DateTime(timezone=True),
                existing_nullable=is_nullable,
                server_default=sa.text("now()") if has_default else None,
                postgresql_using=f"{column_name} AT TIME ZONE 'UTC'",
            )

    for table_name in ("packages", "routers", "sessions"):
        op.alter_column(
            table_name,
            "is_active",
            existing_type=sa.Boolean(),
            server_default=sa.text("TRUE"),
        )

    for table_name, column_name, enum_name in (
        ("transactions", "status", "transaction_status"),
        ("vouchers", "status", "voucher_status"),
        ("routers", "status", "router_status"),
    ):
        op.alter_column(
            table_name,
            column_name,
            existing_type=sa.String(),
            type_=postgresql.ENUM(name=enum_name),
            postgresql_using=f"{column_name}::text::{enum_name}",
        )

    for table_name, enum_name, default_value in (
        ("transactions", "transaction_status", "pending"),
        ("vouchers", "voucher_status", "unused"),
        ("routers", "router_status", "offline"),
    ):
        op.alter_column(
            table_name,
            "status",
            existing_type=postgresql.ENUM(name=enum_name),
            server_default=sa.text(f"'{default_value}'::{enum_name}"),
        )

    for table_name, constraint_name, referred_table, column_name, ondelete in FOREIGN_KEYS:
        op.drop_constraint(constraint_name, table_name, type_="foreignkey")
        op.create_foreign_key(
            constraint_name,
            table_name,
            referred_table,
            [column_name],
            ["id"],
            ondelete=ondelete,
        )


def downgrade():
    for table_name, constraint_name, referred_table, column_name, _ in FOREIGN_KEYS:
        op.drop_constraint(constraint_name, table_name, type_="foreignkey")
        op.create_foreign_key(
            constraint_name, table_name, referred_table, [column_name], ["id"]
        )

    for table_name, column_name, enum_name in (
        ("transactions", "status", "transaction_status"),
        ("vouchers", "status", "voucher_status"),
        ("routers", "status", "router_status"),
    ):
        op.alter_column(
            table_name,
            column_name,
            existing_type=postgresql.ENUM(name=enum_name),
            type_=sa.String(),
            postgresql_using="status::text",
            server_default=None,
        )

    for enum_name in ENUMS:
        op.execute(sa.text(f"DROP TYPE {enum_name}"))

    for table_name, columns in TIMESTAMP_COLUMNS.items():
        for column_name in columns:
            is_nullable = column_name in {"paid_at", "redeemed_at", "expires_at", "last_seen_at"}
            op.alter_column(
                table_name,
                column_name,
                existing_type=sa.DateTime(timezone=True),
                type_=postgresql.TIMESTAMP(),
                existing_nullable=is_nullable,
                server_default=None,
                postgresql_using=f"{column_name} AT TIME ZONE 'UTC'",
            )

    for table_name in ("packages", "routers", "sessions"):
        op.alter_column(table_name, "is_active", existing_type=sa.Boolean(), server_default=None)
