from __future__ import annotations

import json
from pathlib import Path
from typing import Any


DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "dummy_data.json"
_dummy_data: dict[str, Any] | None = None


def load_dummy_data() -> dict[str, Any]:
    global _dummy_data
    if _dummy_data is None:
        _dummy_data = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    return _dummy_data


def get_transactions(user_id: str) -> list[dict[str, Any]]:
    data = load_dummy_data()
    return [item for item in data["transactions"] if item["user_id"] == user_id]


def get_user_profile(user_id: str) -> dict[str, Any] | None:
    data = load_dummy_data()
    return data["users"].get(user_id)


def get_fee_structure() -> dict[str, str]:
    data = load_dummy_data()
    return data["fee_structure"]
