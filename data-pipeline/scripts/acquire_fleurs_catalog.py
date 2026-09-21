#!/usr/bin/env python3
"""Fill major-language audio gaps from Google FLEURS without downloading the corpus."""

from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import argparse
import csv
import hashlib
import io
import json
import re
import subprocess
import sys
import tarfile
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
TARGETS_PATH = ROOT / "config" / "major_language_targets.json"
CATALOG_PATH = REPO / "src" / "data" / "majorSourcedAudioCatalog.json"
MEDIA_OUT = REPO / "public" / "audio" / "major"
REPORT_OUT = REPO / "docs" / "FLEURS_AUDIO_ACQUISITION.md"
BASE = "https://huggingface.co/datasets/google/fleurs/resolve/main/data"
DATASET_URL = "https://huggingface.co/datasets/google/fleurs"
USER_AGENT = "LingoDaily/0.1 (licensed FLEURS review catalog)"

parser = argparse.ArgumentParser()
parser.add_argument("--refresh-languages", help="Comma-separated ISO 639-3 codes to rebuild from FLEURS")
args = parser.parse_args()
refresh_iso = {value.strip() for value in args.refresh_languages.split(",")} if args.refresh_languages else set()

ISO_TO_CONFIG = {
    "ben": "bn_in", "pan": "pa_in", "mar": "mr_in", "tel": "te_in",
    "tam": "ta_in", "guj": "gu_in", "kan": "kn_in", "mal": "ml_in",
    "nep": "ne_np", "ind": "id_id", "zsm": "ms_my", "tha": "th_th",
    "mya": "my_mm", "khm": "km_kh", "lao": "lo_la", "tgl": "fil_ph",
    "jav": "jv_id", "nld": "nl_nl", "ces": "cs_cz", "slk": "sk_sk",
    "hun": "hu_hu", "ron": "ro_ro", "ukr": "uk_ua", "ell": "el_gr",
    "swe": "sv_se", "nob": "nb_no", "dan": "da_dk", "fin": "fi_fi",
    "isl": "is_is", "gle": "ga_ie", "heb": "he_il", "hye": "hy_am",
    "kat": "ka_ge", "aze": "az_az", "kaz": "kk_kz", "uzb": "uz_uz",
    "mon": "mn_mn", "pus": "ps_af", "hau": "ha_ng", "ibo": "ig_ng",
    "zul": "zu_za", "xho": "xh_za", "afr": "af_za", "orm": "om_et",
    "sna": "sn_zw", "wol": "wo_sn", "cat": "ca_es", "srp": "sr_rs",
    "hrv": "hr_hr", "bul": "bg_bg", "lit": "lt_lt", "lav": "lv_lv",
    "est": "et_ee", "slv": "sl_si", "mkd": "mk_mk", "mri": "mi_nz",
}


def fetch_bytes(url):
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=90) as response:
        return response.read()


def read_tsv(url):
    text = fetch_bytes(url).decode("utf-8")
    return list(csv.reader(io.StringIO(text), delimiter="\t"))


def normalize_terms(values):
    return {value.casefold() for value in values if value and len(value) > 2}


def choose_candidate(rows, english_by_id, blocked_terms):
    candidates = []
    for row in rows:
        if len(row) < 7 or row[0] not in english_by_id:
            continue
        transcript = row[2].strip()
        translation = english_by_id[row[0]][2].strip()
        combined = f"{transcript} {translation}".casefold()
        if any(re.search(rf"\b{re.escape(term)}\b", combined) for term in blocked_terms):
            continue
        words = len(re.findall(r"\w+", translation, flags=re.UNICODE))
        if 7 <= words <= 24:
            candidates.append(row)
    return min(candidates, key=lambda row: row[1], default=None)


def stream_member(url, filename):
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=180) as response:
        with tarfile.open(fileobj=response, mode="r|gz") as archive:
            for member in archive:
                if member.isfile() and Path(member.name).name == filename:
                    extracted = archive.extractfile(member)
                    if extracted is None:
                        break
                    return extracted.read()
    raise RuntimeError(f"{filename} was not found in the streamed archive")


def duration(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return round(float(result.stdout.strip()), 3)


MEDIA_OUT.mkdir(parents=True, exist_ok=True)
targets = json.loads(TARGETS_PATH.read_text(encoding="utf-8"))
catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8")) if CATALOG_PATH.exists() else []
records = {item["languageId"]: item for item in catalog}

english_rows = []
for split in ("train", "dev", "test"):
    english_rows.extend(read_tsv(f"{BASE}/en_us/{split}.tsv"))
english_by_id = {row[0]: row for row in english_rows if len(row) >= 3}
added = []
unsupported = []
failed = []

for target in targets:
    if target["id"] in records and target["iso6393"] not in refresh_iso:
        continue
    if target["iso6393"] in refresh_iso:
        records.pop(target["id"], None)
    config = ISO_TO_CONFIG.get(target["iso6393"])
    if not config:
        unsupported.append(target["name"])
        continue

    metadata_url = f"{BASE}/{config}/dev.tsv"
    archive_url = f"{BASE}/{config}/audio/dev.tar.gz"
    try:
        rows = read_tsv(metadata_url)
        blocked = normalize_terms(target.get("regions", []))
        candidate = choose_candidate(rows, english_by_id, blocked)
        if not candidate:
            failed.append(f"{target['name']} (no safe translated sentence)")
            continue
        sentence_id, filename, transcript = candidate[0], candidate[1], candidate[2].strip()
        translation = english_by_id[sentence_id][2].strip()
        destination = MEDIA_OUT / f"{target['iso6393']}.wav"
        if destination.exists() and destination.stat().st_size > 0:
            audio = destination.read_bytes()
        else:
            audio = stream_member(archive_url, filename)
            destination.write_bytes(audio)
        record = {
            "clipId": f"clip_{target['id'].removeprefix('lang_')}",
            "languageId": target["id"],
            "languageIso": target["iso6393"],
            "audioUrl": f"/audio/major/{destination.name}",
            "durationSeconds": duration(destination),
            "sizeBytes": len(audio),
            "sha256": hashlib.sha256(audio).hexdigest(),
            "mimeType": "audio/wav",
            "transcriptOriginal": transcript,
            "translationEnglish": translation,
            "transcriptLicense": "CC BY 4.0 (Google FLEURS / FLORES)",
            "translationLicense": "CC BY 4.0 (Google FLEURS / FLORES)",
            "sourceName": "Google FLEURS via Hugging Face",
            "sourceUrl": f"{DATASET_URL}/tree/main/data/{config}",
            "attributionUrl": DATASET_URL,
            "license": "CC BY 4.0",
            "creator": "Google FLEURS project; anonymous dataset speaker",
            "attribution": "Google FLEURS dataset (CC BY 4.0); anonymous human speaker",
            "qualityStatus": "PROVISIONAL",
            "moderationStatus": "PENDING",
            "containsDirectGiveaway": False,
            "previewOnly": True,
            "enabled": True,
            "providerMetadata": {
                "localeConfig": config,
                "sentenceId": sentence_id,
                "sourceFilename": filename,
                "speakerGenderLabel": candidate[6],
                "speakerCountryVerified": False,
                "geographicAnchorStatus": "LOCALE_ONLY_PENDING_REVIEW",
                "metadataUrl": metadata_url,
                "archiveUrl": archive_url,
            },
            "verification": {
                "languageVerified": False,
                "dialectVerified": False,
                "transcriptVerified": False,
                "translationVerified": False,
                "directGiveawayChecked": False,
                "approvedForGame": False,
                "reviewStatus": "PENDING",
                "notes": "Licensed human FLEURS sample. Locale is not accepted as proof of speaker country until reviewed.",
            },
        }
        records[target["id"]] = record
        added.append(target["name"])
        CATALOG_PATH.write_text(json.dumps(list(records.values()), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Stored {target['name']} from FLEURS ({config})")
        time.sleep(0.25)
    except (HTTPError, URLError, RuntimeError, subprocess.CalledProcessError) as error:
        failed.append(f"{target['name']} ({error})")
        print(f"Skipped {target['name']}: {error}")

fleurs_language_ids = {
    record["languageId"] for record in records.values()
    if record.get("sourceName") == "Google FLEURS via Hugging Face"
}
fleurs_languages = [target["name"] for target in targets if target["id"] in fleurs_language_ids]
lines = [
    "# FLEURS audio acquisition",
    "",
    f"- Newly stored in this run: **{len(added)}**",
    f"- FLEURS recordings currently stored: **{len(fleurs_languages)}**",
    f"- Major-language recordings now stored: **{len(records)}**",
    f"- Configured targets not represented by FLEURS: **{len(unsupported)}**",
    f"- Failed or missing safe samples: **{len(failed)}**",
    "- Every FLEURS record remains **pending review**.",
    "- Locale configuration is retained as evidence but is not treated as verified speaker country.",
    "",
    "## FLEURS coverage",
    "",
    *(f"- {name}" for name in fleurs_languages),
    "",
    "## Unsupported targets",
    "",
    *(f"- {name}" for name in unsupported),
    "",
    "## Failed",
    "",
    *(f"- {name}" for name in failed),
]
REPORT_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"Added {len(added)} FLEURS recordings; catalog now has {len(records)} major-language files")
