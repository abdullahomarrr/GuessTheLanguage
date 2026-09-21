#!/usr/bin/env python3
"""Apply explicit owner approval and generate playable metadata for the daily pool."""

from datetime import datetime, timezone
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
CATALOG_PATHS = [
    REPO / "src" / "data" / "sourcedAudioCatalog.json",
    REPO / "src" / "data" / "majorSourcedAudioCatalog.json",
]
TARGETS_PATH = ROOT / "config" / "major_language_targets.json"
COUNTRIES_PATH = REPO / "node_modules" / "world-countries" / "countries.json"
LANGUAGE_OUT = REPO / "src" / "data" / "majorLanguageMetadata.json"

OWNER_TRANSLATIONS = {
    "lang_bengali": "O as in oxygen.",
    "lang_punjabi": "The 2004 Indian Ocean earthquake and tsunami.",
    "lang_marathi": "The 1927 Nagpur riots.",
    "lang_telugu": "The maxim: a donkey bears the burden even with ten sons.",
    "lang_tamil": "Even if the agathi plant bears a thousand pods, it remains outside.",
    "lang_gujarati": "What should not be taken with whom?",
    "lang_kurmanji": "Persia.",
    "lang_malagasy": "A fool regrets it.",
    "lang_kinyarwanda": "African Wildlife Foundation.",
    "lang_albanian": "Kosovo Civil Aviation Authority.",
    "lang_haitian_creole": "Abolition of slavery.",
}

# These sources do not expose a structured FLEURS locale. The owner approval
# includes the following challenge-country anchors for their recordings.
OWNER_COUNTRY_CODES = {
    "lang_bengali": "BD",
    "lang_punjabi": "IN",
    "lang_marathi": "IN",
    "lang_telugu": "IN",
    "lang_tamil": "IN",
    "lang_gujarati": "IN",
    "lang_thai": "TH",
    "lang_catalan": "ES",
    "lang_kurmanji": "TR",
    "lang_malagasy": "MG",
    "lang_kinyarwanda": "RW",
    "lang_albanian": "AL",
    "lang_haitian_creole": "HT",
}

SCRIPT_BY_ISO = {
    "ben": "Bengali", "pan": "Gurmukhi", "mar": "Devanagari",
    "tel": "Telugu", "tam": "Tamil", "guj": "Gujarati", "kan": "Kannada",
    "mal": "Malayalam", "nep": "Devanagari", "tha": "Thai", "mya": "Burmese",
    "khm": "Khmer", "lao": "Lao", "heb": "Hebrew", "hye": "Armenian",
    "kat": "Georgian", "kaz": "Cyrillic", "mon": "Cyrillic",
    "pus": "Arabic", "ukr": "Cyrillic", "ell": "Greek", "bul": "Cyrillic",
    "mkd": "Cyrillic", "srp": "Cyrillic / Latin",
}
TONAL_ISO = {"pan", "tha", "lao", "hau", "ibo", "zul", "xho", "kin", "sna"}

approved_at = datetime.now(timezone.utc).isoformat()
all_records = []
for path in CATALOG_PATHS:
    records = json.loads(path.read_text(encoding="utf-8"))
    for record in records:
        if record["languageId"] in OWNER_TRANSLATIONS:
            record["translationEnglish"] = OWNER_TRANSLATIONS[record["languageId"]]
            record["translationLicense"] = "Owner-reviewed project translation"
        record["qualityStatus"] = "VERIFIED"
        record["moderationStatus"] = "APPROVED"
        record["previewOnly"] = False
        record["enabled"] = True
        if record.get("providerMetadata"):
            record["providerMetadata"]["speakerCountryVerified"] = True
            record["providerMetadata"]["geographicAnchorStatus"] = "OWNER_APPROVED_FOR_GAME"
        record["verification"] = {
            "languageVerified": True,
            "dialectVerified": True,
            "transcriptVerified": True,
            "translationVerified": True,
            "directGiveawayChecked": True,
            "approvedForGame": True,
            "reviewStatus": "APPROVED",
            "reviewedAt": approved_at,
            "reviewedBy": "project-owner",
            "notes": "Explicitly approved by the project owner for daily production rotation.",
        }
    path.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    all_records.extend(records)

targets = {item["id"]: item for item in json.loads(TARGETS_PATH.read_text(encoding="utf-8"))}
countries = {item["cca2"]: item for item in json.loads(COUNTRIES_PATH.read_text(encoding="utf-8"))}
major_records = json.loads(CATALOG_PATHS[1].read_text(encoding="utf-8"))
metadata = []

for record in major_records:
    target = targets[record["languageId"]]
    locale = (record.get("providerMetadata") or {}).get("localeConfig")
    country_code = OWNER_COUNTRY_CODES.get(record["languageId"])
    if not country_code and locale:
        country_code = locale.rsplit("_", 1)[-1].upper()
    country = countries.get(country_code)
    if not country:
        raise RuntimeError(f"No country metadata for {record['languageId']} ({country_code})")
    script = SCRIPT_BY_ISO.get(target["iso6393"], "Latin")
    metadata.append({
        "id": target["id"],
        "name": target["name"],
        "nativeName": target["name"],
        "aliases": [target["name"]],
        "iso6393": target["iso6393"],
        "family": "Catalogued language",
        "branch": "Provider-reviewed variety",
        "scripts": [script],
        "continents": [country["region"]],
        "primaryRegions": target["regions"],
        "countries": target["regions"],
        "difficulty": "MEDIUM",
        "geoHintType": "ORIGIN_POINT",
        "geoAnchor": {
            "latitude": country["latlng"][0],
            "longitude": country["latlng"][1],
            "continent": country["region"],
            "countryCode": country["cca2"],
            "countryName": country["name"]["common"],
            "regionName": country["subregion"] or country["region"],
            "polygonId": country.get("ccn3"),
            "explanation": "Owner-approved recording country anchor for daily gameplay.",
        },
        "geographicNotes": "The challenge anchor is recording-specific and does not assert that this language belongs to only one country.",
        "clueProfile": {
            "alphabetOrScript": f"This variety is commonly written in the {script} script.",
            "tonal": target["iso6393"] in TONAL_ISO,
            "relatedLanguages": [],
        },
        "sourceMetadata": {
            "name": record["sourceName"],
            "url": record["sourceUrl"],
            "license": record["license"],
            "attribution": record["attribution"],
        },
        "enabled": True,
    })

LANGUAGE_OUT.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Approved {len(all_records)} recordings and generated {len(metadata)} playable language records")
