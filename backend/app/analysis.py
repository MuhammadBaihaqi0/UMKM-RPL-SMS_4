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
    insights: list[dict[str, str]] = []
    tren = hitung_tren_bulanan(transactions)

    if len(tren) >= 2:
        last = tren[-1]
        prev = tren[-2]
        if prev["total_penjualan"] != 0:
            pct = round(
                ((last["total_penjualan"] - prev["total_penjualan"]) / prev["total_penjualan"])
                * 100
            )
            if pct > 0:
                insights.append(
                    {
                        "type": "positive",
                        "icon": "📈",
                        "message": f"Penjualan bulan {last['bulan']} naik {pct:.0f}% dibanding bulan sebelumnya!",
                    }
                )
            elif pct < 0:
                insights.append(
                    {
                        "type": "negative",
                        "icon": "📉",
                        "message": f"Penjualan bulan {last['bulan']} turun {abs(pct):.0f}% dibanding bulan sebelumnya.",
                    }
                )

    performa = hitung_performa_per_sumber(transactions)
    best = max(performa, key=lambda item: item["total_penjualan"], default=None)
    if best and best["total_penjualan"] > 0:
        insights.append(
            {
                "type": "info",
                "icon": "🏆",
                "message": (
                    f"Sumber pendapatan terbesar berasal dari {best['source_app']} "
                    f"dengan total Rp{format_number(best['total_penjualan'])}."
                ),
            }
        )

    avg = hitung_rata_rata(transactions)
    insights.append(
        {
            "type": "info",
            "icon": "💰",
            "message": f"Rata-rata nilai penjualan per transaksi adalah Rp{format_number(avg)}.",
        }
    )

    fees = hitung_breakdown_fee(transactions)
    insights.append(
        {
            "type": "warning",
            "icon": "🏦",
            "message": (
                "Total biaya operasional (fee + pajak) mencapai "
                f"Rp{format_number(fees['total'])}. Pertimbangkan optimasi channel penjualan."
            ),
        }
    )

    if tren:
        best_month = max(tren, key=lambda item: item["total_penjualan"])
        insights.append(
            {
                "type": "positive",
                "icon": "⭐",
                "message": (
                    f"Bulan terbaik untuk penjualan adalah {best_month['bulan']} "
                    f"dengan total Rp{format_number(best_month['total_penjualan'])}."
                ),
            }
        )

    count = sum(1 for item in transactions if item["type"] == "penjualan")
    insights.append(
        {
            "type": "info",
            "icon": "📊",
            "message": f"Total {count} transaksi penjualan tercatat dalam periode ini.",
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
