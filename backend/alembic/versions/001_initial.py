"""initial schema

Revision ID: 001
Revises:
"""
import sqlalchemy as sa
from alembic import op

revision = "001"
down_revision = None
branch_labels = None
depends_on = None

NOW = sa.text("CURRENT_TIMESTAMP")


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        NOW_ON_UPDATE = NOW
    else:
        NOW_ON_UPDATE = sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("username", sa.String(50), nullable=False, unique=True),
        sa.Column("email", sa.String(100), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=NOW),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=NOW_ON_UPDATE),
    )

    op.create_table(
        "docker_images",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("image_name", sa.String(255), nullable=False),
        sa.Column("image_tag", sa.String(100), server_default="latest"),
        sa.Column("full_reference", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=NOW),
    )
    op.create_index("ix_docker_images_user_id", "docker_images", ["user_id"])

    op.create_table(
        "scan_results",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("image_id", sa.Integer, sa.ForeignKey("docker_images.id"), nullable=False),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.Enum("pending", "scanning", "completed", "failed", name="scan_status"),
                  nullable=False, server_default="pending"),
        sa.Column("security_score", sa.Float, nullable=True),
        sa.Column("risk_category", sa.String(50), nullable=True),
        sa.Column("total_vulns", sa.Integer, nullable=False, server_default="0"),
        sa.Column("critical_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("high_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("medium_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("low_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("unknown_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("trivy_output", sa.JSON, nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("started_at", sa.DateTime, nullable=True),
        sa.Column("completed_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=NOW),
    )
    op.create_index("ix_scan_results_user_id", "scan_results", ["user_id"])
    op.create_index("ix_scan_results_image_id", "scan_results", ["image_id"])

    op.create_table(
        "vulnerabilities",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("scan_id", sa.Integer, sa.ForeignKey("scan_results.id"), nullable=False),
        sa.Column("cve_id", sa.String(50)),
        sa.Column("package_name", sa.String(255)),
        sa.Column("installed_version", sa.String(100)),
        sa.Column("fixed_version", sa.String(100)),
        sa.Column("severity", sa.Enum("CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN", name="vuln_severity")),
        sa.Column("title", sa.Text),
        sa.Column("description", sa.Text),
        sa.Column("references", sa.JSON),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=NOW),
    )
    op.create_index("ix_vulnerabilities_scan_id", "vulnerabilities", ["scan_id"])
    op.create_index("ix_vulnerabilities_severity", "vulnerabilities", ["severity"])

    op.create_table(
        "security_policies",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("max_critical", sa.Integer, nullable=False, server_default="0"),
        sa.Column("max_high", sa.Integer, nullable=False, server_default="5"),
        sa.Column("block_on_critical", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("block_on_high", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=NOW),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=NOW_ON_UPDATE),
    )

    op.create_table(
        "reports",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("scan_id", sa.Integer, sa.ForeignKey("scan_results.id"), nullable=False),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("report_type", sa.Enum("json", "pdf", name="report_type"), nullable=False),
        sa.Column("file_path", sa.String(500)),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=NOW),
    )


def downgrade() -> None:
    for table in ("reports", "security_policies", "vulnerabilities",
                  "scan_results", "docker_images", "users"):
        op.drop_table(table)
