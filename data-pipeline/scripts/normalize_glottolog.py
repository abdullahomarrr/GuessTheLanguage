#!/usr/bin/env python3
"""Normalize Glottolog tabular exports into a provider-neutral catalog."""
from pathlib import Path
import csv
import io
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed"
OUT.mkdir(parents=True, exist_ok=True)

ARCHIVE = RAW / "glottolog_languoid.csv.zip"
GEO = RAW / "languages_and_dialects_geo.csv"
if not ARCHIVE.exists() or not GEO.exists():
    raise SystemExit("Missing Glottolog files. Run download_glottolog.py first.")


def first(row, *names):
    normalized = {key.lower(): value for key, value in row.items() if key}
    for name in names:
        value = normalized.get(name.lower())
        if value not in (None, ""):
            return value
    return None


def number(value):
    try:
        return float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def split_codes(value):
    return [item for item in re.split(r"[;,\s]+", value.strip()) if item] if value else []


with zipfile.ZipFile(ARCHIVE) as archive:
    csv_names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
    if not csv_names:
        raise SystemExit("No CSV found inside Glottolog zip")
    with archive.open(csv_names[0]) as raw:
        languoids = list(csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8-sig")))

geo_by_id = {}
with GEO.open(encoding="utf-8-sig", newline="") as source:
    for row in csv.DictReader(source):
        glottocode = first(row, "glottocode", "id")
        if glottocode:
            geo_by_id[glottocode] = row

records = []
for row in languoids:
    glottocode = first(row, "id", "glottocode")
    level = (first(row, "level") or "").lower()
    if not glottocode or level not in {"language", "dialect"}:
        continue

    geo = geo_by_id.get(glottocode, {})
    iso_codes = split_codes(
        first(row, "iso639p3code", "iso639-3", "iso")
        or first(geo, "isocodes", "iso639p3code")
    )
    latitude = number(first(geo, "latitude") or first(row, "latitude"))
    longitude = number(first(geo, "longitude") or first(row, "longitude"))
    records.append({
        "id": glottocode,
        "glottocode": glottocode,
        "name": first(row, "name") or first(geo, "name"),
        "level": level,
        "iso639_3": iso_codes[0] if iso_codes else None,
        "iso_codes": iso_codes,
        "parent_id": first(row, "parent_id", "parentid"),
        "latitude": latitude,
        "longitude": longitude,
        "macroarea": first(geo, "macroarea"),
        "aliases": [],
        "native_name": None,
        "geo_hint_type": "ORIGIN_POINT" if latitude is not None and longitude is not None else "DISABLED",
        "geo_anchor": {"latitude": latitude, "longitude": longitude} if latitude is not None and longitude is not None else None,
        "difficulty": None,
        "enabled": False,
        "source": "Glottolog 5.3",
        "source_license": "CC BY 4.0",
    })

records.sort(key=lambda record: ((record["name"] or "").casefold(), record["id"]))
(OUT / "languages.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")

fields = ["id", "glottocode", "name", "level", "iso639_3", "parent_id", "latitude", "longitude", "macroarea", "geo_hint_type", "difficulty", "enabled", "source", "source_license"]
with (OUT / "languages.csv").open("w", encoding="utf-8", newline="") as output:
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for record in records:
        writer.writerow({key: record.get(key) for key in fields})

print(f"Wrote {len(records):,} language/dialect rows")
