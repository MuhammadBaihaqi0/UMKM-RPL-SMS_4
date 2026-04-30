"""
Seed script: Buat data awal di MySQL (admin + demo users).
Jalankan: python seed.py
"""

import io
import sys
from datetime import datetime

import bcrypt
from dotenv import load_dotenv

from app.db import generate_uuid, get_cursor, utc_now

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
load_dotenv()


def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def seed():
    print("[SEED] Seeding data ke MySQL...")
    now = utc_now()

    with get_cursor() as (connection, cursor):
        def user_exists(email: str) -> str | None:
            cursor.execute("SELECT id FROM users WHERE email = %s LIMIT 1", (email,))
            row = cursor.fetchone()
            return row["id"] if row else None

        def ensure_subscription(
            user_id: str,
            package_name: str,
            status: str,
            amount_paid: int,
            duration: str | None = None,
            started_at=None,
            expired_at=None,
        ):
            cursor.execute("SELECT id FROM subscriptions WHERE user_id = %s LIMIT 1", (user_id,))
            existing_sub = cursor.fetchone()
            values = (
                package_name,
                status,
                amount_paid,
                amount_paid,
                duration,
                duration,
                started_at,
                started_at,
                expired_at,
                expired_at,
                now,
                user_id,
            )
            if existing_sub:
                cursor.execute(
                    """
                    UPDATE subscriptions
                    SET package_name = %s, status = %s, amount_paid = %s, biaya = %s, duration = %s, periode = %s,
                        start_date = %s, started_at = %s, expired_date = %s, expired_at = %s, updated_at = %s
                    WHERE user_id = %s
                    """,
                    values,
                )
            else:
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
                        package_name,
                        status,
                        amount_paid,
                        amount_paid,
                        duration,
                        duration,
                        started_at,
                        started_at,
                        expired_at,
                        expired_at,
                        now,
                    ),
                )

        admin_email = "admin@umkminsight.local"
        admin_id = user_exists(admin_email)
        if not admin_id:
            admin_id = generate_uuid()
            cursor.execute(
                """
                INSERT INTO users (id, nama_umkm, email, password_hash, role, umkm_id, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (admin_id, "Admin UMKM Insight", admin_email, hash_pw("admin123"), "admin", None, now),
            )
            ensure_subscription(admin_id, "enterprise", "active", 0, "tahunan", now, None)
            print(f"  [OK] Admin: {admin_email} / admin123")
        else:
            print(f"  [SKIP] Admin sudah ada: {admin_email}")

        umkm1_email = "berkah@umkm.local"
        umkm1_id = user_exists(umkm1_email)
        if not umkm1_id:
            umkm1_id = generate_uuid()
            cursor.execute(
                """
                INSERT INTO users (id, nama_umkm, email, password_hash, role, umkm_id, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (umkm1_id, "Warung Berkah Jaya", umkm1_email, hash_pw("umkm123"), "user", "UMKM001", now),
            )
            ensure_subscription(
                umkm1_id,
                "pro",
                "active",
                75000,
                "bulanan",
                datetime.fromisoformat("2026-04-20T00:00:00+00:00").replace(tzinfo=None),
                datetime.fromisoformat("2026-05-20T00:00:00+00:00").replace(tzinfo=None),
            )
            print(f"  [OK] UMKM001: {umkm1_email} / umkm123 (Pro)")
        else:
            print(f"  [SKIP] UMKM001 sudah ada: {umkm1_email}")

        umkm2_email = "elektronik@umkm.local"
        umkm2_id = user_exists(umkm2_email)
        if not umkm2_id:
            umkm2_id = generate_uuid()
            cursor.execute(
                """
                INSERT INTO users (id, nama_umkm, email, password_hash, role, umkm_id, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (umkm2_id, "Toko Elektronik Maju", umkm2_email, hash_pw("umkm123"), "user", "UMKM002", now),
            )
            ensure_subscription(umkm2_id, "basic", "active", 35000, "bulanan", now, None)
            print(f"  [OK] UMKM002: {umkm2_email} / umkm123 (Basic)")
        else:
            print(f"  [SKIP] UMKM002 sudah ada: {umkm2_email}")

        operator_email = "operator@umkminsight.local"
        operator_id = user_exists(operator_email)
        if not operator_id:
            operator_id = generate_uuid()
            cursor.execute(
                """
                INSERT INTO users (id, nama_umkm, email, password_hash, role, umkm_id, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (operator_id, "Operator Monitoring", operator_email, hash_pw("operator123"), "operator", None, now),
            )
            ensure_subscription(operator_id, "free", "active", 0, None, now, None)
            print(f"  [OK] Operator: {operator_email} / operator123")
        else:
            print(f"  [SKIP] Operator sudah ada: {operator_email}")

        connection.commit()

    print("")
    print("[DONE] Seeding selesai!")
    print("Akun demo:")
    print("  Admin    : admin@umkminsight.local / admin123")
    print("  Operator : operator@umkminsight.local / operator123")
    print("  UMKM001  : berkah@umkm.local / umkm123")
    print("  UMKM002  : elektronik@umkm.local / umkm123")


if __name__ == "__main__":
    seed()
