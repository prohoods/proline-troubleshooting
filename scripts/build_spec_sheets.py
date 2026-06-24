#!/usr/bin/env python3
"""Generate lib/knowledge/specSheetsData.ts from data/spec-sheets.csv.

Source of truth is the CSV (easy to edit / re-export from a sheet). Re-run after
editing:  python3 scripts/build_spec_sheets.py
"""
import csv
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "spec-sheets.csv")
OUT = os.path.join(ROOT, "lib", "knowledge", "specSheetsData.ts")

rows: dict[str, str] = {}
with open(SRC, newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        q = (row.get("Question") or "").strip()
        a = (row.get("Answer") or "").strip()
        if not q or not a:
            continue
        model = re.sub(r"^What are the specs for the ", "", q)
        model = re.sub(r"\?$", "", model).strip()
        rows[model] = a

os.makedirs(os.path.dirname(OUT), exist_ok=True)
body = json.dumps(rows, ensure_ascii=False, indent=2)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(
        "// AUTO-GENERATED from data/spec-sheets.csv by scripts/build_spec_sheets.py.\n"
        "// Do not edit by hand — edit the CSV and re-run the script.\n\n"
        f"export const SPEC_SHEETS: Record<string, string> = {body};\n"
    )

print(f"wrote {len(rows)} spec entries -> {os.path.relpath(OUT, ROOT)}")
