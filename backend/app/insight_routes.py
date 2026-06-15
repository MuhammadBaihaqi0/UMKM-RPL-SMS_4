from __future__ import annotations

import math
from collections import OrderedDict
from datetime import UTC, datetime

from flask import Blueprint, jsonify, request

from .analysis import (
    hitung_breakdown_fee,
    hitung_total_penjualan,
    hitung_total_pengeluaran,
    hitung_tren_bulanan,
    parse_rfc3339,
)
from .data_store import get_transactions
from .db import (
    check_subscription_expiry,
    fetch_all,
    fetch_one,
    get_cursor,
    generate_uuid,
    normalize_value,
    utc_now,
)
from .middleware import require_auth

insight_bp = Blueprint("insight", __name__, url_prefix="/api/insight")


# =============================================
# A. Industry Benchmarking
# =============================================
@insight_bp.get("/benchmark")
@require_auth
def benchmark():
    """
    Perbandingan performa UMKM dengan rata-rata di kategori yang sama (anonim).
    ---
    tags: [AI Insight]
    security: [{BearerAuth: []}]
    responses:
      200:
        description: Data benchmarking
    """
    user_id = request.user["id"]
    umkm_id = request.user.get("umkm_id", "")

    # Get user's category
    profile = fetch_one(
        """
        SELECT up.kategori_id, ku.nama_kategori, ku.icon
        FROM umkm_profiles up
        LEFT JOIN kategori_usaha ku ON ku.id = up.kategori_id
        WHERE up.user_id = %s
        """,
        (user_id,),
    )

    if not profile or not profile.get("kategori_id"):
        return jsonify({
            "status": "success",
            "benchmark": None,
            "message": "Lengkapi profil kategori usaha Anda untuk melihat benchmarking.",
        })

    kategori_id = profile["kategori_id"]
    kategori_nama = profile.get("nama_kategori", "Unknown")
    kategori_icon = profile.get("icon", "📦")

    # Get all UMKM IDs in the same category
    peers = fetch_all(
        """
        SELECT u.umkm_id
        FROM umkm_profiles up
        JOIN users u ON u.id = up.user_id
        WHERE up.kategori_id = %s AND u.umkm_id IS NOT NULL
        """,
        (kategori_id,),
    )

    peer_umkm_ids = [p["umkm_id"] for p in peers if p["umkm_id"]]

    if len(peer_umkm_ids) < 1:
        return jsonify({
            "status": "success",
            "benchmark": None,
            "message": "Belum ada cukup data UMKM di kategori ini untuk benchmarking.",
        })

    # Calculate aggregated stats for all peers
    total_peers = 0
    sum_revenue = 0
    sum_expenses = 0
    sum_transactions = 0
    my_revenue = 0
    my_expenses = 0
    my_transactions = 0

    for pid in peer_umkm_ids:
        txns = get_transactions(pid)
        if not txns:
            continue
        rev = hitung_total_penjualan(txns)
        exp = hitung_total_pengeluaran(txns)
        total_peers += 1
        sum_revenue += rev
        sum_expenses += exp
        sum_transactions += len(txns)

        if pid == umkm_id:
            my_revenue = rev
            my_expenses = exp
            my_transactions = len(txns)

    if total_peers == 0:
        return jsonify({
            "status": "success",
            "benchmark": None,
            "message": "Belum ada data transaksi di kategori ini.",
        })

    avg_revenue = sum_revenue / total_peers
    avg_expenses = sum_expenses / total_peers
    avg_transactions = sum_transactions / total_peers

    # Calculate percentages
    revenue_diff = ((my_revenue - avg_revenue) / avg_revenue * 100) if avg_revenue > 0 else 0
    expense_diff = ((my_expenses - avg_expenses) / avg_expenses * 100) if avg_expenses > 0 else 0

    # Generate insight message
    if revenue_diff > 0:
        insight_msg = f"Pendapatan Anda {abs(revenue_diff):.0f}% lebih tinggi dari rata-rata usaha {kategori_nama} lainnya. Pertahankan! 🎉"
        insight_type = "positive"
    elif revenue_diff < 0:
        insight_msg = f"Pendapatan Anda {abs(revenue_diff):.0f}% lebih rendah dari rata-rata usaha {kategori_nama}. Pertimbangkan strategi pemasaran baru."
        insight_type = "warning"
    else:
        insight_msg = f"Performa Anda setara dengan rata-rata usaha {kategori_nama}."
        insight_type = "info"

    return jsonify({
        "status": "success",
        "benchmark": {
            "kategori": {"id": kategori_id, "nama": kategori_nama, "icon": kategori_icon},
            "total_peers": total_peers,
            "anda": {
                "pendapatan": my_revenue,
                "pengeluaran": my_expenses,
                "jumlah_transaksi": my_transactions,
            },
            "rata_rata_kategori": {
                "pendapatan": round(avg_revenue),
                "pengeluaran": round(avg_expenses),
                "jumlah_transaksi": round(avg_transactions),
            },
            "persentase": {
                "revenue_diff": round(revenue_diff, 1),
                "expense_diff": round(expense_diff, 1),
            },
            "insight": {"type": insight_type, "message": insight_msg},
        },
    })


# =============================================
# B. AI-Powered Cashflow Prediction
# =============================================
@insight_bp.get("/predict")
@require_auth
def predict_cashflow():
    """
    Prediksi arus kas bulan depan menggunakan regresi linier sederhana.
    ---
    tags: [AI Insight]
    security: [{BearerAuth: []}]
    responses:
      200:
        description: Prediksi cashflow
    """
    umkm_id = request.args.get("user_id", "") or request.user.get("umkm_id", "")
    if not umkm_id:
        return jsonify({"status": "error", "message": "user_id diperlukan"}), 400

    transactions = get_transactions(umkm_id)
    if not transactions:
        return jsonify({
            "status": "success",
            "prediction": None,
            "message": "Belum ada data transaksi untuk prediksi.",
        })

    tren = hitung_tren_bulanan(transactions)
    if len(tren) < 2:
        return jsonify({
            "status": "success",
            "prediction": None,
            "message": "Membutuhkan minimal 2 bulan data untuk prediksi.",
        })

    # Simple linear regression on monthly revenue
    x_values = list(range(len(tren)))
    y_values = [t["total_penjualan"] for t in tren]

    n = len(x_values)
    sum_x = sum(x_values)
    sum_y = sum(y_values)
    sum_xy = sum(x * y for x, y in zip(x_values, y_values))
    sum_x2 = sum(x * x for x in x_values)

    denominator = n * sum_x2 - sum_x * sum_x
    if denominator == 0:
        slope = 0
        intercept = sum_y / n if n > 0 else 0
    else:
        slope = (n * sum_xy - sum_x * sum_y) / denominator
        intercept = (sum_y - slope * sum_x) / n

    # Predict next month
    next_x = len(tren)
    predicted_value = max(0, slope * next_x + intercept)

    # Trend direction
    current_value = y_values[-1] if y_values else 0
    change_percent = ((predicted_value - current_value) / current_value * 100) if current_value > 0 else 0

    if change_percent > 5:
        trend = "up"
        trend_label = "📈 Naik"
        message = f"AI memprediksi peningkatan pendapatan sebesar {abs(change_percent):.1f}% bulan depan berdasarkan tren {len(tren)} bulan terakhir."
    elif change_percent < -5:
        trend = "down"
        trend_label = "📉 Turun"
        message = f"AI memprediksi penurunan pendapatan sebesar {abs(change_percent):.1f}% bulan depan. Pertimbangkan strategi untuk mengantisipasi."
    else:
        trend = "stable"
        trend_label = "📊 Stabil"
        message = f"AI memprediksi pendapatan akan relatif stabil bulan depan (±{abs(change_percent):.1f}%)."

    # Generate confidence score (based on data consistency)
    if n >= 6:
        confidence = "Tinggi"
    elif n >= 3:
        confidence = "Sedang"
    else:
        confidence = "Rendah"

    return jsonify({
        "status": "success",
        "prediction": {
            "predicted_revenue": round(predicted_value),
            "current_revenue": round(current_value),
            "change_percent": round(change_percent, 1),
            "trend": trend,
            "trend_label": trend_label,
            "message": message,
            "confidence": confidence,
            "data_points": len(tren),
            "historical": [
                {"bulan": t["bulan"], "total_penjualan": t["total_penjualan"]}
                for t in tren
            ],
            "algorithm": "Linear Regression (Least Squares)",
        },
    })


# =============================================
# C. Business Health Score
# =============================================
@insight_bp.get("/health-score")
@require_auth
def health_score():
    """
    Skor kesehatan bisnis 0-100 dengan saran otomatis.
    ---
    tags: [AI Insight]
    security: [{BearerAuth: []}]
    responses:
      200:
        description: Health score
    """
    umkm_id = request.args.get("user_id", "") or request.user.get("umkm_id", "")
    if not umkm_id:
        return jsonify({"status": "error", "message": "user_id diperlukan"}), 400

    transactions = get_transactions(umkm_id)
    if not transactions:
        return jsonify({
            "status": "success",
            "health": None,
            "message": "Belum ada data transaksi untuk menghitung skor kesehatan.",
        })

    total_penjualan = hitung_total_penjualan(transactions)
    total_pengeluaran = hitung_total_pengeluaran(transactions)
    fees = hitung_breakdown_fee(transactions)
    tren = hitung_tren_bulanan(transactions)

    # ===== Calculate Score Components (0-100) =====
    scores = {}
    advices = []

    # 1. Profit Margin Score (30% weight)
    if total_penjualan > 0:
        margin = ((total_penjualan - total_pengeluaran) / total_penjualan) * 100
        margin_score = min(100, max(0, margin * 2))  # 50% margin = 100 score
    else:
        margin = 0
        margin_score = 0
    scores["margin"] = {"score": round(margin_score), "weight": 30, "label": "Margin Laba"}

    if margin < 10:
        advices.append({"type": "warning", "icon": "⚠️", "message": "Margin laba sangat tipis. Segera evaluasi harga jual atau kurangi biaya operasional."})
    elif margin < 30:
        advices.append({"type": "info", "icon": "💡", "message": "Margin laba masih bisa ditingkatkan. Pertimbangkan diversifikasi produk atau optimasi biaya."})

    # 2. Revenue Growth Score (25% weight)
    if len(tren) >= 2:
        last = tren[-1]["total_penjualan"]
        prev = tren[-2]["total_penjualan"]
        growth = ((last - prev) / prev * 100) if prev > 0 else 0
        growth_score = min(100, max(0, 50 + growth))  # 0% growth = 50 score
    else:
        growth = 0
        growth_score = 50
    scores["growth"] = {"score": round(growth_score), "weight": 25, "label": "Pertumbuhan Pendapatan"}

    if growth < -10:
        advices.append({"type": "warning", "icon": "📉", "message": f"Pendapatan turun {abs(growth):.0f}% dibanding bulan lalu. Lakukan promosi atau evaluasi strategi penjualan."})
    elif growth > 20:
        advices.append({"type": "positive", "icon": "🚀", "message": f"Pertumbuhan luar biasa! Pendapatan naik {growth:.0f}%. Pertahankan momentum ini."})

    # 3. Fee Efficiency Score (20% weight)
    if total_penjualan > 0:
        fee_ratio = (fees["total"] / total_penjualan) * 100
        fee_score = max(0, 100 - fee_ratio * 5)  # 20% fee = 0 score
    else:
        fee_ratio = 0
        fee_score = 50
    scores["efficiency"] = {"score": round(fee_score), "weight": 20, "label": "Efisiensi Biaya"}

    if fee_ratio > 15:
        advices.append({"type": "warning", "icon": "🏦", "message": f"Biaya operasional mencapai {fee_ratio:.1f}% dari pendapatan. Cari channel dengan fee lebih rendah."})

    # 4. Transaction Volume Score (15% weight)
    tx_count = len(transactions)
    volume_score = min(100, tx_count * 3)  # 33+ transactions = 100
    scores["volume"] = {"score": round(volume_score), "weight": 15, "label": "Volume Transaksi"}

    if tx_count < 10:
        advices.append({"type": "info", "icon": "📊", "message": "Volume transaksi masih rendah. Pertimbangkan memasarkan produk di lebih banyak channel."})

    # 5. Consistency Score (10% weight)
    if len(tren) >= 3:
        revenues = [t["total_penjualan"] for t in tren]
        avg_rev = sum(revenues) / len(revenues)
        if avg_rev > 0:
            variance = sum((r - avg_rev) ** 2 for r in revenues) / len(revenues)
            std_dev = math.sqrt(variance)
            cv = (std_dev / avg_rev) * 100  # Coefficient of variation
            consistency_score = max(0, 100 - cv * 2)
        else:
            consistency_score = 0
    else:
        consistency_score = 50
    scores["consistency"] = {"score": round(consistency_score), "weight": 10, "label": "Konsistensi Pendapatan"}

    # ===== Calculate Final Score =====
    final_score = sum(
        s["score"] * s["weight"] / 100 for s in scores.values()
    )
    final_score = round(min(100, max(0, final_score)))

    # Score category
    if final_score >= 80:
        grade = "A"
        grade_label = "Sangat Sehat"
        grade_color = "#10b981"
    elif final_score >= 60:
        grade = "B"
        grade_label = "Sehat"
        grade_color = "#3b82f6"
    elif final_score >= 40:
        grade = "C"
        grade_label = "Perlu Perhatian"
        grade_color = "#f59e0b"
    else:
        grade = "D"
        grade_label = "Kritis"
        grade_color = "#ef4444"

    # Update business health score in umkm_profiles
    user_id = request.user["id"]
    with get_cursor() as (connection, cursor):
        cursor.execute(
            "UPDATE umkm_profiles SET business_health_score = %s, updated_at = %s WHERE user_id = %s",
            (final_score, utc_now(), user_id),
        )
        connection.commit()

    return jsonify({
        "status": "success",
        "health": {
            "score": final_score,
            "grade": grade,
            "grade_label": grade_label,
            "grade_color": grade_color,
            "components": scores,
            "advices": advices,
        },
    })


# =============================================
# D. Kategori Usaha List
# =============================================
@insight_bp.get("/kategori")
def list_kategori():
    """
    Daftar semua kategori usaha.
    ---
    tags: [Master Data]
    responses:
      200:
        description: Daftar kategori
    """
    kategori = fetch_all("SELECT id, nama_kategori, deskripsi, icon FROM kategori_usaha ORDER BY id ASC")
    return jsonify({"status": "success", "data": kategori})


# =============================================
# E. UMKM Profile (View & Update)
# =============================================
@insight_bp.get("/profile")
@require_auth
def get_umkm_profile():
    """
    Ambil profil UMKM user.
    ---
    tags: [UMKM Profile]
    security: [{BearerAuth: []}]
    responses:
      200:
        description: Profil UMKM
    """
    user_id = request.user["id"]
    profile = fetch_one(
        """
        SELECT up.*, ku.nama_kategori, ku.icon AS kategori_icon
        FROM umkm_profiles up
        LEFT JOIN kategori_usaha ku ON ku.id = up.kategori_id
        WHERE up.user_id = %s
        """,
        (user_id,),
    )
    if not profile:
        return jsonify({"status": "success", "profile": None, "message": "Profil belum dibuat."})

    return jsonify({"status": "success", "profile": profile})


@insight_bp.put("/profile")
@require_auth
def update_umkm_profile():
    """
    Update profil UMKM (NPWP, kategori, alamat, dll).
    ---
    tags: [UMKM Profile]
    security: [{BearerAuth: []}]
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            npwp: {type: string}
            kategori_id: {type: integer}
            alamat: {type: string}
            no_telp: {type: string}
            deskripsi_usaha: {type: string}
    responses:
      200:
        description: Profil berhasil diperbarui
    """
    data = request.get_json() or {}
    user_id = request.user["id"]
    now = utc_now()

    npwp = (data.get("npwp") or "").strip() or None
    kategori_id = data.get("kategori_id")
    alamat = (data.get("alamat") or "").strip() or None
    no_telp = (data.get("no_telp") or "").strip() or None
    deskripsi_usaha = (data.get("deskripsi_usaha") or "").strip() or None

    if kategori_id is not None:
        try:
            kategori_id = int(kategori_id)
        except (ValueError, TypeError):
            kategori_id = None

    with get_cursor() as (connection, cursor):
        cursor.execute("SELECT id FROM umkm_profiles WHERE user_id = %s", (user_id,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute(
                """
                UPDATE umkm_profiles
                SET kategori_id = %s, npwp = %s, alamat = %s, no_telp = %s, deskripsi_usaha = %s, updated_at = %s
                WHERE user_id = %s
                """,
                (kategori_id, npwp, alamat, no_telp, deskripsi_usaha, now, user_id),
            )
        else:
            cursor.execute(
                """
                INSERT INTO umkm_profiles (id, user_id, kategori_id, npwp, alamat, no_telp, deskripsi_usaha, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (generate_uuid(), user_id, kategori_id, npwp, alamat, no_telp, deskripsi_usaha, now, now),
            )

        connection.commit()

    return jsonify({"status": "success", "message": "Profil UMKM berhasil diperbarui."})
