from __future__ import annotations

import os
import uuid
import json
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from typing import Any

from dotenv import load_dotenv
from mysql.connector import pooling

load_dotenv()

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "umkm_insight")
JWT_SECRET: str = os.getenv("JWT_SECRET", "umkm-insight-jwt-secret-key-2026")

SUBSCRIPTION_PACKAGES = {
    "free": {
        "label": "Free",
        "description": "Akses dasar untuk ringkasan performa UMKM.",
        "prices": {"mingguan": 0, "bulanan": 0, "tahunan": 0},
        "features": [
            "Ringkasan total penjualan, transaksi, dan rata-rata",
            "Status subscription badge",
            "Akses data tetap read-only dari SmartBank",
        ],
        "dashboard_access": "summary",
        "can_report_decline": False,
    },
    "basic": {
        "label": "Basic",
        "description": "Untuk UMKM yang butuh tren penjualan dan monitoring rutin.",
        "prices": {"mingguan": 10000, "bulanan": 35000, "tahunan": 350000},
        "features": [
            "Semua fitur Free",
            "Grafik tren penjualan dan perbandingan bulanan",
            "Sumber transaksi utama",
            "5 transaksi terbaru",
        ],
        "dashboard_access": "basic",
        "can_report_decline": False,
    },
    "pro": {
        "label": "Pro",
        "description": "Untuk UMKM yang perlu insight bisnis dan analisis biaya.",
        "prices": {"mingguan": 20000, "bulanan": 75000, "tahunan": 750000},
        "features": [
            "Semua fitur Basic",
            "Insight bisnis otomatis",
            "Breakdown fee marketplace dan pajak",
            "Akses transaksi penuh",
        ],
        "dashboard_access": "pro",
        "can_report_decline": True,
    },
    "enterprise": {
        "label": "Enterprise",
        "description": "Untuk UMKM dengan kebutuhan monitoring lanjutan dan eskalasi ke SmartBank.",
        "prices": {"mingguan": 35000, "bulanan": 120000, "tahunan": 1200000},
        "features": [
            "Semua fitur Pro",
            "Pelaporan performa menurun ke SmartBank",
            "Prioritas monitoring operasional",
            "Riwayat langganan lengkap",
        ],
        "dashboard_access": "enterprise",
        "can_report_decline": True,
    },
}

DURATION_LABELS = {
    "mingguan": "Mingguan",
    "bulanan": "Bulanan",
    "tahunan": "Tahunan",
}

_pool: pooling.MySQLConnectionPool | None = None
_schema_checked = False


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def serialize_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None

    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    else:
        value = value.astimezone(UTC)
    return value.isoformat().replace("+00:00", "Z")


def normalize_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return serialize_datetime(value)
    if isinstance(value, list):
        return [normalize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: normalize_value(item) for key, item in value.items()}
    return value


def calculate_expiry(started_at: datetime, duration: str | None) -> datetime | None:
    if duration == "mingguan":
        return started_at + timedelta(days=7)
    if duration == "bulanan":
        return started_at + timedelta(days=30)
    if duration == "tahunan":
        return started_at + timedelta(days=365)
    return None


def get_package_catalog() -> list[dict[str, Any]]:
    return [
        {
            "code": code,
            "label": config["label"],
            "description": config["description"],
            "prices": config["prices"],
            "features": config["features"],
            "dashboard_access": config["dashboard_access"],
            "can_report_decline": config["can_report_decline"],
        }
        for code, config in SUBSCRIPTION_PACKAGES.items()
    ]


def build_subscription_payload(row: dict[str, Any] | None) -> dict[str, Any]:
    if not row:
        row = {}

    package_name = row.get("package_name")
    legacy_status = row.get("status")
    if not package_name:
        package_name = "pro" if legacy_status == "premium" else "free"

    is_paid_package = package_name != "free"
    status = row.get("status")
    if status not in {"active", "inactive"}:
        status = "active" if package_name == "free" or legacy_status == "premium" else "inactive"

    duration = row.get("duration") or row.get("periode")
    started_at = serialize_datetime(row.get("started_at"))
    expired_at = serialize_datetime(row.get("expired_at"))
    amount = row.get("amount_paid")
    if amount is None:
        amount = row.get("biaya", 0)

    package_meta = SUBSCRIPTION_PACKAGES.get(package_name, SUBSCRIPTION_PACKAGES["free"])

    return normalize_value(
        {
            "status": status,
            "package_name": package_name,
            "package_label": package_meta["label"],
            "description": package_meta["description"],
            "biaya": amount,
            "amount_paid": amount,
            "periode": duration,
            "duration": duration,
            "started_at": started_at,
            "expired_at": expired_at,
            "is_active": status == "active",
            "is_paid_package": is_paid_package,
            "dashboard_access": package_meta["dashboard_access"],
            "can_report_decline": package_meta["can_report_decline"],
            "features": package_meta["features"],
        }
    )


def ensure_schema():
    global _schema_checked
    if _schema_checked:
        return

    connection = _pool.get_connection() if _pool is not None else None
    if connection is None:
        temp_pool = pooling.MySQLConnectionPool(
            pool_name="umkm_insight_bootstrap_pool",
            pool_size=1,
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            autocommit=False,
        )
        connection = temp_pool.get_connection()

    cursor = connection.cursor()
    try:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS smartbank_reports (
              id CHAR(36) PRIMARY KEY,
              user_id CHAR(36) NOT NULL,
              umkm_id VARCHAR(50) NULL,
              report_type VARCHAR(100) NOT NULL,
              title VARCHAR(255) NOT NULL,
              detail TEXT NULL,
              metric_snapshot JSON NULL,
              smartbank_ref VARCHAR(100) NULL,
              status ENUM('queued', 'sent', 'acknowledged') NOT NULL DEFAULT 'sent',
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_smartbank_reports_user_id (user_id),
              CONSTRAINT fk_smartbank_reports_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            """
        )

        for statement in [
            "ALTER TABLE users MODIFY COLUMN role ENUM('admin','user','operator') NOT NULL DEFAULT 'user'",
            "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS package_name ENUM('free','basic','pro','enterprise') NULL AFTER user_id",
            "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount_paid INT NOT NULL DEFAULT 0 AFTER status",
            "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS duration ENUM('mingguan','bulanan','tahunan') NULL AFTER amount_paid",
            "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS start_date DATETIME NULL AFTER duration",
            "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS expired_date DATETIME NULL AFTER start_date",
            "ALTER TABLE payment_logs ADD COLUMN IF NOT EXISTS package_name ENUM('free','basic','pro','enterprise') NULL AFTER amount",
            "ALTER TABLE payment_logs ADD COLUMN IF NOT EXISTS duration ENUM('mingguan','bulanan','tahunan') NULL AFTER package_name",
            "ALTER TABLE payment_logs ADD COLUMN IF NOT EXISTS gateway_provider VARCHAR(50) NOT NULL DEFAULT 'SmartBank' AFTER smartbank_ref",
            "ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS metadata JSON NULL AFTER detail",
        ]:
            cursor.execute(statement)

        cursor.execute("SHOW COLUMNS FROM subscriptions LIKE 'status'")
        status_column = cursor.fetchone()
        if status_column and "free" in status_column[1]:
            cursor.execute(
                """
                UPDATE subscriptions
                SET package_name = CASE
                    WHEN status = 'premium' THEN COALESCE(package_name, 'pro')
                    ELSE COALESCE(package_name, 'free')
                END,
                    amount_paid = COALESCE(amount_paid, biaya, 0),
                    duration = COALESCE(duration, periode),
                    start_date = COALESCE(start_date, started_at),
                    expired_date = COALESCE(expired_date, expired_at)
                """
            )
            cursor.execute(
                """
                ALTER TABLE subscriptions
                MODIFY COLUMN status ENUM('active','inactive') NOT NULL DEFAULT 'active'
                """
            )
            cursor.execute(
                """
                UPDATE subscriptions
                SET status = CASE
                    WHEN package_name = 'free' THEN 'active'
                    WHEN expired_date IS NULL OR expired_date >= NOW() THEN 'active'
                    ELSE 'inactive'
                END
                """
            )

        cursor.execute(
            "UPDATE subscriptions SET package_name = COALESCE(package_name, 'free'), amount_paid = COALESCE(amount_paid, biaya, 0)"
        )
        cursor.execute(
            "UPDATE subscriptions SET duration = COALESCE(duration, periode), start_date = COALESCE(start_date, started_at), expired_date = COALESCE(expired_date, expired_at)"
        )

        connection.commit()
        _schema_checked = True
    finally:
        cursor.close()
        connection.close()


def get_db():
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="umkm_insight_pool",
            pool_size=5,
            host=MYSQL_HOST,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            database=MYSQL_DATABASE,
            autocommit=False,
        )
    ensure_schema()
    return _pool.get_connection()


@contextmanager
def get_cursor(dictionary: bool = True):
    connection = get_db()
    cursor = connection.cursor(dictionary=dictionary)
    try:
        yield connection, cursor
    except Exception:
        connection.rollback()
        raise
    finally:
        cursor.close()
        connection.close()


def fetch_one(query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    with get_cursor() as (_, cursor):
        cursor.execute(query, params)
        row = cursor.fetchone()
        return normalize_value(row) if row else None


def fetch_all(query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with get_cursor() as (_, cursor):
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return normalize_value(rows)


def log_activity(
    cursor,
    user_id: str,
    action: str,
    detail: str,
    metadata: dict[str, Any] | None = None,
    created_at: datetime | None = None,
):
    cursor.execute(
        """
        INSERT INTO activity_logs (id, user_id, action, detail, metadata, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            generate_uuid(),
            user_id,
            action,
            detail,
            None if metadata is None else json.dumps(normalize_value(metadata)),
            created_at or utc_now(),
        ),
    )


def get_subscription_snapshot(user_id: str) -> dict[str, Any]:
    with get_cursor() as (_, cursor):
        cursor.execute(
            """
            SELECT id, package_name, status, amount_paid, biaya, duration, periode, start_date, started_at, expired_date, expired_at, updated_at
            FROM subscriptions
            WHERE user_id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        row = cursor.fetchone()
    return build_subscription_payload(row)


def check_subscription_expiry(user_id: str) -> dict[str, Any]:
    with get_cursor() as (connection, cursor):
        cursor.execute(
            """
            SELECT id, package_name, status, amount_paid, biaya, duration, periode, start_date, started_at, expired_date, expired_at, updated_at
            FROM subscriptions
            WHERE user_id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        row = cursor.fetchone()

        if row is None:
            now = utc_now()
            cursor.execute(
                """
                INSERT INTO subscriptions (
                    id, user_id, package_name, status, amount_paid, biaya, duration, periode,
                    start_date, started_at, expired_date, expired_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    generate_uuid(),
                    user_id,
                    "free",
                    "active",
                    0,
                    0,
                    None,
                    None,
                    now,
                    now,
                    None,
                    None,
                    now,
                ),
            )
            connection.commit()
            row = {
                "package_name": "free",
                "status": "active",
                "amount_paid": 0,
                "duration": None,
                "start_date": now,
                "expired_date": None,
            }

        now = utc_now()
        package_name = row.get("package_name") or ("pro" if row.get("status") == "premium" else "free")
        expiry = row.get("expired_date") or row.get("expired_at")

        if package_name != "free" and expiry and now > expiry:
            cursor.execute(
                """
                UPDATE subscriptions
                SET package_name = %s,
                    status = %s,
                    amount_paid = %s,
                    biaya = %s,
                    duration = %s,
                    periode = %s,
                    start_date = %s,
                    started_at = %s,
                    expired_date = %s,
                    expired_at = %s,
                    updated_at = %s
                WHERE user_id = %s
                """,
                ("free", "active", 0, 0, None, None, now, now, None, None, now, user_id),
            )
            log_activity(
                cursor,
                user_id,
                "subscription_expired",
                f"Paket {package_name} berakhir pada {serialize_datetime(expiry)}. Status kembali ke Free.",
                {"previous_package": package_name, "expired_at": serialize_datetime(expiry)},
                now,
            )
            connection.commit()
            row = {
                "package_name": "free",
                "status": "active",
                "amount_paid": 0,
                "duration": None,
                "start_date": now,
                "expired_date": None,
            }

    return build_subscription_payload(row)
