from __future__ import annotations

from collections import defaultdict

from pypdf import PdfReader

PDF_PATH = "sites/digital-facility-solutions/media/powerpoint.pdf"

BLACKS = {
    (0.0,),
    (0.0, 0.0, 0.0),
    (0.0, 0.0, 0.0, 1.0),
}


def norm_color(color):
    if color is None:
        return None
    return tuple(round(float(x), 3) for x in color)


def main() -> None:
    reader = PdfReader(PDF_PATH)

    for page_index, page in enumerate(reader.pages, start=1):
        current_fill: tuple[float, ...] | None = None
        current_stroke: tuple[float, ...] | None = None
        text_render_mode: int = 0
        colored_text_runs: dict[tuple[float, ...] | None, list[str]] = defaultdict(list)

        def visitor_operand_before(operator: str, operands, *_args, **_kwargs):
            nonlocal current_fill, current_stroke, text_render_mode
            if operator == "rg":
                current_fill = tuple(float(x) for x in operands)
            elif operator == "g":
                current_fill = (float(operands[0]),)
            elif operator == "k":
                current_fill = tuple(float(x) for x in operands)
            elif operator == "RG":
                current_stroke = tuple(float(x) for x in operands)
            elif operator == "G":
                current_stroke = (float(operands[0]),)
            elif operator == "K":
                current_stroke = tuple(float(x) for x in operands)
            elif operator == "Tr":
                try:
                    text_render_mode = int(operands[0])
                except Exception:  # noqa: BLE001
                    text_render_mode = 0

        def visitor_text(text: str, *_args, **_kwargs):
            t = " ".join((text or "").split())
            if not t:
                return
            # 0=fill, 1=stroke, 2=fill+stroke, 3=invisible, 4=fill+clip, 5=stroke+clip, 6=fill+stroke+clip, 7=clip
            uses_stroke = text_render_mode in {1, 2, 5, 6}
            color = current_stroke if uses_stroke else current_fill
            colored_text_runs[norm_color(color)].append(t)

        try:
            page.extract_text(visitor_text=visitor_text, visitor_operand_before=visitor_operand_before)
        except Exception as exc:  # noqa: BLE001
            print(f"\nPage {page_index}: extract_text failed: {exc}")
            continue

        non_black = {k: v for k, v in colored_text_runs.items() if k not in BLACKS}
        if not non_black:
            continue

        print(f"\n=== Page {page_index} non-black text runs ===")
        for color, texts in sorted(non_black.items(), key=lambda kv: (kv[0] is None, kv[0])):
            seen: set[str] = set()
            uniq: list[str] = []
            for t in texts:
                if t in seen:
                    continue
                seen.add(t)
                uniq.append(t)

            print(f"color {color} unique_runs={len(uniq)}")
            for t in uniq[:40]:
                print(f" - {t}")


if __name__ == "__main__":
    main()
