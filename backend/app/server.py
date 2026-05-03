from __future__ import annotations

import time
from datetime import UTC, datetime

from flask import Flask, jsonify, request
from flask_cors import CORS

from .admin_routes import admin_bp
from .analysis import analisis_lengkap, parse_rfc3339
from .auth_routes import auth_bp
from .data_store import get_fee_structure, get_smartbank_user_profile, get_transactions, load_dummy_data
from .db import SUBSCRIPTION_PACKAGES, check_subscription_expiry, get_package_catalog
from .middleware import require_auth
from .smartbank_routes import smartbank_bp


def error_response(message: str, status_code: int, extra: dict | None = None):
    payload = {"status": "error", "message": message}
    if extra:
        payload.update(extra)
    return jsonify(payload), status_code


def empty_analytics(note: str) -> dict:
    return {
        "ringkasan": {
            "total_penjualan": 0,
            "total_pengeluaran": 0,
            "laba_kotor": 0,
            "rata_rata_transaksi": 0,
            "jumlah_transaksi": 0,
            "jumlah_penjualan": 0,
        },
        "tren_bulanan": [],
        "performa_per_sumber": [],
        "distribusi_tipe": {},
        "breakdown_fee": {
            "fee_marketplace": 0,
            "fee_pos": 0,
            "fee_supplier": 0,
            "fee_logistik": 0,
            "fee_bank": 0,
            "fee_gateway": 0,
            "pajak": 0,
            "total": 0,
        },
        "insights": [
            {
                "type": "info",
                "icon": "i",
                "message": note,
            }
        ],
    }


def limit_dashboard_by_package(analisis: dict, package_name: str) -> dict:
    if package_name == "free":
        return {
            "ringkasan": {
                **analisis["ringkasan"],
                "rata_rata_transaksi": None,
            },
            "tren_bulanan": [],
            "performa_per_sumber": [],
            "distribusi_tipe": {},
            "breakdown_fee": {
                "fee_marketplace": 0,
                "fee_pos": 0,
                "fee_supplier": 0,
                "fee_logistik": 0,
                "fee_bank": 0,
                "fee_gateway": 0,
                "pajak": 0,
                "total": 0,
            },
            "insights": [
                {
                    "type": "warning",
                    "icon": "🔒",
                    "message": "Upgrade ke Basic, Pro, atau Enterprise untuk melihat grafik dan analisis lebih dalam.",
                }
            ],
            "comparison": {},
            "reporting": {"can_report_decline": False, "reason": "Paket Free belum mendukung pelaporan ke SmartBank."},
        }

    if package_name == "basic":
        return {
            **analisis,
            "distribusi_tipe": {},
            "breakdown_fee": {
                "fee_marketplace": 0,
                "fee_pos": 0,
                "fee_supplier": 0,
                "fee_logistik": 0,
                "fee_bank": 0,
                "fee_gateway": 0,
                "pajak": 0,
                "total": 0,
            },
            "reporting": {"can_report_decline": False, "reason": "Pelaporan ke SmartBank tersedia mulai paket Pro."},
        }

    return analisis


def enrich_analytics(analisis: dict, subscription: dict) -> dict:
    tren = analisis.get("tren_bulanan", [])
    comparison = {}
    if len(tren) >= 2:
        current = tren[-1]
        previous = tren[-2]
        previous_value = previous["total_penjualan"] or 0
        if previous_value > 0:
            percent = round(((current["total_penjualan"] - previous_value) / previous_value) * 100, 2)
        else:
            percent = 0
        comparison = {
            "current_month": current["bulan"],
            "previous_month": previous["bulan"],
            "change_percent": percent,
            "direction": "naik" if percent > 0 else "turun" if percent < 0 else "stabil",
            "summary": (
                f"Penjualan {abs(percent):.0f}% {'naik' if percent > 0 else 'turun' if percent < 0 else 'stabil'} "
                f"dibanding {previous['bulan']}."
            ),
        }

    fee = analisis.get("breakdown_fee", {})
    fee_total = fee.get("total", 0)
    total_penjualan = analisis.get("ringkasan", {}).get("total_penjualan", 0) or 0
    fee_ratio = round((fee_total / total_penjualan) * 100, 2) if total_penjualan else 0

    reporting = {
        "can_report_decline": False,
        "reason": "Performa belum memenuhi syarat pelaporan.",
        "recommended_action": "Pantau performa penjualan dan biaya operasional bulan berjalan.",
    }
    if comparison and comparison["change_percent"] < 0:
        reporting["recommended_action"] = "Performa menurun. Anda bisa mengirim laporan ke SmartBank untuk tindak lanjut."
        if subscription.get("can_report_decline"):
            reporting = {
                "can_report_decline": True,
                "reason": "",
                "title": "Laporkan penurunan performa ke SmartBank",
                "detail": comparison["summary"],
                "metric_snapshot": {
                    "comparison": comparison,
                    "fee_ratio": fee_ratio,
                    "total_fee": fee_total,
                },
                "recommended_action": "Klik tombol laporkan agar SmartBank menerima sinyal penurunan performa UMKM Anda.",
            }
        else:
            reporting["reason"] = "Fitur pelaporan ke SmartBank tersedia mulai paket Pro."

    proyeksi_ai = None
    if subscription.get("package_name") == "enterprise":
        if total_penjualan > 0:
            proyeksi_ai = {
                "status": "available",
                "trend": "up",
                "message": "AI memprediksi peningkatan pendapatan sebesar 12.5% bulan depan berdasarkan analisis pola transaksi akhir pekan.",
                "value": "+12.5%"
            }
        else:
            proyeksi_ai = {
                "status": "neutral",
                "trend": "neutral",
                "message": "AI membutuhkan lebih banyak riwayat transaksi untuk membuat proyeksi yang akurat.",
                "value": "N/A"
            }

    return {
        **analisis,
        "comparison": comparison,
        "fee_ratio_percent": fee_ratio,
        "reporting": reporting,
        "proyeksi_ai": proyeksi_ai,
    }


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

    app.register_blueprint(auth_bp)
    app.register_blueprint(smartbank_bp)
    app.register_blueprint(admin_bp)

    @app.before_request
    def log_request():
        request.environ["gateway_start_time"] = time.perf_counter()
        request.environ["gateway_timestamp"] = datetime.now(UTC).isoformat().replace("+00:00", "Z")
        print(f"[{request.environ['gateway_timestamp']}] [API-GATEWAY] {request.method} {request.path} - {request.remote_addr}")

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
            print(f"[{finished}] [API-GATEWAY] {request.method} {request.path} - {response.status_code} - {duration:.6f}s")
        return response

    @app.get("/api")
    def api_info():
        return jsonify(
            {
                "status": "success",
                "application": "UMKM Insight",
                "version": "4.0.0",
                "language": "Python (Flask Framework)",
                "database": "MySQL (XAMPP)",
                "mode": "READ-ONLY (transaksi tetap melalui SmartBank)",
                "subscription_packages": list(SUBSCRIPTION_PACKAGES.keys()),
                "endpoints": {
                    "auth": {
                        "register": "POST /api/auth/register",
                        "login": "POST /api/auth/login",
                        "profile": "GET /api/auth/me",
                    },
                    "packages": "GET /api/subscriptions/packages",
                    "dashboard": "GET /api/umkm_insight/dashboard?user_id=UMKM001",
                    "analytics": "GET /api/umkm_insight/analisis_penjualan?user_id=UMKM001",
                    "transactions": "GET /api/umkm_insight/ambil_data_transaksi?user_id=UMKM001",
                    "subscription": "GET /api/umkm_insight/biaya_akses_analytics?user_id=UMKM001",
                    "payment": "GET /api/smartbank/pay?user_id=xxx&package=pro&duration=bulanan",
                    "report_decline": "POST /api/smartbank/report-decline",
                    "admin": {
                        "users": "GET /api/admin/users",
                        "stats": "GET /api/admin/stats",
                    },
                },
            }
        )

    @app.get("/api/umkm_insight/ambil_data_transaksi")
    @require_auth
    def ambil_data_transaksi():
        user_id = request.args.get("user_id", "") or request.user.get("umkm_id", "")
        if not user_id:
            return error_response("Parameter user_id wajib diisi", 400, {"contoh": "/api/umkm_insight/ambil_data_transaksi?user_id=UMKM001"})

        transactions = get_transactions(user_id)
        subscription = check_subscription_expiry(request.user["id"])
        package_name = subscription.get("package_name", "free")
        visible_transactions = transactions
        if package_name == "free":
            visible_transactions = []
        elif package_name == "basic":
            visible_transactions = sorted(transactions, key=lambda item: parse_rfc3339(item["date"]), reverse=True)[:5]

        return jsonify(
            {
                "status": "success",
                "endpoint": "/umkm_insight/ambil_data_transaksi",
                "source": "SmartBank (via API Gateway)",
                "mode": "READ-ONLY",
                "user_id": user_id,
                "package_name": package_name,
                "total_records": len(visible_transactions),
                "data": visible_transactions,
                "message": "Belum ada transaksi SmartBank untuk user ini." if not transactions else "Data transaksi berhasil dimuat.",
            }
        )

    @app.get("/api/umkm_insight/analisis_penjualan")
    @require_auth
    def analisis_penjualan():
        user_id = request.args.get("user_id", "") or request.user.get("umkm_id", "")
        if not user_id:
            return error_response("Parameter user_id wajib diisi", 400, {"contoh": "/api/umkm_insight/analisis_penjualan?user_id=UMKM001"})

        transactions = get_transactions(user_id)
        subscription = check_subscription_expiry(request.user["id"])
        base_analytics = analisis_lengkap(transactions) if transactions else empty_analytics("Belum ada transaksi SmartBank yang bisa dianalisis.")
        analisis = enrich_analytics(base_analytics, subscription)
        analisis = limit_dashboard_by_package(analisis, subscription.get("package_name", "free"))

        return jsonify(
            {
                "status": "success",
                "endpoint": "/umkm_insight/analisis_penjualan",
                "source": "SmartBank (via API Gateway)",
                "mode": "READ-ONLY",
                "user_id": user_id,
                "subscription": subscription,
                "analisis": analisis,
                "meta": {"total_records": len(transactions), "empty_state": not transactions},
            }
        )

    @app.get("/api/umkm_insight/dashboard")
    @require_auth
    def dashboard():
        user_id = request.args.get("user_id", "") or request.user.get("umkm_id", "")
        if not user_id:
            return error_response("Parameter user_id wajib diisi", 400, {"contoh": "/api/umkm_insight/dashboard?user_id=UMKM001"})

        smartbank_user = get_smartbank_user_profile(user_id)
        subscription = check_subscription_expiry(request.user["id"])
        package_name = subscription.get("package_name", "free")
        transactions = get_transactions(user_id)

        recent_transactions = sorted(transactions, key=lambda item: parse_rfc3339(item["date"]), reverse=True)[:10]
        if package_name == "free":
            recent_transactions = []
        elif package_name == "basic":
            recent_transactions = recent_transactions[:5]

        base_analytics = analisis_lengkap(transactions) if transactions else empty_analytics("Belum ada transaksi SmartBank yang masuk untuk UMKM ini.")
        analisis = enrich_analytics(base_analytics, subscription)
        analisis = limit_dashboard_by_package(analisis, package_name)

        user_data = {
            "user_id": user_id,
            "nama": smartbank_user["nama"] if smartbank_user else request.user.get("email", "User"),
            "subscription": subscription,
        }

        return jsonify(
            {
                "status": "success",
                "endpoint": "/umkm_insight/dashboard",
                "source": "SmartBank (via API Gateway)",
                "mode": "READ-ONLY",
                "package_name": package_name,
                "user": user_data,
                "analisis": analisis,
                "transaksi_terbaru": recent_transactions,
                "fee_structure": get_fee_structure() if package_name in {"pro", "enterprise"} else {},
                "available_packages": get_package_catalog(),
                "meta": {"total_records": len(transactions), "empty_state": not transactions},
            }
        )

    @app.get("/api/umkm_insight/biaya_akses_analytics")
    @require_auth
    def biaya_akses_analytics():
        user_id = request.args.get("user_id", "") or request.user.get("umkm_id", "")
        subscription = check_subscription_expiry(request.user["id"])

        return jsonify(
            {
                "status": "success",
                "endpoint": "/umkm_insight/biaya_akses_analytics",
                "mode": "READ-ONLY (Simulasi SaaS)",
                "user_id": user_id,
                "subscription": subscription,
                "packages": get_package_catalog(),
                "catatan": "Pembayaran langganan selalu diproses oleh SmartBank. UMKM Insight hanya menerima status pembayaran.",
            }
        )

    @app.get("/api/umkm_insight/user_profile")
    @require_auth
    def user_profile():
        user_id = request.args.get("user_id", "") or request.user.get("umkm_id", "")
        if not user_id:
            return error_response("Parameter user_id wajib diisi", 400)

        user = get_smartbank_user_profile(user_id)
        if not user:
            return error_response(f"User tidak ditemukan: {user_id}", 404)

        return jsonify({"status": "success", "source": "SmartBank (via API Gateway)", "mode": "READ-ONLY", "data": user})

    return app
