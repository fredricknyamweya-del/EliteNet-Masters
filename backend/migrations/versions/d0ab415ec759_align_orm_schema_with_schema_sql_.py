"""Align ORM schema with schema.sql: timestamptz, native enums, FK ondelete rules, server-side defaults

Revision ID: d0ab415ec759
Revises: 
Create Date: 2026-09-16 23:55:14.564487

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'd0ab415ec759'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
       bind = op.get_bind()
       enum_types = (
              postgresql.ENUM("pending", "success", "failed", name="transaction_status"),
              postgresql.ENUM("unused", "redeemed", "expired", name="voucher_status"),
              postgresql.ENUM("online", "offline", "restarting", name="router_status"),
       )
       for enum_type in enum_types:
              enum_type.create(bind, checkfirst=True)

       timestamp_columns = {
              "admins": ("created_at", "updated_at"),
              "clients": ("created_at",),
              "packages": ("created_at", "updated_at"),
              "transactions": ("paid_at", "created_at"),
              "vouchers": ("created_at", "redeemed_at", "expires_at"),
              "devices": ("created_at", "last_seen_at"),
              "routers": ("created_at", "last_seen_at"),
              "sessions": ("started_at", "expires_at", "created_at"),
       }
       for table_name, columns in timestamp_columns.items():
              for column_name in columns:
                     default = "now()" if column_name in {"created_at", "updated_at", "started_at"} else None
                     op.alter_column(
                            table_name,
                            column_name,
                            type_=sa.DateTime(timezone=True),
                            existing_type=postgresql.TIMESTAMP(),
                            server_default=sa.text(default) if default else None,
                            existing_nullable=column_name not in {"created_at", "updated_at", "started_at", "expires_at"},
                            postgresql_using=f"{column_name} AT TIME ZONE 'UTC'",
                     )

       for table_name, column_name in (
              bind = op.get_bind()
              enum_types = (
                     postgresql.ENUM("pending", "success", "failed", name="transaction_status"),
                     postgresql.ENUM("unused", "redeemed", "expired", name="voucher_status"),
                     postgresql.ENUM("online", "offline", "restarting", name="router_status"),
              )
              for enum_type in enum_types:
                     enum_type.create(bind, checkfirst=True)

              timestamp_columns = {
                     "admins": ("created_at", "updated_at"),
                     "clients": ("created_at",),
                     "packages": ("created_at", "updated_at"),
                     "transactions": ("paid_at", "created_at"),
                     "vouchers": ("created_at", "redeemed_at", "expires_at"),
                     "devices": ("created_at", "last_seen_at"),
                     "routers": ("created_at", "last_seen_at"),
                     "sessions": ("started_at", "expires_at", "created_at"),
              }
              for table_name, columns in timestamp_columns.items():
                     for column_name in columns:
                            default = "now()" if column_name in {"created_at", "updated_at", "started_at"} else None
                            op.alter_column(
                                   table_name,
                                   column_name,
                                   type_=sa.DateTime(timezone=True),
                                   existing_type=postgresql.TIMESTAMP(),
                                   server_default=sa.text(default) if default else None,
                                   existing_nullable=column_name not in {"created_at", "updated_at", "started_at", "expires_at"},
                                   postgresql_using=f"{column_name} AT TIME ZONE 'UTC'",
                            )

              for table_name in ("packages", "routers", "sessions"):
                     op.alter_column(table_name, "is_active", server_default=sa.text("TRUE"), existing_type=sa.Boolean())

              for table_name, column_name, enum_name in (
                     ("transactions", "status", "transaction_status"),
                     ("vouchers", "status", "voucher_status"),
                     ("routers", "status", "router_status"),
              ):
                     op.alter_column(
                            table_name,
                            column_name,
                            type_=postgresql.ENUM(name=enum_name),
                            existing_type=sa.String(),
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
                            server_default=sa.text(f"'{default_value}'::{enum_name}"),
                            existing_type=postgresql.ENUM(name=enum_name),
                     )

              foreign_keys = (
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
              for table_name, constraint_name, referred_table, column_name, ondelete in foreign_keys:
                     op.drop_constraint(constraint_name, table_name, type="foreignkey")
                     op.create_foreign_key(
                            constraint_name, table_name, referred_table, [column_name], ["id"], ondelete=ondelete
                     )
