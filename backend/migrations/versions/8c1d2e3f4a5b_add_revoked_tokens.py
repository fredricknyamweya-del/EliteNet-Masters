"""Add persistent JWT revocation records.

Revision ID: 8c1d2e3f4a5b
Revises: 7b9f1a2c4d6e
"""
from alembic import op
import sqlalchemy as sa

revision = "8c1d2e3f4a5b"
down_revision = "7b9f1a2c4d6e"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "revoked_tokens",
        sa.Column("jti", sa.String(length=36), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("jti"),
    )


def downgrade():
    op.drop_table("revoked_tokens")
