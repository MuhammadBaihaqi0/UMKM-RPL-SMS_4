from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

from flask import Blueprint, jsonify, request

from .db import (
    SUBSCRIPTION_PACKAGES,
    calculate_expiry,
    check_subscription_expiry,
    generate_uuid,
    get_cursor,
    get_package_catalog,
    get_subscription_snapshot,
    log_activity,
    serialize_datetime,
    utc_now,
)
from .middleware import require_auth

smartbank_bp = Blueprint("smartbank", __name__)


@smartbank_bp.get("/api/subscriptions/packages")
@require_auth
def subscription_packages():
    return jsonify({"status": "success", "packages": get_package_catalog()})


@smartbank_bp.get("/api/smartbank/pay")
@require_auth
def smartbank_pay():
    user_id = request.args.get("user_id", "") or request.user.get("id", "")
    package_name = (request.args.get("package") or "basic").strip().lower()
    duration = (request.args.get("duration") or "mingguan").strip().lower()

    if package_name not in SUBSCRIPTION_PACKAGES:
        return jsonify({"status": "error", "source": "SmartBank", "message": "Paket tidak valid"}), 400
    if package_name == "free":
        return jsonify({"status": "error", "source": "SmartBank", "message": "Paket Free tidak memerlukan pembayaran"}), 400
    if duration not in {"mingguan", "bulanan", "tahunan"}:
        return jsonify({"status": "error", "source": "SmartBank", "message": "Durasi tidak valid"}), 400

    amount = SUBSCRIPTION_PACKAGES[package_name]["prices"][duration]
    smartbank_ref = f"SB-{uuid.uuid4().hex[:12].upper()}"
    smartbank_response = {
        "status": "success",
        "source": "SmartBank (Simulasi)",
        "ref": smartbank_ref,
        "amount": amount,
        "package": package_name,
        "duration": duration,
        "message": "Pembayaran berhasil diproses oleh SmartBank",
        "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
    }

    db_now = utc_now()
    expired_at = calculate_expiry(db_now, duration)

    with get_cursor() as (connection, cursor):
        cursor.execute("SELECT id FROM subscriptions WHERE user_id = %s LIMIT 1", (request.user["id"],))
        existing = cursor.fetchone()

        if existing:
            cursor.execute(
                """
                UPDATE subscriptions
                SET package_name = %s,
                    status = %s,
                    amount_paid = %s,
                    biaya = %s,
                    duration = %s,
                    periode = %s,
                    start_date = %s,
                    started_at = %s,
                    expired_date = %s,
                    expired_at = %s,
                    updated_at = %s
                WHERE user_id = %s
                """,
                (
                    package_name,
                    "active",
                    amount,
                    amount,
                    duration,
                    duration,
                    db_now,
                    db_now,
                    expired_at,
                    expired_at,
                    db_now,
                    request.user["id"],
                ),
            )
        else:
            cursor.execute(
                """
                INSERT INTO subscriptions (
                    id, user_id, package_name, status, amount_paid, biaya, duration, periode,
                    start_date, started_at, expired_date, expired_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    generate_uuid(),
                    request.user["id"],
                    package_name,
                    "active",
                    amount,
                    amount,
                    duration,
                    duration,
                    db_now,
                    db_now,
                    expired_at,
                    expired_at,
                    db_now,
                ),
            )

        cursor.execute(
            """
            INSERT INTO payment_logs (
                id, user_id, amount, package_name, duration, status, description, smartbank_ref, gateway_provider, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                generate_uuid(),
                request.user["id"],
                amount,
                package_name,
                duration,
                "success",
                f"Upgrade paket {package_name} ({duration}) via SmartBank (Ref: {smartbank_ref})",
                smartbank_ref,
                "SmartBank",
                db_now,
            ),
        )

        log_activity(
            cursor,
            request.user["id"],
            "subscription_upgrade",
            f"Upgrade ke paket {package_name.title()} ({duration}) via SmartBank.",
            {
                "smartbank_ref": smartbank_ref,
                "package_name": package_name,
                "duration": duration,
                "amount": amount,
            },
            db_now,
        )
        connection.commit()

    return jsonify(
        {
            "status": "success",
            "message": "Pembayaran berhasil! Status langganan diperbarui dari SmartBank.",
            "user_id": user_id,
            "smartbank_response": smartbank_response,
            "subscription": get_subscription_snapshot(request.user["id"]),
            "catatan": "UMKM Insight tidak memproses uang. Pembayaran diproses sepenuhnya oleh SmartBank.",
        }
    )


@smartbank_bp.post("/api/smartbank/report-decline")
@require_auth
def report_decline():
    data = request.get_json() or {}
    title = (data.get("title") or "Performa usaha menurun").strip()
    detail = (data.get("detail") or "UMKM meminta SmartBank meninjau penurunan performa dan memberi tindak lanjut.").strip()
    umkm_id = (data.get("umkm_id") or request.user.get("umkm_id") or "").strip()
    metric_snapshot = data.get("metric_snapshot") or {}

    smartbank_ref = f"SB-REPORT-{uuid.uuid4().hex[:10].upper()}"
    now = utc_now()
    subscription = check_subscription_expiry(request.user["id"])
    if not subscription.get("can_report_decline"):
        return (
            jsonify(
                {
                    "status": "error",
                    "message": subscription.get("reason") or "Paket saat ini belum mendukung pelaporan ke SmartBank.",
                }
            ),
            403,
        )

    with get_cursor() as (connection, cursor):
        cursor.execute(
            """
            INSERT INTO smartbank_reports (id, user_id, umkm_id, report_type, title, detail, metric_snapshot, smartbank_ref, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                generate_uuid(),
                request.user["id"],
                umkm_id or None,
                "performance_decline",
                title,
                detail,
                None if not metric_snapshot else json.dumps(metric_snapshot),
                smartbank_ref,
                "sent",
                now,
            ),
        )
        log_activity(
            cursor,
            request.user["id"],
            "report_decline_to_smartbank",
            f"Laporan penurunan performa dikirim ke SmartBank (Ref: {smartbank_ref}).",
            {"umkm_id": umkm_id, "metric_snapshot": metric_snapshot, "smartbank_ref": smartbank_ref},
            now,
        )
        connection.commit()

    return jsonify(
        {
            "status": "success",
            "message": "Laporan berhasil dikirim ke SmartBank.",
            "smartbank_response": {
                "status": "success",
                "source": "SmartBank (Simulasi)",
                "ref": smartbank_ref,
                "report_type": "performance_decline",
                "timestamp": serialize_datetime(now),
            },
        }
    )
