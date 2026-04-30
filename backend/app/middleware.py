from __future__ import annotations

from functools import wraps

import jwt
from flask import jsonify, request

from .db import JWT_SECRET


def require_auth(func):
    """Middleware: memastikan request memiliki JWT token yang valid."""

    @wraps(func)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"status": "error", "message": "Token diperlukan"}), 401

        token = auth_header.replace("Bearer ", "")
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user = payload
        except jwt.ExpiredSignatureError:
            return jsonify({"status": "error", "message": "Token sudah expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"status": "error", "message": "Token tidak valid"}), 401

        return func(*args, **kwargs)

    return decorated


def require_admin(func):
    """Middleware: memastikan user memiliki role admin."""

    @wraps(func)
    @require_auth
    def decorated(*args, **kwargs):
        if request.user.get("role") != "admin":
            return (
                jsonify({"status": "error", "message": "Akses ditolak. Hanya admin."}),
                403,
            )
        return func(*args, **kwargs)

    return decorated


def require_admin_or_operator(func):
    """Middleware: memastikan user memiliki role admin atau operator."""

    @wraps(func)
    @require_auth
    def decorated(*args, **kwargs):
        if request.user.get("role") not in {"admin", "operator"}:
            return (
                jsonify({"status": "error", "message": "Akses ditolak. Hanya admin atau operator."}),
                403,
            )
        return func(*args, **kwargs)

    return decorated
