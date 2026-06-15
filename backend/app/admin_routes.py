from __future__ import annotations

import uuid

from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash

from .db import fetch_all, fetch_one, get_cursor
from .middleware import require_admin, require_admin_or_operator

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


# =============================================
# User Detail (Admin & Operator)
# =============================================
@admin_bp.get("/users/<user_id>")
@require_admin_or_operator
def get_user_detail(user_id):
    """Ambil detail user lengkap (tanpa password). Untuk troubleshooting oleh admin/operator."""
    user = fetch_one(
        """
        SELECT u.id, u.nama_umkm, u.email, u.role, u.umkm_id, u.created_at,
               COALESCE(s.package_name, 'free') AS package_name,
               COALESCE(s.status, 'active') AS subscription_status,
               COALESCE(s.duration, s.periode) AS subscription_duration,
               COALESCE(s.expired_date, s.expired_at) AS subscription_expired,
               p.npwp, p.alamat, p.no_telp, p.deskripsi_usaha, p.business_health_score,
               k.nama_kategori, k.icon AS kategori_icon
        FROM users u
        LEFT JOIN subscriptions s ON s.user_id = u.id
        LEFT JOIN umkm_profiles p ON p.user_id = u.id
        LEFT JOIN kategori_usaha k ON k.id = p.kategori_id
        WHERE u.id = %s
        """,
        (user_id,),
    )
    if not user:
        return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404

    # Ambil tiket terbaru user
    tickets = fetch_all(
        "SELECT id, subject, status, created_at FROM tickets WHERE user_id = %s ORDER BY created_at DESC LIMIT 5",
        (user_id,),
    )

    # Ambil aktivitas terbaru user
    activities = fetch_all(
        "SELECT action, detail, created_at FROM activity_logs WHERE user_id = %s ORDER BY created_at DESC LIMIT 10",
        (user_id,),
    )

    return jsonify({
        "status": "success",
        "user": {
            "id": user["id"],
            "nama_umkm": user["nama_umkm"],
            "email": user["email"],
            "role": user["role"],
            "umkm_id": user["umkm_id"],
            "created_at": user["created_at"],
            "subscription": {
                "package_name": user["package_name"],
                "status": user["subscription_status"],
                "duration": user["subscription_duration"],
                "expired": user["subscription_expired"],
            },
            "profile": {
                "npwp": user["npwp"],
                "alamat": user["alamat"],
                "no_telp": user["no_telp"],
                "deskripsi_usaha": user["deskripsi_usaha"],
                "health_score": user["business_health_score"],
                "kategori": user["nama_kategori"],
                "kategori_icon": user["kategori_icon"],
            },
        },
        "recent_tickets": tickets,
        "recent_activities": activities,
    })


# =============================================
# Reset Password (Admin & Operator)
# =============================================
@admin_bp.post("/users/<user_id>/reset-password")
@require_admin_or_operator
def reset_user_password(user_id):
    """Reset password user. Operator/Admin set password baru tanpa mengetahui password lama."""
    data = request.get_json() or {}
    new_password = data.get("new_password", "").strip()
    if len(new_password) < 6:
        return jsonify({"status": "error", "message": "Password minimal 6 karakter"}), 400

    user = fetch_one("SELECT id, nama_umkm, role FROM users WHERE id = %s", (user_id,))
    if not user:
        return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404

    # Operator tidak boleh reset password admin
    caller_role = request.user.get("role")
    if caller_role == "operator" and user["role"] in ("admin", "operator"):
        return jsonify({"status": "error", "message": "Operator tidak bisa reset password admin/operator lain"}), 403

    hashed = generate_password_hash(new_password)
    with get_cursor() as (conn, cursor):
        cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", (hashed, user_id))
        cursor.execute(
            "INSERT INTO activity_logs (id, user_id, action, detail) VALUES (%s, %s, %s, %s)",
            (str(uuid.uuid4()), request.user["id"], "RESET_PASSWORD", f"Reset password user {user['nama_umkm']}"),
        )
        conn.commit()

    return jsonify({"status": "success", "message": f"Password {user['nama_umkm']} berhasil di-reset"})


# =============================================
# Change User Role (Admin Only)
# =============================================
@admin_bp.put("/users/<user_id>/role")
@require_admin
def change_user_role(user_id):
    """Ubah role user. Hanya admin yang bisa mengubah role."""
    data = request.get_json() or {}
    new_role = data.get("role", "").strip().lower()
    if new_role not in ("user", "operator", "admin"):
        return jsonify({"status": "error", "message": "Role harus: user, operator, atau admin"}), 400

    user = fetch_one("SELECT id, nama_umkm, role FROM users WHERE id = %s", (user_id,))
    if not user:
        return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404

    if user["id"] == request.user["id"]:
        return jsonify({"status": "error", "message": "Tidak bisa mengubah role sendiri"}), 400

    with get_cursor() as (conn, cursor):
        cursor.execute("UPDATE users SET role = %s WHERE id = %s", (new_role, user_id))
        cursor.execute(
            "INSERT INTO activity_logs (id, user_id, action, detail) VALUES (%s, %s, %s, %s)",
            (str(uuid.uuid4()), request.user["id"], "CHANGE_ROLE", f"Ubah role {user['nama_umkm']} dari {user['role']} ke {new_role}"),
        )
        conn.commit()

    return jsonify({"status": "success", "message": f"Role {user['nama_umkm']} diubah menjadi {new_role}"})

