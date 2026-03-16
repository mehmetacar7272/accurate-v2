from __future__ import annotations

from typing import Any

from reportlab.platypus import KeepTogether, Paragraph

from app.modules.document_engine.renderers.table_renderer import TableRenderer


class RevisionRenderer:
    def __init__(self, styles: dict[str, Any], table_renderer: TableRenderer):
        self.styles = styles
        self.table_renderer = table_renderer

    def render(self, rows: list[dict[str, str]]) -> list[Any]:
        if not rows:
            return []
        return [
            Paragraph('REVİZYON GEÇMİŞİ', self.styles['section']),
            KeepTogether([self.table_renderer.revision_table(rows)]),
        ]
