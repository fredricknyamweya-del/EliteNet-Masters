"""Add persisted admin announcements.

Revision ID: 7b9f1a2c4d6e
Revises: d0ab415ec759
"""
from alembic import op
import sqlalchemy as sa

revision = "7b9f1a2c4d6e"
down_revision = "d0ab415ec759"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "announcements",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("content", sa.String(length=200), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["created_by"], ["admins.id"], name="announcements_created_by_fkey", ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("announcements")
