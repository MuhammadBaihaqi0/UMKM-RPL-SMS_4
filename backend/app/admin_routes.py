from __future__ import annotations

from flask import Blueprint, jsonify, request

from .db import fetch_all, fetch_one
from .middleware import require_admin_or_operator

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.get("/users")
@require_admin_or_operator
def get_all_users():
    status_filter = (request.args.get("status") or "").strip().lower()
    package_filter = (request.args.get("package") or "").strip().lower()

    conditions = []
    params: list[str] = []
    if status_filter:
        conditions.append("COALESCE(s.status, 'active') = %s")
        params.append(status_filter)
    if package_filter:
        conditions.append("COALESCE(s.package_name, 'free') = %s")
        params.append(package_filter)

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = fetch_all(
        f"""
        SELECT
            u.id,
            u.nama_umkm,
            u.email,
            u.role,
            u.umkm_id,
            u.created_at,
            COALESCE(s.package_name, 'free') AS package_name,
            COALESCE(s.status, 'active') AS subscription_status,
            COALESCE(s.amount_paid, s.biaya, 0) AS subscription_amount,
            COALESCE(s.duration, s.periode) AS subscription_duration,
            COALESCE(s.start_date, s.started_at) AS subscription_start_date,
            COALESCE(s.expired_date, s.expired_at) AS subscription_expired_date,
            al.action AS last_action,
            al.detail AS last_detail,
            al.created_at AS last_created_at
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = u.id
        LEFT JOIN activity_logs al ON al.id = (
            SELECT id FROM activity_logs WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
        )
        {where_clause}
        ORDER BY u.created_at ASC
        """,
        tuple(params),
    )

    users = [
        {
            "id": row["id"],
            "nama_umkm": row["nama_umkm"],
            "email": row["email"],
            "role": row["role"],
            "umkm_id": row["umkm_id"],
            "created_at": row["created_at"],
            "subscription": {
                "package_name": row["package_name"],
                "status": row["subscription_status"],
                "amount_paid": row["subscription_amount"],
                "duration": row["subscription_duration"],
                "started_at": row["subscription_start_date"],
                "expired_at": row["subscription_expired_date"],
            },
            "last_activity": (
                {
                    "action": row["last_action"],
                    "detail": row["last_detail"],
                    "created_at": row["last_created_at"],
                }
                if row["last_action"]
                else None
            ),
        }
        for row in rows
    ]

    return jsonify({"status": "success", "data": users, "total": len(users)})


@admin_bp.get("/stats")
@require_admin_or_operator
def get_stats():
    total_users = (fetch_one("SELECT COUNT(*) AS total FROM users") or {}).get("total", 0)
    total_admins = (fetch_one("SELECT COUNT(*) AS total FROM users WHERE role = %s", ("admin",)) or {}).get("total", 0)
    total_operators = (fetch_one("SELECT COUNT(*) AS total FROM users WHERE role = %s", ("operator",)) or {}).get("total", 0)
    total_active = (fetch_one("SELECT COUNT(*) AS total FROM subscriptions WHERE status = %s", ("active",)) or {}).get("total", 0)
    total_revenue = (
        fetch_one(
            "SELECT COALESCE(SUM(amount), 0) AS total FROM payment_logs WHERE status = %s",
            ("success",),
        )
        or {}
    ).get("total", 0)
    package_breakdown = fetch_all(
        """
        SELECT COALESCE(package_name, 'free') AS package_name, COUNT(*) AS total
        FROM subscriptions
        GROUP BY COALESCE(package_name, 'free')
        ORDER BY total DESC
        """
    )
    recent_activities = fetch_all(
        """
        SELECT user_id, action, detail, created_at
        FROM activity_logs
        ORDER BY created_at DESC
        LIMIT 10
        """
    )

    return jsonify(
        {
            "status": "success",
            "stats": {
                "total_users": total_users,
                "total_admins": total_admins,
                "total_operators": total_operators,
                "total_active_subscriptions": total_active,
                "total_revenue": total_revenue,
                "package_breakdown": package_breakdown,
            },
            "recent_activities": recent_activities,
        }
    )
