from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from flask import Blueprint, jsonify, request

from .middleware import require_auth
from .supabase_client import get_supabase

smartbank_bp = Blueprint("smartbank", __name__)


@smartbank_bp.get("/api/smartbank/pay")
@require_auth
def smartbank_pay():
    """
    Simulasi pembayaran via SmartBank.
    UMKM Insight TIDAK memproses uang, hanya mengirim request dan menerima status.
    Flow: User → UMKM Insight → SmartBank → Response → UMKM Insight
    """
    user_id = request.args.get("user_id", "")
    amount = request.args.get("amount", "0")

    if not user_id:
        user_id = request.user.get("id", "")

    try:
        amount = int(amount)
    except ValueError:
        return (
            jsonify(
                {
                    "status": "error",
                    "source": "SmartBank",
                    "message": "Amount harus berupa angka",
                }
            ),
            400,
        )

    if amount <= 0:
        return (
            jsonify(
                {
                    "status": "error",
                    "source": "SmartBank",
                    "message": "Amount harus lebih dari 0",
                }
            ),
            400,
        )

    # === SIMULASI SMARTBANK ===
    # Di dunia nyata, ini akan mengirim request ke API SmartBank yang asli.
    # Di sini kita mensimulasikan response sukses dari SmartBank.
    smartbank_ref = f"SB-{uuid.uuid4().hex[:12].upper()}"
    smartbank_response = {
        "status": "success",
        "source": "SmartBank (Simulasi)",
        "ref": smartbank_ref,
        "amount": amount,
        "message": "Pembayaran berhasil diproses",
        "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
    }

    # === UPDATE STATUS LANGGANAN ===
    # Setelah SmartBank mengkonfirmasi pembayaran, update subscription
    sb = get_supabase()

    now = datetime.now(UTC)
    expired = now + timedelta(days=7)  # Premium berlaku 1 minggu

    sub_result = (
        sb.table("subscriptions")
        .select("*")
        .eq("user_id", request.user["id"])
        .execute()
    )

    if sub_result.data:
        # Update subscription yang sudah ada
        sb.table("subscriptions").update(
            {
                "status": "premium",
                "biaya": amount,
                "periode": "mingguan",
                "started_at": now.isoformat(),
                "expired_at": expired.isoformat(),
                "updated_at": now.isoformat(),
            }
        ).eq("user_id", request.user["id"]).execute()
    else:
        # Buat subscription baru
        sb.table("subscriptions").insert(
            {
                "user_id": request.user["id"],
                "status": "premium",
                "biaya": amount,
                "periode": "mingguan",
                "started_at": now.isoformat(),
                "expired_at": expired.isoformat(),
            }
        ).execute()

    # Log pembayaran
    sb.table("payment_logs").insert(
        {
            "user_id": request.user["id"],
            "amount": amount,
            "status": "success",
            "description": f"Upgrade ke Premium via SmartBank (Ref: {smartbank_ref})",
            "smartbank_ref": smartbank_ref,
        }
    ).execute()

    # Log aktivitas
    sb.table("activity_logs").insert(
        {
            "user_id": request.user["id"],
            "action": "upgrade_premium",
            "detail": f"Upgrade ke Premium, bayar Rp{amount:,} via SmartBank (Ref: {smartbank_ref})",
        }
    ).execute()

    return jsonify(
        {
            "status": "success",
            "message": "Pembayaran berhasil! Status langganan diupdate ke Premium.",
            "smartbank_response": smartbank_response,
            "subscription": {
                "status": "premium",
                "biaya": amount,
                "periode": "mingguan",
                "started_at": now.isoformat(),
                "expired_at": expired.isoformat(),
            },
            "catatan": "UMKM Insight tidak memproses uang. Pembayaran diproses oleh SmartBank.",
        }
    )
