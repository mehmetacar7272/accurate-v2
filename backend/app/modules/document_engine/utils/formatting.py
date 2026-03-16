from __future__ import annotations

import re
from pathlib import Path


def slugify_filename(value: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9._-]+", "_", value or "document")
    return normalized.strip("_") or "document"


def resolve_asset_path(base_file: str, path_value: str | None) -> Path | None:
    if not path_value:
        return None
    candidate = Path(path_value)
    if candidate.exists():
        return candidate
    root = Path(base_file).resolve().parents[4]
    relative_candidate = root / path_value
    if relative_candidate.exists():
        return relative_candidate
    if path_value.startswith('backend/'):
        backend_relative = root / path_value.split('backend/', 1)[1]
        if backend_relative.exists():
            return backend_relative
    return None
