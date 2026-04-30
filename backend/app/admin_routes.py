from __future__ import annotations

from flask import Blueprint, jsonify

from .middleware import require_admin
from .supabase_client import get_supabase

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.get("/users")
@require_admin
def get_all_users():
    """Admin: Daftar semua user + status langganan."""
    sb = get_supabase()

    users_result = (
        sb.table("users")
        .select("id, nama_umkm, email, role, umkm_id, created_at")
        .order("created_at", desc=False)
        .execute()
    )

    users = []
    for user in users_result.data:
        # Ambil subscription untuk setiap user
        sub_result = (
            sb.table("subscriptions")
            .select("status, biaya, periode, started_at, expired_at")
            .eq("user_id", user["id"])
            .execute()
        )
        subscription = (
            sub_result.data[0]
            if sub_result.data
            else {"status": "free", "biaya": 0, "expired_at": None}
        )

        # Ambil aktivitas terakhir
        activity_result = (
            sb.table("activity_logs")
            .select("action, detail, created_at")
            .eq("user_id", user["id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        last_activity = activity_result.data[0] if activity_result.data else None

        users.append(
            {**user, "subscription": subscription, "last_activity": last_activity}
        )

    return jsonify({"status": "success", "data": users, "total": len(users)})


@admin_bp.get("/stats")
@require_admin
def get_stats():
    """Admin: Statistik ringkasan platform."""
    sb = get_supabase()

    # Total users
    users_result = sb.table("users").select("id", count="exact").execute()
    total_users = users_result.count or 0

    # Total admins
    admin_result = (
        sb.table("users").select("id", count="exact").eq("role", "admin").execute()
    )
    total_admins = admin_result.count or 0

    # Premium users
    premium_result = (
        sb.table("subscriptions")
        .select("id", count="exact")
        .eq("status", "premium")
        .execute()
    )
    total_premium = premium_result.count or 0

    # Free users
    total_free = total_users - total_admins - total_premium

    # Total revenue from payment logs
    payments_result = (
        sb.table("payment_logs")
        .select("amount")
        .eq("status", "success")
        .execute()
    )
    total_revenue = sum(p["amount"] for p in payments_result.data) if payments_result.data else 0

    # Recent activities
    recent_result = (
        sb.table("activity_logs")
        .select("user_id, action, detail, created_at")
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )

    return jsonify(
        {
            "status": "success",
            "stats": {
                "total_users": total_users,
                "total_admins": total_admins,
                "total_premium": total_premium,
                "total_free": max(0, total_free),
                "total_revenue": total_revenue,
            },
            "recent_activities": recent_result.data,
        }
    )
