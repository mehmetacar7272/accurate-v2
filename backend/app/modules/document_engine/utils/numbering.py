from __future__ import annotations


def generate_section_code(main_index: int, sub_index: int) -> str:
    return f"{int(main_index)}.{int(sub_index)}"
