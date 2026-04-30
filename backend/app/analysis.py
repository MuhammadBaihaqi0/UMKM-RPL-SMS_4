from __future__ import annotations

import math
from collections import OrderedDict
from datetime import UTC, datetime
from typing import Any


MONTH_NAMES = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
]


def parse_rfc3339(date_text: str) -> datetime:
    return datetime.fromisoformat(date_text.replace("Z", "+00:00")).astimezone(UTC)


def hitung_total_penjualan(transactions: list[dict[str, Any]]) -> float:
    return sum(
        item["amount"]
        for item in transactions
        if item["amount"] > 0 and item["type"] == "penjualan"
    )


def hitung_total_pengeluaran(transactions: list[dict[str, Any]]) -> float:
    total = sum(item["amount"] for item in transactions if item["amount"] < 0)
    return abs(total)


def hitung_rata_rata(transactions: list[dict[str, Any]]) -> float:
    penjualan = [
        item["amount"]
        for item in transactions
        if item["amount"] > 0 and item["type"] == "penjualan"
    ]
    if not penjualan:
        return 0
    return round(sum(penjualan) / len(penjualan))


def hitung_tren_bulanan(transactions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    bulanan: dict[str, dict[str, Any]] = OrderedDict()

    for item in transactions:
        if item["type"] != "penjualan" or item["amount"] <= 0:
            continue

        parsed = parse_rfc3339(item["date"])
        key = f"{parsed.year}-{parsed.month:02d}"
        label = f"{MONTH_NAMES[parsed.month - 1]} {parsed.year}"

        current = bulanan.setdefault(
            key,
            {
                "key": key,
                "bulan": label,
                "total_penjualan": 0.0,
                "jumlah_transaksi": 0,
                "net_amount": 0.0,
            },
        )
        current["total_penjualan"] += item["amount"]
        current["jumlah_transaksi"] += 1
        current["net_amount"] += item["net_amount"]

    return [bulanan[key] for key in sorted(bulanan)]


def hitung_performa_per_sumber(
    transactions: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}

    for item in transactions:
        current = grouped.setdefault(
            item["source_app"],
            {
                "source_app": item["source_app"],
                "total_amount": 0.0,
                "jumlah_transaksi": 0,
                "total_penjualan": 0.0,
                "total_pengeluaran": 0.0,
                "rata_rata": 0.0,
            },
        )

        current["jumlah_transaksi"] += 1
        current["total_amount"] += item["amount"]
        if item["amount"] > 0:
            current["total_penjualan"] += item["amount"]
        else:
            current["total_pengeluaran"] += abs(item["amount"])

    result = []
    for current in grouped.values():
        if current["jumlah_transaksi"] > 0:
            current["rata_rata"] = round(
                abs(current["total_amount"]) / current["jumlah_transaksi"]
            )
        result.append(current)
    return result


def hitung_breakdown_fee(transactions: list[dict[str, Any]]) -> dict[str, float]:
    fee = {
        "fee_marketplace": 0.0,
        "fee_pos": 0.0,
        "fee_supplier": 0.0,
        "fee_logistik": 0.0,
        "fee_bank": 0.0,
        "fee_gateway": 0.0,
        "pajak": 0.0,
        "total": 0.0,
    }

    for item in transactions:
        fee["fee_marketplace"] += item.get("fee_marketplace", 0.0)
        fee["fee_pos"] += item.get("fee_pos", 0.0)
        fee["fee_supplier"] += item.get("fee_supplier", 0.0)
        fee["fee_logistik"] += item.get("fee_logistik", 0.0)
        fee["fee_bank"] += item.get("fee_bank", 0.0)
        fee["fee_gateway"] += item.get("fee_gateway", 0.0)
        fee["pajak"] += item.get("pajak", 0.0)

    fee["total"] = (
        fee["fee_marketplace"]
        + fee["fee_pos"]
        + fee["fee_supplier"]
        + fee["fee_logistik"]
        + fee["fee_bank"]
        + fee["fee_gateway"]
        + fee["pajak"]
    )
    return fee


def hitung_distribusi_tipe(
    transactions: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    distribusi: dict[str, dict[str, Any]] = {}

    for item in transactions:
        current = distribusi.setdefault(item["type"], {"count": 0, "total": 0.0})
        current["count"] += 1
        current["total"] += abs(item["amount"])

    return distribusi


def format_number(value: float) -> str:
    return f"{value:,.0f}".replace(",", ".")


def generate_insights(transactions: list[dict[str, Any]]) -> list[dict[str, str]]:
    """
    Generate insight otomatis berbasis perbandingan data.
    LOGIKA: insight harus berbasis perbandingan (bulan ini vs bulan lalu, dsb.)
    """
    insights: list[dict[str, str]] = []
    tren = hitung_tren_bulanan(transactions)

    # === INSIGHT 1: Perbandingan Penjualan Bulan Ini vs Bulan Lalu ===
    if len(tren) >= 2:
        last = tren[-1]
        prev = tren[-2]
        if prev["total_penjualan"] != 0:
            pct = round(
                ((last["total_penjualan"] - prev["total_penjualan"]) / prev["total_penjualan"])
                * 100
            )
            selisih = abs(last["total_penjualan"] - prev["total_penjualan"])
            if pct > 0:
                insights.append(
                    {
                        "type": "positive",
                        "icon": "📈",
                        "message": (
                            f"Penjualan bulan {last['bulan']} naik {pct}% dibanding {prev['bulan']} "
                            f"(+Rp{format_number(selisih)}). Tren pertumbuhan positif!"
                        ),
                    }
                )
            elif pct < 0:
                insights.append(
                    {
                        "type": "negative",
                        "icon": "📉",
                        "message": (
                            f"Penjualan bulan {last['bulan']} turun {abs(pct)}% dibanding {prev['bulan']} "
                            f"(-Rp{format_number(selisih)}). Perlu strategi untuk menaikkan penjualan."
                        ),
                    }
                )

        # === INSIGHT 2: Perbandingan Jumlah Transaksi Bulan Ini vs Bulan Lalu ===
        if prev["jumlah_transaksi"] > 0:
            tx_pct = round(
                ((last["jumlah_transaksi"] - prev["jumlah_transaksi"]) / prev["jumlah_transaksi"])
                * 100
            )
            if tx_pct > 0:
                insights.append(
                    {
                        "type": "positive",
                        "icon": "🛒",
                        "message": (
                            f"Volume transaksi bulan {last['bulan']} meningkat {tx_pct}% "
                            f"({last['jumlah_transaksi']} vs {prev['jumlah_transaksi']} transaksi). "
                            "Pelanggan semakin aktif bertransaksi."
                        ),
                    }
                )
            elif tx_pct < 0:
                insights.append(
                    {
                        "type": "warning",
                        "icon": "⚠️",
                        "message": (
                            f"Volume transaksi bulan {last['bulan']} turun {abs(tx_pct)}% "
                            f"({last['jumlah_transaksi']} vs {prev['jumlah_transaksi']} transaksi). "
                            "Pertimbangkan strategi pemasaran untuk meningkatkan traffic."
                        ),
                    }
                )

        # === INSIGHT 3: Net Amount Comparison ===
        if prev.get("net_amount", 0) != 0:
            net_pct = round(
                ((last.get("net_amount", 0) - prev.get("net_amount", 0)) / abs(prev.get("net_amount", 1)))
                * 100
            )
            if net_pct > 0:
                insights.append(
                    {
                        "type": "positive",
                        "icon": "💎",
                        "message": (
                            f"Pendapatan bersih (net) bulan {last['bulan']} naik {net_pct}% "
                            f"dibanding {prev['bulan']}. Margin keuntungan membaik!"
                        ),
                    }
                )

    # === INSIGHT 4: Perbandingan Rata-rata per Bulan ===
    if len(tren) >= 2:
        last_avg = last["total_penjualan"] / max(last["jumlah_transaksi"], 1)
        prev_avg = prev["total_penjualan"] / max(prev["jumlah_transaksi"], 1)
        if prev_avg > 0:
            avg_pct = round(((last_avg - prev_avg) / prev_avg) * 100)
            if avg_pct > 10:
                insights.append(
                    {
                        "type": "positive",
                        "icon": "💰",
                        "message": (
                            f"Rata-rata nilai per transaksi naik {avg_pct}% bulan {last['bulan']} "
                            f"(Rp{format_number(last_avg)} vs Rp{format_number(prev_avg)}). "
                            "Pelanggan cenderung berbelanja lebih banyak."
                        ),
                    }
                )
            elif avg_pct < -10:
                insights.append(
                    {
                        "type": "warning",
                        "icon": "📊",
                        "message": (
                            f"Rata-rata nilai per transaksi turun {abs(avg_pct)}% bulan {last['bulan']} "
                            f"(Rp{format_number(last_avg)} vs Rp{format_number(prev_avg)}). "
                            "Pelanggan berbelanja dalam nominal lebih kecil."
                        ),
                    }
                )

    # === INSIGHT 5: Sumber Pendapatan Terbesar ===
    performa = hitung_performa_per_sumber(transactions)
    best = max(performa, key=lambda item: item["total_penjualan"], default=None)
    if best and best["total_penjualan"] > 0:
        total_all = sum(p["total_penjualan"] for p in performa)
        share = round((best["total_penjualan"] / total_all) * 100) if total_all > 0 else 0
        insights.append(
            {
                "type": "info",
                "icon": "🏆",
                "message": (
                    f"Sumber pendapatan terbesar: {best['source_app']} "
                    f"(Rp{format_number(best['total_penjualan'])}, {share}% dari total). "
                    f"Fokuskan strategi di channel ini."
                ),
            }
        )

    # === INSIGHT 6: Perbandingan Biaya Operasional vs Pendapatan ===
    total_penjualan = hitung_total_penjualan(transactions)
    fees = hitung_breakdown_fee(transactions)
    if total_penjualan > 0:
        fee_ratio = round((fees["total"] / total_penjualan) * 100, 1)
        insights.append(
            {
                "type": "warning" if fee_ratio > 15 else "info",
                "icon": "🏦",
                "message": (
                    f"Total biaya operasional (fee + pajak): Rp{format_number(fees['total'])} "
                    f"({fee_ratio}% dari total penjualan). "
                    + (
                        "Rasio cukup tinggi! Pertimbangkan optimasi channel."
                        if fee_ratio > 15
                        else "Rasio biaya masih dalam batas wajar."
                    )
                ),
            }
        )

    # === INSIGHT 7: Bulan Terbaik vs Terburuk ===
    if len(tren) >= 2:
        best_month = max(tren, key=lambda item: item["total_penjualan"])
        worst_month = min(tren, key=lambda item: item["total_penjualan"])
        if best_month["bulan"] != worst_month["bulan"]:
            gap = best_month["total_penjualan"] - worst_month["total_penjualan"]
            insights.append(
                {
                    "type": "info",
                    "icon": "⭐",
                    "message": (
                        f"Bulan terbaik: {best_month['bulan']} (Rp{format_number(best_month['total_penjualan'])}). "
                        f"Bulan terendah: {worst_month['bulan']} (Rp{format_number(worst_month['total_penjualan'])}). "
                        f"Selisih: Rp{format_number(gap)}."
                    ),
                }
            )

    # === INSIGHT 8: Laba Kotor ===
    total_pengeluaran = hitung_total_pengeluaran(transactions)
    laba = total_penjualan - total_pengeluaran
    if total_penjualan > 0:
        margin = round((laba / total_penjualan) * 100, 1)
        insights.append(
            {
                "type": "positive" if margin > 0 else "negative",
                "icon": "💵" if margin > 0 else "🔴",
                "message": (
                    f"Margin laba kotor: {margin}% "
                    f"(Laba Rp{format_number(laba)} dari penjualan Rp{format_number(total_penjualan)}). "
                    + (
                        "Bisnis dalam kondisi sehat dan menguntungkan!"
                        if margin > 30
                        else "Profit positif, terus tingkatkan efisiensi."
                        if margin > 0
                        else "Bisnis sedang merugi. Segera evaluasi pengeluaran."
                    )
                ),
            }
        )

    # === INSIGHT 9: Total Transaksi Keseluruhan ===
    count_penjualan = sum(1 for item in transactions if item["type"] == "penjualan")
    count_pembelian = sum(1 for item in transactions if item["type"] == "pembelian_bahan")
    insights.append(
        {
            "type": "info",
            "icon": "📋",
            "message": (
                f"Total {len(transactions)} transaksi tercatat: "
                f"{count_penjualan} penjualan, {count_pembelian} pembelian bahan, "
                f"dan {len(transactions) - count_penjualan - count_pembelian} lainnya."
            ),
        }
    )

    return insights


def analisis_lengkap(transactions: list[dict[str, Any]]) -> dict[str, Any]:
    total_penjualan = hitung_total_penjualan(transactions)
    total_pengeluaran = hitung_total_pengeluaran(transactions)
    jumlah_penjualan = sum(1 for item in transactions if item["type"] == "penjualan")

    return {
        "ringkasan": {
            "total_penjualan": total_penjualan,
            "total_pengeluaran": total_pengeluaran,
            "laba_kotor": total_penjualan - total_pengeluaran,
            "rata_rata_transaksi": hitung_rata_rata(transactions),
            "jumlah_transaksi": len(transactions),
            "jumlah_penjualan": jumlah_penjualan,
        },
        "tren_bulanan": hitung_tren_bulanan(transactions),
        "performa_per_sumber": hitung_performa_per_sumber(transactions),
        "distribusi_tipe": hitung_distribusi_tipe(transactions),
        "breakdown_fee": hitung_breakdown_fee(transactions),
        "insights": generate_insights(transactions),
    }
