"""Cache page text and geometric table cells from the original local PDFs."""
import argparse
import hashlib
import json
from pathlib import Path


def extract(path):
    import pdfplumber
    path = Path(path)
    doc = pdfplumber.open(path)
    pages = []
    for number, page in enumerate(doc.pages, 1):
        tables = []
        for table in page.find_tables():
            tables.append({"bbox": list(table.bbox), "rows": table.extract(), "cells": [r.cells for r in table.rows]})
        pages.append({"page": number, "text": page.extract_text(layout=True), "tables": tables})
        page.close()
    result = {"file": path.name, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "pages": pages}
    output = Path("data/timetable/pdf-extracts")
    output.mkdir(parents=True, exist_ok=True)
    (output / (path.stem + ".json")).write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return f"{path.name}: {len(pages)} pages, {sum(len(t['rows']) for p in pages for t in p['tables'])} table rows"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf-dir", default="data/timetable/source-pdfs")
    args = parser.parse_args()
    for path in sorted(Path(args.pdf_dir).glob("*.pdf")):
        print(extract(path), flush=True)
