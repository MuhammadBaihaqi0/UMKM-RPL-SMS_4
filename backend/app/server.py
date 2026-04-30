from __future__ import annotations

import time
from datetime import UTC, datetime

from flask import Flask, jsonify, request
from flask_cors import CORS

from .admin_routes import admin_bp
from .analysis import analisis_lengkap, parse_rfc3339
from .auth_routes import auth_bp
from .data_store import get_fee_structure, get_smartbank_user_profile, get_transactions, load_dummy_data
from .middleware import require_auth
from .smartbank_routes import smartbank_bp
from .supabase_client import check_subscription_expiry, get_supabase


def error_response(message: str, status_code: int, extra: dict | None = None):
    payload = {"status": "error", "message": message}
    if extra:
        payload.update(extra)
    return jsonify(payload), status_code


def create_app() -> Flask:
    load_dummy_data()

    app = Flask(__name__)
    app.config["JSON_SORT_KEYS"] = False
    CORS(
        app,
        resources={r"/api/*": {"origins": ["http://localhost:5173", "http://localhost:3000"]}},
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Origin", "Content-Type", "Authorization"],
        supports_credentials=True,
    )

    # ============================================
    # Register Blueprints (Fitur Baru)
    # ============================================
    app.register_blueprint(auth_bp)       # /api/auth/*
    app.register_blueprint(smartbank_bp)  # /api/smartbank/*
    app.register_blueprint(admin_bp)      # /api/admin/*

    # ============================================
    # Middleware: Request Logger (API Gateway Simulasi)
    # ============================================
    @app.before_request
    def log_request():
        request.environ["gateway_start_time"] = time.perf_counter()
        request.environ["gateway_timestamp"] = datetime.now(UTC).isoformat().replace("+00:00", "Z")
        print(
            f"[{request.environ['gateway_timestamp']}] [API-GATEWAY] "
            f"{request.method} {request.path} - {request.remote_addr}"
        )

    @app.after_request
    def add_gateway_headers(response):
        timestamp = request.environ.get("gateway_timestamp", datetime.now(UTC).isoformat().replace("+00:00", "Z"))
        response.headers["X-Gateway-Timestamp"] = timestamp
        response.headers["X-Gateway-Service"] = "UMKM-Insight"
        response.headers["X-Gateway-Mode"] = "READ-ONLY"

        started = request.environ.get("gateway_start_time")
        if started is not None:
            duration = time.perf_counter() - started
            finished = datetime.now(UTC).isoformat().replace("+00:00", "Z")
            print(
                f"[{finished}] [API-GATEWAY] {request.method} {request.path} - "
                f"{response.status_code} - {duration:.6f}s"
            )
        return response

    # ============================================
    # API Info
    # ============================================
    @app.get("/api")
    def api_info():
        return jsonify(
            {
                "status": "success",
                "application": "UMKM Insight",
                "version": "3.0.0",
                "language": "Python (Flask Framework)",
                "database": "Supabase (PostgreSQL)",
                "mode": "READ-ONLY (untuk transaksi keuangan)",
                "endpoints": {
                    "auth": {
                        "register": "POST /api/auth/register",
                        "login": "POST /api/auth/login",
                        "profile": "GET /api/auth/me",
                    },
                    "data": "GET /api/umkm_insight/ambil_data_transaksi?user_id=UMKM001",
                    "analisis": "GET /api/umkm_insight/analisis_penjualan?user_id=UMKM001",
                    "dashboard": "GET /api/umkm_insight/dashboard?user_id=UMKM001",
                    "subscription": "GET /api/umkm_insight/biaya_akses_analytics?user_id=UMKM001",
                    "payment": "GET /api/smartbank/pay?user_id=xxx&amount=10000",
                    "admin": {
                        "users": "GET /api/admin/users",
                        "stats": "GET /api/admin/stats",
                    },
                },
            }
        )

    # ============================================
    # SmartBank Data Endpoints (READ-ONLY)
    # ============================================
    @app.get("/api/umkm_insight/ambil_data_transaksi")
    @require_auth
    def ambil_data_transaksi():
        user_id = request.args.get("user_id", "")
        if not user_id:
            user_id = request.user.get("umkm_id", "")

        if not user_id:
            return error_response(
                "Parameter user_id wajib diisi",
                400,
                {"contoh": "/api/umkm_insight/ambil_data_transaksi?user_id=UMKM001"},
            )

        transactions = get_transactions(user_id)
        if not transactions:
            return error_response(f"Tidak ada data untuk user_id: {user_id}", 404)

        return jsonify(
            {
                "status": "success",
                "endpoint": "/umkm_insight/ambil_data_transaksi",
                "source": "SmartBank (via API Gateway)",
                "mode": "READ-ONLY",
                "user_id": user_id,
                "total_records": len(transactions),
                "data": transactions,
            }
        )

    @app.get("/api/umkm_insight/analisis_penjualan")
    @require_auth
    def analisis_penjualan():
        user_id = request.args.get("user_id", "")
        if not user_id:
            user_id = request.user.get("umkm_id", "")

        if not user_id:
            return error_response(
                "Parameter user_id wajib diisi",
                400,
                {"contoh": "/api/umkm_insight/analisis_penjualan?user_id=UMKM001"},
            )

        transactions = get_transactions(user_id)
        if not transactions:
            return error_response(f"Tidak ada data untuk user_id: {user_id}", 404)

        return jsonify(
            {
                "status": "success",
                "endpoint": "/umkm_insight/analisis_penjualan",
                "source": "SmartBank (via API Gateway)",
                "mode": "READ-ONLY",
                "user_id": user_id,
                "analisis": analisis_lengkap(transactions),
            }
        )

    @app.get("/api/umkm_insight/dashboard")
    @require_auth
    def dashboard():
        user_id = request.args.get("user_id", "")
        if not user_id:
            user_id = request.user.get("umkm_id", "")

        if not user_id:
            return error_response(
                "Parameter user_id wajib diisi",
                400,
                {"contoh": "/api/umkm_insight/dashboard?user_id=UMKM001"},
            )

        # Ambil profil dari SmartBank (READ-ONLY)
        smartbank_user = get_smartbank_user_profile(user_id)

        # Cek subscription dari Supabase dengan validasi expiry
        # LOGIKA: jika tanggal sekarang > expired_date → auto-downgrade ke Free
        auth_user_id = request.user.get("id")
        subscription = check_subscription_expiry(auth_user_id)
        is_premium = subscription["status"] == "premium"

        # Gabungkan profil SmartBank + subscription internal
        user_data = {
            "user_id": user_id,
            "nama": smartbank_user["nama"] if smartbank_user else request.user.get("email", "User"),
            "subscription": subscription,
        }

        transactions = get_transactions(user_id)
        if not transactions:
            return error_response(f"Tidak ada data transaksi untuk user: {user_id}", 404)

        recent_transactions = sorted(
            transactions,
            key=lambda item: parse_rfc3339(item["date"]),
            reverse=True,
        )[:10]

        analisis = analisis_lengkap(transactions)

        # === PEMBATASAN FITUR BERDASARKAN SUBSCRIPTION ===
        # Free user: hanya ringkasan (summary cards)
        # Premium user: semua fitur (grafik, insight, breakdown fee, data transaksi)
        if not is_premium:
            analisis = {
                "ringkasan": analisis["ringkasan"],
                "tren_bulanan": [],
                "performa_per_sumber": [],
                "distribusi_tipe": {},
                "breakdown_fee": {"fee_marketplace": 0, "fee_pos": 0, "fee_supplier": 0, "fee_logistik": 0, "fee_bank": 0, "fee_gateway": 0, "pajak": 0, "total": 0},
                "insights": [
                    {
                        "type": "warning",
                        "icon": "🔒",
                        "message": "Upgrade ke Premium untuk melihat grafik detail, insight bisnis, dan breakdown fee & pajak.",
                    }
                ],
            }
            recent_transactions = []

        return jsonify(
            {
                "status": "success",
                "endpoint": "/umkm_insight/dashboard",
                "source": "SmartBank (via API Gateway)",
                "mode": "READ-ONLY",
                "is_premium": is_premium,
                "user": user_data,
                "analisis": analisis,
                "transaksi_terbaru": recent_transactions,
                "fee_structure": get_fee_structure() if is_premium else {},
                "meta": {"total_records": len(transactions)},
            }
        )

    @app.get("/api/umkm_insight/biaya_akses_analytics")
    @require_auth
    def biaya_akses_analytics():
        user_id = request.args.get("user_id", "")
        if not user_id:
            user_id = request.user.get("umkm_id", "")

        # Cek subscription dengan validasi expiry otomatis
        auth_user_id = request.user.get("id")
        subscription = check_subscription_expiry(auth_user_id)

        return jsonify(
            {
                "status": "success",
                "endpoint": "/umkm_insight/biaya_akses_analytics",
                "mode": "READ-ONLY (Simulasi SaaS)",
                "user_id": user_id,
                "subscription": {
                    "current_status": subscription["status"],
                    "biaya": "Rp10.000/minggu",
                    "biaya_numerik": 10000,
                    "periode": "mingguan",
                    "started_at": subscription.get("started_at"),
                    "expired_at": subscription.get("expired_at"),
                    "fitur_premium": [
                        "Dashboard lengkap dengan semua grafik",
                        "Analisis tren penjualan detail",
                        "Insight bisnis otomatis",
                        "Breakdown fee & pajak",
                        "Export laporan (coming soon)",
                    ],
                },
                "catatan": "Pembayaran diproses melalui SmartBank. UMKM Insight hanya membaca status.",
            }
        )

    @app.get("/api/umkm_insight/user_profile")
    @require_auth
    def user_profile():
        user_id = request.args.get("user_id", "")
        if not user_id:
            user_id = request.user.get("umkm_id", "")

        if not user_id:
            return error_response("Parameter user_id wajib diisi", 400)

        user = get_smartbank_user_profile(user_id)
        if not user:
            return error_response(f"User tidak ditemukan: {user_id}", 404)

        return jsonify(
            {
                "status": "success",
                "source": "SmartBank (via API Gateway)",
                "mode": "READ-ONLY",
                "data": user,
            }
        )

    return app
