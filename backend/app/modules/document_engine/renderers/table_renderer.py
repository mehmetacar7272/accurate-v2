from __future__ import annotations

from typing import Any

from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, Table, TableStyle

from app.modules.document_engine.styles.pdf_styles import HEADER_BG, LIGHT_BORDER, SUMMARY_HEADER_BG, SUMMARY_TOTAL_BG, TABLE_HEADER_BG
from app.modules.document_engine.utils.money import money_label


class TableRenderer:
    def __init__(self, styles: dict[str, Any], font_name: str):
        self.styles = styles
        self.font_name = font_name

    def key_value_table(self, rows: list[list[Any]], widths: list[float], highlight_first_col: bool = False, header_fill: colors.Color | None = None) -> Table:
        table = Table(
            rows,
            colWidths=widths,
            hAlign="LEFT",
            repeatRows=1 if len(rows) > 1 and isinstance(rows[0][0], Paragraph) else 0,
            splitByRow=0,
        )
        style = [
            ("GRID", (0, 0), (-1, -1), 0.5, LIGHT_BORDER),
            ("FONTNAME", (0, 0), (-1, -1), self.font_name),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("LEADING", (0, 0), (-1, -1), 11),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]
        if highlight_first_col:
            style.append(("BACKGROUND", (0, 0), (0, -1), HEADER_BG))
        if header_fill is not None:
            style.append(("BACKGROUND", (0, 0), (-1, 0), header_fill))
        table.setStyle(TableStyle(style))
        return table

    def section_pricing_table(self, section: dict[str, Any], currency: str) -> Table:
        tests_html = "<br/>".join(f"• {test}" for test in section.get("test_items") or []) or "-"
        price_rows = [
            [Paragraph("Hizmet Bedeli", self.styles["body"]), Paragraph(money_label(section["service_price"], currency), self.styles["right_bold"])],
            [Paragraph("Yol ve Konaklama", self.styles["body"]), Paragraph(money_label(section["travel_price"], currency), self.styles["right_bold"])],
            [Paragraph("Raporlama", self.styles["body"]), Paragraph(money_label(section["report_price"], currency), self.styles["right_bold"])],
            [Paragraph("Ara Toplam", self.styles["body"]), Paragraph(money_label(section["subtotal"], currency), self.styles["right_bold"])],
            [Paragraph("İskonto", self.styles["body"]), Paragraph("-" + money_label(section.get("discount_amount", 0), currency), self.styles["right_bold"])],
            [Paragraph(f"KDV ({section['vat_rate_label']})", self.styles["body"]), Paragraph(money_label(section["vat_amount"], currency), self.styles["right_bold"])],
            [Paragraph("Genel Toplam", self.styles["body"]), Paragraph(money_label(section["grand_total"], currency), self.styles["right_bold"])],
        ]
        nested_price = Table(price_rows, colWidths=[4.15 * cm, 2.25 * cm], hAlign="LEFT", splitByRow=0)
        nested_price.setStyle(TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), self.font_name),
            ("FONTSIZE", (0, 0), (-1, -1), 8.8),
            ("LEADING", (0, 0), (-1, -1), 10.6),
            ("LEFTPADDING", (0, 0), (-1, -1), 1.5),
	    ("RIGHTPADDING", (0, 0), (-1, -1), 1.5),
	    ("TOPPADDING", (0, 0), (-1, -1), 3),
	    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND", (0, -1), (-1, -1), SUMMARY_TOTAL_BG),
        ]))

        table = Table(
            [
                [Paragraph("Uygulanacak Testler", self.styles["table_header"]), Paragraph("Fiyat Özeti", self.styles["table_header"])],
                [Paragraph(tests_html, self.styles["body"]), nested_price],
            ],
            colWidths=[9.6 * cm, 6.4 * cm],
            hAlign="LEFT",
            splitByRow=0,
        )
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
    	    ("GRID", (0, 0), (-1, -1), 0.5, LIGHT_BORDER),

   	    ("FONTNAME", (0, 0), (-1, -1), self.font_name),
   	    ("FONTSIZE", (0, 0), (-1, -1), 9),
    	    ("LEADING", (0, 0), (-1, -1), 11.1),

   	    ("VALIGN", (0, 0), (-1, -1), "TOP"),

    # GENEL TABLO PADDING (tüm tablo)
   	    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    	    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    	    ("TOPPADDING", (0, 0), (-1, -1), 7),
    	    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),

    # ⭐ FİYAT ÖZETİ HÜCRESİ ÖZEL PADDING
    	    ("LEFTPADDING", (1, 1), (1, 1), 0),
    	    ("RIGHTPADDING", (1, 1), (1, 1), 0),
   	    ("TOPPADDING", (1, 1), (1, 1), 2),
    	    ("BOTTOMPADDING", (1, 1), (1, 1), 2),
        ]))
        return table

    def offer_summary_table(self, rows: list[dict[str, Any]], currency: str, totals: dict[str, float]) -> Table:
        data = [["Madde No", "Muayene Türü", "Tahmini Gün", "Ara Toplam", "İskonto", "KDV %", "KDV Tutarı", "Genel Toplam"]]
        for row in rows:
            data.append([
                row["row_no"],
                row["inspection_type_name"],
                str(row.get("estimated_days") or "-"),
                money_label(row["subtotal"], currency),
                "-" + money_label(row.get("discount_amount", 0), currency),
                row["vat_rate_label"],
                money_label(row["vat_amount"], currency),
                money_label(row["grand_total"], currency),
            ])
        data.extend([
            ["", "Toplam Ara Toplam", "", "", "", "", "", money_label(totals.get("subtotal_before_discount", 0), currency)],
            ["", "Toplam İskonto", "", "", "", "", "", "-" + money_label(totals.get("discount_amount", 0), currency)],
            ["", "İskonto Sonrası Tutar", "", "", "", "", "", money_label(totals.get("subtotal", 0), currency)],
            ["", "Toplam KDV", "", "", "", "", "", money_label(totals.get("vat_amount", 0), currency)],
            ["", "GENEL TOPLAM", "", "", "", "", "", money_label(totals.get("grand_total", 0), currency)],
        ])
        table = Table(
            data,
            colWidths=[1.5 * cm, 4.2 * cm, 2.0 * cm, 2.0 * cm, 2.0 * cm, 1.3 * cm, 2.0 * cm, 2.4 * cm],
            hAlign="LEFT",
            repeatRows=1,
            splitByRow=0,
        )
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), SUMMARY_HEADER_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.5, LIGHT_BORDER),
            ("FONTNAME", (0, 0), (-1, -1), self.font_name),
            ("FONTSIZE", (0, 0), (-1, -1), 8.4),
            ("LEADING", (0, 0), (-1, -1), 10.1),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BACKGROUND", (0, -5), (-1, -1), SUMMARY_TOTAL_BG),
            ("ALIGN", (2, 1), (2, -6), "CENTER"),
            ("ALIGN", (3, 1), (-1, -1), "RIGHT"),
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ]))
        return table

    def revision_table(self, rows: list[dict[str, str]]) -> Table:
        data = [["Revizyon No", "Revizyon Tarihi", "Açıklama"]]
        for row in rows:
            data.append([row["revision_no"], row["revision_date"], row["revision_reason"]])
        table = Table(data, colWidths=[2.6 * cm, 3.4 * cm, 10.0 * cm], hAlign="LEFT", repeatRows=1, splitByRow=0)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEADER_BG),
            ("GRID", (0, 0), (-1, -1), 0.5, LIGHT_BORDER),
            ("FONTNAME", (0, 0), (-1, -1), self.font_name),
            ("FONTSIZE", (0, 0), (-1, -1), 8.8),
            ("LEADING", (0, 0), (-1, -1), 10.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
        ]))
        return table
