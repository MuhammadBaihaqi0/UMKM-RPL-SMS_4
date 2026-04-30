"""
Seed script: Buat data awal di Supabase (admin + demo users).
Jalankan sekali: python seed.py
"""

import sys
import io

# Fix Windows terminal encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from dotenv import load_dotenv

load_dotenv()

import bcrypt

from app.supabase_client import get_supabase


def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def seed():
    sb = get_supabase()
    print("[SEED] Seeding data ke Supabase...")

    # ============================================
    # 1. Admin User
    # ============================================
    admin_email = "admin@umkminsight.local"
    existing = sb.table("users").select("id").eq("email", admin_email).execute()
    if not existing.data:
        result = sb.table("users").insert(
            {
                "nama_umkm": "Admin UMKM Insight",
                "email": admin_email,
                "password_hash": hash_pw("admin123"),
                "role": "admin",
                "umkm_id": None,
            }
        ).execute()
        admin_id = result.data[0]["id"]
        sb.table("subscriptions").insert(
            {"user_id": admin_id, "status": "premium", "biaya": 0}
        ).execute()
        print(f"  [OK] Admin: {admin_email} / admin123")
    else:
        print(f"  [SKIP] Admin sudah ada: {admin_email}")

    # ============================================
    # 2. Demo UMKM User (UMKM001 - Warung Berkah Jaya)
    # ============================================
    umkm1_email = "berkah@umkm.local"
    existing = sb.table("users").select("id").eq("email", umkm1_email).execute()
    if not existing.data:
        result = sb.table("users").insert(
            {
                "nama_umkm": "Warung Berkah Jaya",
                "email": umkm1_email,
                "password_hash": hash_pw("umkm123"),
                "role": "user",
                "umkm_id": "UMKM001",
            }
        ).execute()
        user_id = result.data[0]["id"]
        sb.table("subscriptions").insert(
            {
                "user_id": user_id,
                "status": "premium",
                "biaya": 10000,
                "periode": "mingguan",
                "started_at": "2026-04-20T00:00:00Z",
                "expired_at": "2026-05-20T00:00:00Z",
            }
        ).execute()
        print(f"  [OK] UMKM001: {umkm1_email} / umkm123 (Premium)")
    else:
        print(f"  [SKIP] UMKM001 sudah ada: {umkm1_email}")

    # ============================================
    # 3. Demo UMKM User (UMKM002 - Toko Elektronik Maju)
    # ============================================
    umkm2_email = "elektronik@umkm.local"
    existing = sb.table("users").select("id").eq("email", umkm2_email).execute()
    if not existing.data:
        result = sb.table("users").insert(
            {
                "nama_umkm": "Toko Elektronik Maju",
                "email": umkm2_email,
                "password_hash": hash_pw("umkm123"),
                "role": "user",
                "umkm_id": "UMKM002",
            }
        ).execute()
        user_id = result.data[0]["id"]
        sb.table("subscriptions").insert(
            {"user_id": user_id, "status": "free", "biaya": 0}
        ).execute()
        print(f"  [OK] UMKM002: {umkm2_email} / umkm123 (Free)")
    else:
        print(f"  [SKIP] UMKM002 sudah ada: {umkm2_email}")

    print("")
    print("[DONE] Seeding selesai!")
    print("")
    print("Akun demo:")
    print("  Admin  : admin@umkminsight.local / admin123")
    print("  UMKM001: berkah@umkm.local / umkm123")
    print("  UMKM002: elektronik@umkm.local / umkm123")


if __name__ == "__main__":
    seed()
