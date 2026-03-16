from __future__ import annotations

from typing import Any

from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import KeepTogether, Paragraph, Spacer

from app.modules.document_engine.renderers.table_renderer import TableRenderer


class SectionRenderer:
    def __init__(self, styles: dict[str, Any], table_renderer: TableRenderer):
        self.styles = styles
        self.table_renderer = table_renderer

    def render_offer_section(self, section: dict[str, Any]) -> list[Any]:
        block: list[Any] = [Paragraph(f"{section['code']} {section['title']}", self.styles['section'])]
        if section.get('scope_rows'):
            scope_rows = [[Paragraph('Kapsam Bilgileri', self.styles['table_header']), Paragraph('Değer', self.styles['table_header'])]]
            scope_rows.extend([[item['label'], item['value']] for item in section['scope_rows']])
            block.append(self.table_renderer.key_value_table(scope_rows, [6.0 * cm, 10.0 * cm], header_fill=colors.HexColor('#eef2f7')))
            block.append(Spacer(1, 0.10 * cm))
        block.append(self.table_renderer.section_pricing_table(section, section['currency']))
        block.append(Spacer(1, 0.18 * cm))
        return [KeepTogether(block)]
