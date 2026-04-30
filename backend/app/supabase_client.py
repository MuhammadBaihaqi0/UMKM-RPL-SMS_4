from __future__ import annotations

import os
from datetime import UTC, datetime

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
JWT_SECRET: str = os.getenv("JWT_SECRET", "umkm-insight-jwt-secret-key-2026")

_supabase: Client | None = None


def get_supabase() -> Client:
    """Mendapatkan instance Supabase client (singleton)."""
    global _supabase
    if _supabase is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError(
                "SUPABASE_URL dan SUPABASE_KEY harus diisi di file .env"
            )
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _supabase


def check_subscription_expiry(user_id: str) -> dict:
    """
    Cek apakah subscription masih aktif.
    LOGIKA WAJIB: Jika tanggal sekarang > expired_date → status kembali ke Free.

    Returns:
        dict: Subscription data yang sudah divalidasi (dengan auto-downgrade jika expired).
    """
    sb = get_supabase()
    sub_result = (
        sb.table("subscriptions")
        .select("id, status, biaya, periode, started_at, expired_at, updated_at")
        .eq("user_id", user_id)
        .execute()
    )

    if not sub_result.data:
        # User belum punya subscription record → buat Free default
        sb.table("subscriptions").insert(
            {"user_id": user_id, "status": "free", "biaya": 0}
        ).execute()
        return {
            "status": "free",
            "biaya": 0,
            "periode": None,
            "started_at": None,
            "expired_at": None,
        }

    subscription = sub_result.data[0]

    # === LOGIKA EXPIRY ===
    # Jika status premium DAN expired_at ada DAN sudah lewat → auto-downgrade ke Free
    if subscription["status"] == "premium" and subscription.get("expired_at"):
        try:
            expired_at = datetime.fromisoformat(
                subscription["expired_at"].replace("Z", "+00:00")
            ).astimezone(UTC)
            now = datetime.now(UTC)

            if now > expired_at:
                # Subscription sudah expired → downgrade ke Free
                sb.table("subscriptions").update(
                    {
                        "status": "free",
                        "biaya": 0,
                        "updated_at": now.isoformat(),
                    }
                ).eq("user_id", user_id).execute()

                # Log aktivitas
                sb.table("activity_logs").insert(
                    {
                        "user_id": user_id,
                        "action": "subscription_expired",
                        "detail": f"Langganan Premium expired pada {subscription['expired_at']}. Status kembali ke Free.",
                    }
                ).execute()

                subscription["status"] = "free"
                subscription["biaya"] = 0
                print(
                    f"[SUBSCRIPTION] User {user_id}: Premium EXPIRED pada {subscription['expired_at']}. "
                    f"Auto-downgrade ke Free."
                )
        except (ValueError, TypeError):
            pass  # Jika format tanggal tidak valid, biarkan status apa adanya

    return {
        "status": subscription["status"],
        "biaya": subscription.get("biaya", 0),
        "periode": subscription.get("periode"),
        "started_at": subscription.get("started_at"),
        "expired_at": subscription.get("expired_at"),
    }
