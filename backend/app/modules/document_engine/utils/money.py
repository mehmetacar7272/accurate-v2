from __future__ import annotations

from typing import Any


def currency_symbol(code: str | None) -> str:
    value = (code or "TRY").upper()
    return {"TRY": "₺", "TL": "₺", "USD": "$", "EUR": "€"}.get(value, value)


def money_label(value: Any, currency: str | None = "TRY") -> str:
    symbol = currency_symbol(currency)
    try:
        number = f"{float(value or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        return f"{number} {symbol}"
    except Exception:
        return f"0,00 {symbol}"
