"""Report import readiness of archived asset registers without exporting asset or staff data.

Workbook cells are untrusted data. This tool only prints aggregate counts and row numbers
that need manual review. It does not write to a database or evaluate workbook formulas.
"""

from __future__ import annotations

import argparse
import io
import json
import zipfile
from collections import Counter
from pathlib import Path

from openpyxl import load_workbook


SOURCES = {
    "MACHINERY EQUIPMENT VHEHILCLE REGISTER FORM 2023.xlsx": (24, 4, 5),
    "Copy of Copy of ASSETS REGISTER FORM 2021.xlsx": (26, None, 5),
}


def review(archive: Path) -> list[dict]:
    reports = []
    with zipfile.ZipFile(archive) as source:
        for filename, (start_row, plate_col, serial_col) in SOURCES.items():
            info = source.getinfo(filename)
            if info.file_size > 3_000_000:
                raise ValueError(f"Workbook too large: {filename}")
            workbook = load_workbook(io.BytesIO(source.read(info)), read_only=True, data_only=True)
            sheet = workbook.worksheets[0]
            rows = []
            for row_number, row in enumerate(sheet.iter_rows(min_row=start_row, max_col=7, values_only=True), start_row):
                description = str(row[0] or "").strip()
                if not description:
                    continue
                plate = str(row[plate_col - 1] or "").strip() if plate_col else ""
                serial = str(row[serial_col - 1] or "").strip()
                rows.append((row_number, plate, serial))
            identifiers = Counter(value.casefold() for _, plate, serial in rows for value in (plate, serial) if value)
            reports.append({
                "source": filename,
                "asset_rows": len(rows),
                "rows_missing_plate_and_serial": [number for number, plate, serial in rows if not (plate or serial)],
                "rows_with_duplicate_identifier": [number for number, plate, serial in rows if any(identifiers[value.casefold()] > 1 for value in (plate, serial) if value)],
                "rows_missing_verified_license_expiry": [number for number, _, _ in rows],
                "import_status": "manual review required; no direct import",
            })
            workbook.close()
    return reports


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path)
    args = parser.parse_args()
    print(json.dumps(review(args.archive), indent=2))
