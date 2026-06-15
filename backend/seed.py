"""
Seed script: Buat data awal di MySQL (admin + demo users + kategori + profiles + sample tickets).
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

        def ensure_umkm_profile(user_id: str, kategori_id: int | None, npwp: str | None = None, alamat: str | None = None, no_telp: str | None = None, deskripsi: str | None = None):
            cursor.execute("SELECT id FROM umkm_profiles WHERE user_id = %s LIMIT 1", (user_id,))
            existing = cursor.fetchone()
            if existing:
                cursor.execute(
                    "UPDATE umkm_profiles SET kategori_id = %s, npwp = %s, alamat = %s, no_telp = %s, deskripsi_usaha = %s, updated_at = %s WHERE user_id = %s",
                    (kategori_id, npwp, alamat, no_telp, deskripsi, now, user_id),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO umkm_profiles (id, user_id, kategori_id, npwp, alamat, no_telp, deskripsi_usaha, business_health_score, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (generate_uuid(), user_id, kategori_id, npwp, alamat, no_telp, deskripsi, 0, now, now),
                )

        # === Admin ===
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

        # === UMKM001 (Kuliner) ===
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
            ensure_umkm_profile(umkm1_id, 1, "12.345.678.9-012.000", "Jl. Merdeka No. 10, Bandung", "081234567890", "Warung makan tradisional dengan menu nasi dan lauk pauk.")
            print(f"  [OK] UMKM001: {umkm1_email} / umkm123 (Pro, Kuliner)")
        else:
            ensure_umkm_profile(umkm1_id, 1, "12.345.678.9-012.000", "Jl. Merdeka No. 10, Bandung", "081234567890", "Warung makan tradisional dengan menu nasi dan lauk pauk.")
            print(f"  [SKIP] UMKM001 sudah ada: {umkm1_email}")

        # === UMKM002 (Elektronik) ===
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
            ensure_umkm_profile(umkm2_id, 3, "98.765.432.1-098.000", "Jl. Asia Afrika No. 25, Bandung", "087654321098", "Toko elektronik lengkap menjual gadget dan aksesoris.")
            print(f"  [OK] UMKM002: {umkm2_email} / umkm123 (Basic, Elektronik)")
        else:
            ensure_umkm_profile(umkm2_id, 3, "98.765.432.1-098.000", "Jl. Asia Afrika No. 25, Bandung", "087654321098", "Toko elektronik lengkap menjual gadget dan aksesoris.")
            print(f"  [SKIP] UMKM002 sudah ada: {umkm2_email}")

        # === Operator ===
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

        # === Sample Tickets (Demo Customer Service) ===
        cursor.execute("SELECT COUNT(*) AS total FROM tickets")
        ticket_count = cursor.fetchone()
        if ticket_count and ticket_count["total"] == 0 and umkm1_id:
            ticket1_id = generate_uuid()
            cursor.execute(
                """
                INSERT INTO tickets (id, user_id, operator_id, subject, description, kategori, prioritas, status, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (ticket1_id, umkm1_id, operator_id, "Grafik penjualan tidak muncul", "Selamat pagi, saya sudah upgrade ke paket Pro tapi grafik tren penjualan masih belum muncul di dashboard saya. Mohon dibantu.", "teknis", "tinggi", "in_progress", now, now),
            )
            # Add sample reply
            cursor.execute(
                """
                INSERT INTO ticket_replies (id, ticket_id, user_id, message, created_at)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (generate_uuid(), ticket1_id, operator_id, "Selamat pagi! Terima kasih sudah menghubungi kami. Saya akan mengecek akun Anda. Mohon tunggu sebentar.", now),
            )
            print("  [OK] Sample ticket + reply dibuat")

            # Add notification for demo
            cursor.execute(
                """
                INSERT INTO notifications (id, user_id, title, message, type, reference_type, reference_id, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (generate_uuid(), umkm1_id, "🔔 Tiket Anda Sedang Ditangani", "[WhatsApp Simulation] Operator kami sedang menangani keluhan Anda. Kami akan segera memberikan solusi.", "wa_simulation", "ticket", ticket1_id, now),
            )
            print("  [OK] Sample WA notification dibuat")

        connection.commit()

    print("")
    print("[DONE] Seeding selesai!")
    print("Akun demo:")
    print("  Admin    : admin@umkminsight.local / admin123")
    print("  Operator : operator@umkminsight.local / operator123")
    print("  UMKM001  : berkah@umkm.local / umkm123 (Kuliner, NPWP: 12.345.678.9-012.000)")
    print("  UMKM002  : elektronik@umkm.local / umkm123 (Elektronik, NPWP: 98.765.432.1-098.000)")


if __name__ == "__main__":
    seed()
