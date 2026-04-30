from __future__ import annotations

from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from flask import Blueprint, jsonify, request

from .db import (
    JWT_SECRET,
    check_subscription_expiry,
    generate_uuid,
    get_cursor,
    log_activity,
    normalize_value,
    utc_now,
)
from .middleware import require_auth

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
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Body JSON diperlukan"}), 400

    nama_umkm = data.get("nama_umkm", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = (data.get("role") or "user").strip().lower()

    if not nama_umkm or not email or not password:
        return jsonify({"status": "error", "message": "nama_umkm, email, dan password wajib diisi"}), 400

    if role not in {"admin", "user", "operator"}:
        return jsonify({"status": "error", "message": "Role tidak valid"}), 400

    if len(password) < 6:
        return jsonify({"status": "error", "message": "Password minimal 6 karakter"}), 400

    with get_cursor() as (connection, cursor):
        cursor.execute("SELECT id FROM users WHERE email = %s LIMIT 1", (email,))
        if cursor.fetchone():
            return jsonify({"status": "error", "message": "Email sudah terdaftar"}), 409

        cursor.execute("SELECT COUNT(*) AS total FROM users WHERE umkm_id IS NOT NULL")
        count_result = cursor.fetchone()
        umkm_id = f"UMKM{(count_result['total'] or 0) + 1:03d}" if role == "user" else None

        user_id = generate_uuid()
        now = utc_now()
        cursor.execute(
            """
            INSERT INTO users (id, nama_umkm, email, password_hash, role, umkm_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (user_id, nama_umkm, email, _hash_password(password), role, umkm_id, now),
        )
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
        log_activity(
            cursor,
            user_id,
            "register",
            f"User {nama_umkm} mendaftar dengan email {email}",
            {"role": role, "umkm_id": umkm_id},
            now,
        )
        connection.commit()

    return (
        jsonify(
            {
                "status": "success",
                "message": "Registrasi berhasil! Silakan login.",
                "user": {
                    "id": user_id,
                    "nama_umkm": nama_umkm,
                    "email": email,
                    "umkm_id": umkm_id,
                    "role": role,
                },
            }
        ),
        201,
    )


@auth_bp.post("/login")
def login():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Body JSON diperlukan"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    if not email or not password:
        return jsonify({"status": "error", "message": "Email dan password wajib diisi"}), 400

    with get_cursor() as (connection, cursor):
        cursor.execute("SELECT * FROM users WHERE email = %s LIMIT 1", (email,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"status": "error", "message": "Email atau password salah"}), 401

        user = row
        if not _check_password(password, user["password_hash"]):
            return jsonify({"status": "error", "message": "Email atau password salah"}), 401

        token = _create_token(user)
        log_activity(
            cursor,
            user["id"],
            "login",
            f"User {user['nama_umkm']} login",
            {"role": user["role"], "umkm_id": user.get("umkm_id")},
            utc_now(),
        )
        connection.commit()

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
    user_id = request.user["id"]

    with get_cursor() as (_, cursor):
        cursor.execute(
            """
            SELECT id, nama_umkm, email, role, umkm_id, created_at
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        row = cursor.fetchone()

    if not row:
        return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404

    user = normalize_value(row)
    subscription = check_subscription_expiry(user_id)
    return jsonify({"status": "success", "user": {**user, "subscription": subscription}})
