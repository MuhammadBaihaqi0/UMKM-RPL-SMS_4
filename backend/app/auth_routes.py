from __future__ import annotations

from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from flask import Blueprint, jsonify, request

from .middleware import require_auth
from .supabase_client import JWT_SECRET, check_subscription_expiry, get_supabase

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _check_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def _create_token(user: dict) -> str:
    payload = {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "umkm_id": user.get("umkm_id"),
        "exp": datetime.now(UTC) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


@auth_bp.post("/register")
def register():
    """Registrasi user baru (UMKM)."""
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Body JSON diperlukan"}), 400

    nama_umkm = data.get("nama_umkm", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not nama_umkm or not email or not password:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "nama_umkm, email, dan password wajib diisi",
                }
            ),
            400,
        )

    if len(password) < 6:
        return (
            jsonify(
                {"status": "error", "message": "Password minimal 6 karakter"}
            ),
            400,
        )

    sb = get_supabase()

    # Cek apakah email sudah terdaftar
    existing = sb.table("users").select("id").eq("email", email).execute()
    if existing.data:
        return (
            jsonify({"status": "error", "message": "Email sudah terdaftar"}),
            409,
        )

    # Generate umkm_id
    count_result = sb.table("users").select("id", count="exact").execute()
    umkm_id = f"UMKM{(count_result.count or 0) + 1:03d}"

    # Simpan user baru
    new_user = {
        "nama_umkm": nama_umkm,
        "email": email,
        "password_hash": _hash_password(password),
        "role": "user",
        "umkm_id": umkm_id,
    }
    result = sb.table("users").insert(new_user).execute()
    user = result.data[0]

    # Buat subscription Free default
    sb.table("subscriptions").insert(
        {
            "user_id": user["id"],
            "status": "free",
            "biaya": 0,
        }
    ).execute()

    # Log aktivitas
    sb.table("activity_logs").insert(
        {
            "user_id": user["id"],
            "action": "register",
            "detail": f"User {nama_umkm} mendaftar dengan email {email}",
        }
    ).execute()

    return (
        jsonify(
            {
                "status": "success",
                "message": "Registrasi berhasil! Silakan login.",
                "user": {
                    "id": user["id"],
                    "nama_umkm": user["nama_umkm"],
                    "email": user["email"],
                    "umkm_id": user["umkm_id"],
                },
            }
        ),
        201,
    )


@auth_bp.post("/login")
def login():
    """Login user, return JWT token."""
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Body JSON diperlukan"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return (
            jsonify({"status": "error", "message": "Email dan password wajib diisi"}),
            400,
        )

    sb = get_supabase()
    result = sb.table("users").select("*").eq("email", email).execute()

    if not result.data:
        return (
            jsonify({"status": "error", "message": "Email atau password salah"}),
            401,
        )

    user = result.data[0]

    if not _check_password(password, user["password_hash"]):
        return (
            jsonify({"status": "error", "message": "Email atau password salah"}),
            401,
        )

    token = _create_token(user)

    # Log aktivitas
    sb.table("activity_logs").insert(
        {
            "user_id": user["id"],
            "action": "login",
            "detail": f"User {user['nama_umkm']} login",
        }
    ).execute()

    return jsonify(
        {
            "status": "success",
            "message": "Login berhasil!",
            "token": token,
            "user": {
                "id": user["id"],
                "nama_umkm": user["nama_umkm"],
                "email": user["email"],
                "role": user["role"],
                "umkm_id": user.get("umkm_id"),
            },
        }
    )


@auth_bp.get("/me")
@require_auth
def me():
    """Get profil user yang sedang login, dengan cek expiry subscription."""
    sb = get_supabase()
    user_id = request.user["id"]

    result = sb.table("users").select("id, nama_umkm, email, role, umkm_id, created_at").eq("id", user_id).execute()
    if not result.data:
        return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404

    user = result.data[0]

    # Cek subscription dengan validasi expiry otomatis
    # LOGIKA: jika tanggal sekarang > expired_date → status kembali ke Free
    subscription = check_subscription_expiry(user_id)

    return jsonify(
        {
            "status": "success",
            "user": {**user, "subscription": subscription},
        }
    )

