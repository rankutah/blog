#!/usr/bin/env python3

import argparse
import json
import logging
import os
import sys

try:
    from pypdf import PdfReader
except Exception as e:  # pragma: no cover
    sys.stderr.write(
        "Missing dependency: pypdf. Install with: pip3 install pypdf\n"
    )
    raise


def _as_str(v):
    try:
        if v is None:
            return None
        return str(v)
    except Exception:
        return None


def extract_pdf(path: str):
    reader = PdfReader(path)

    pages = []
    for page_index, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()

        annotations = []
        annots = page.get("/Annots") or []
        for annot_ref in annots:
            try:
                obj = annot_ref.get_object()
            except Exception:
                continue

            annotations.append(
                {
                    "page": page_index,
                    "subtype": _as_str(obj.get("/Subtype")),
                    "author": _as_str(obj.get("/T")),
                    "subject": _as_str(obj.get("/Subj")),
                    "modified": _as_str(obj.get("/M")),
                    "contents": _as_str(obj.get("/Contents")),
                    "rect": [float(x) for x in (obj.get("/Rect") or [])]
                    if obj.get("/Rect")
                    else None,
                }
            )

        pages.append({"page": page_index, "text": text, "annotations": annotations})

    return {
        "file": os.path.basename(path),
        "path": os.path.abspath(path),
        "pages": pages,
    }


def to_markdown(data):
    lines = []
    lines.append(f"# PDF Notes: {data.get('file','(unknown)')}")

    # Notes first
    all_annots = []
    for p in data.get("pages", []):
        all_annots.extend(p.get("annotations", []))

    lines.append("\n## Annotations")
    if not all_annots:
        lines.append("- (none found)")
    else:
        for a in all_annots:
            author = a.get("author") or "(unknown)"
            contents = (a.get("contents") or "").strip().replace("\r\n", "\n")
            contents = " ".join(contents.split())
            lines.append(f"- Page {a.get('page')}: **{author}** — {contents}")

    lines.append("\n## Extracted text")
    for p in data.get("pages", []):
        lines.append(f"\n### Page {p.get('page')}")
        text = (p.get("text") or "").strip()
        lines.append(text if text else "(no extractable text)")

    lines.append("")
    return "\n".join(lines)


def main(argv):
    parser = argparse.ArgumentParser(
        description="Extract text + annotations from a PDF (client note PDFs)."
    )
    parser.add_argument("pdf", help="Path to PDF")
    parser.add_argument(
        "--format",
        choices=["json", "md"],
        default="json",
        help="Output format (default: json)",
    )
    args = parser.parse_args(argv)

    # Keep stdout clean for JSON/MD (pypdf can be chatty on some PDFs)
    logging.getLogger().setLevel(logging.ERROR)
    logging.getLogger("pypdf").setLevel(logging.ERROR)

    data = extract_pdf(args.pdf)

    if args.format == "md":
        sys.stdout.write(to_markdown(data))
    else:
        json.dump(data, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")


if __name__ == "__main__":
    main(sys.argv[1:])
