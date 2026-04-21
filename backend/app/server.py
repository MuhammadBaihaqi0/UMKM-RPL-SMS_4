from __future__ import annotations

import time
from datetime import UTC, datetime

from flask import Flask, jsonify, request
from flask_cors import CORS

from .analysis import analisis_lengkap, parse_rfc3339
from .data_store import get_fee_structure, get_transactions, get_user_profile, load_dummy_data


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
        methods=["GET"],
        allow_headers=["Origin", "Content-Type"],
        supports_credentials=True,
    )

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

    @app.get("/api")
    def api_info():
        return jsonify(
            {
                "status": "success",
                "application": "UMKM Insight",
                "version": "2.0.0",
                "language": "Python (Flask Framework)",
                "mode": "READ-ONLY",
                "endpoints": {
                    "data": "GET /api/umkm_insight/ambil_data_transaksi?user_id=UMKM001",
                    "analisis": "GET /api/umkm_insight/analisis_penjualan?user_id=UMKM001",
                    "dashboard": "GET /api/umkm_insight/dashboard?user_id=UMKM001",
                    "subscription": "GET /api/umkm_insight/biaya_akses_analytics?user_id=UMKM001",
                },
            }
        )

    @app.get("/api/umkm_insight/ambil_data_transaksi")
    def ambil_data_transaksi():
        user_id = request.args.get("user_id", "")
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
    def analisis_penjualan():
        user_id = request.args.get("user_id", "")
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
    def dashboard():
        user_id = request.args.get("user_id", "")
        if not user_id:
            return error_response(
                "Parameter user_id wajib diisi",
                400,
                {"contoh": "/api/umkm_insight/dashboard?user_id=UMKM001"},
            )

        user = get_user_profile(user_id)
        if not user:
            return error_response(f"User tidak ditemukan: {user_id}", 404)

        transactions = get_transactions(user_id)
        if not transactions:
            return error_response(f"Tidak ada data transaksi untuk user: {user_id}", 404)

        recent_transactions = sorted(
            transactions,
            key=lambda item: parse_rfc3339(item["date"]),
            reverse=True,
        )[:10]

        return jsonify(
            {
                "status": "success",
                "endpoint": "/umkm_insight/dashboard",
                "source": "SmartBank (via API Gateway)",
                "mode": "READ-ONLY",
                "user": user,
                "analisis": analisis_lengkap(transactions),
                "transaksi_terbaru": recent_transactions,
                "fee_structure": get_fee_structure(),
                "meta": {"total_records": len(transactions)},
            }
        )

    @app.get("/api/umkm_insight/biaya_akses_analytics")
    def biaya_akses_analytics():
        user_id = request.args.get("user_id", "")
        if not user_id:
            return error_response("Parameter user_id wajib diisi", 400)

        user = get_user_profile(user_id)
        if not user:
            return error_response(f"User tidak ditemukan: {user_id}", 404)

        return jsonify(
            {
                "status": "success",
                "endpoint": "/umkm_insight/biaya_akses_analytics",
                "mode": "READ-ONLY (Simulasi SaaS)",
                "user_id": user_id,
                "subscription": {
                    "current_status": user["subscription"]["status"],
                    "biaya": "Rp10.000/minggu",
                    "biaya_numerik": 10000,
                    "periode": "mingguan",
                    "aktif_sampai": user["subscription"]["aktif_sampai"],
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
    def user_profile():
        user_id = request.args.get("user_id", "")
        if not user_id:
            return error_response("Parameter user_id wajib diisi", 400)

        user = get_user_profile(user_id)
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
