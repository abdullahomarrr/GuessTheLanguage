#!/usr/bin/env python3
"""Acquire a resumable review catalog for configured major languages."""

from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import argparse
import hashlib
import json
import re
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
TARGETS_PATH = ROOT / "config" / "major_language_targets.json"
CANDIDATES = ROOT / "data" / "audio_candidates"
SELECTIONS_PATH = CANDIDATES / "major_language_selected.json"
PROGRESS_PATH = CANDIDATES / "major_language_progress.json"
TATOEBA_PATH = CANDIDATES / "tatoeba_major_languages_review.json"
MEDIA_OUT = REPO / "public" / "audio" / "major"
RUNTIME_OUT = REPO / "src" / "data" / "majorSourcedAudioCatalog.json"
REPORT_OUT = REPO / "docs" / "MAJOR_AUDIO_ACQUISITION.md"
COMMONS_API = "https://commons.wikimedia.org/w/api.php"
ALLOWED_LICENSES = {"cc0", "cc by 4.0", "cc by 3.0", "cc by-sa 4.0", "cc by-sa 3.0"}


class ProviderThrottled(RuntimeError):
    pass

parser = argparse.ArgumentParser()
parser.add_argument("--metadata-only", action="store_true")
parser.add_argument("--skip-metadata", action="store_true")
parser.add_argument("--download-provider", choices=("tatoeba", "lingualibre"))
parser.add_argument("--max-downloads", type=int, default=0, help="0 means continue until complete or throttled")
parser.add_argument("--request-delay", type=float, default=1.0)
parser.add_argument("--languages", help="Comma-separated ISO 639-3 codes to process")
args = parser.parse_args()
requested_iso = {value.strip() for value in args.languages.split(",")} if args.languages else None

MEDIA_OUT.mkdir(parents=True, exist_ok=True)
CANDIDATES.mkdir(parents=True, exist_ok=True)
targets = json.loads(TARGETS_PATH.read_text(encoding="utf-8"))
tatoeba = json.loads(TATOEBA_PATH.read_text(encoding="utf-8")) if TATOEBA_PATH.exists() else []
tatoeba_by_language = {item["language_id"]: item for item in tatoeba}


def commons_query(target):
    params = {
        "action": "query",
        "format": "json",
        "formatversion": "2",
        "generator": "categorymembers",
        "gcmtitle": f"Category:Lingua Libre pronunciation-{target['iso6393']}",
        "gcmtype": "file",
        "gcmlimit": "50",
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata|commonmetadata",
    }
    request = Request(
        COMMONS_API + "?" + urlencode(params),
        headers={"User-Agent": "LingoDaily/0.1 (major language review catalog)"},
    )
    with urlopen(request, timeout=60) as response:
        return json.load(response).get("query", {}).get("pages", [])


def metadata_value(extended, key):
    value = extended.get(key)
    return value.get("value") if isinstance(value, dict) else value


def select_commons_candidate(target):
    try:
        pages = commons_query(target)
    except HTTPError as error:
        if error.code == 429:
            raise ProviderThrottled from error
        print(f"{target['iso6393']}: Commons metadata failed ({error})")
        return None
    except URLError as error:
        print(f"{target['iso6393']}: Commons metadata failed ({error})")
        return None

    candidates = []
    region_terms = {term.casefold() for term in target.get("regions", [])}
    for page in pages:
        info = (page.get("imageinfo") or [{}])[0]
        extended = info.get("extmetadata") or {}
        common = info.get("commonmetadata") or {}
        license_name = (metadata_value(extended, "LicenseShortName") or metadata_value(extended, "UsageTerms") or "").strip()
        if license_name.casefold() not in ALLOWED_LICENSES:
            continue
        title = page.get("title", "")
        text = title.rsplit("-", 1)[-1].rsplit(".", 1)[0] if "-" in title else ""
        if not text:
            continue
        creator = re.sub("<[^>]+>", "", metadata_value(extended, "Artist") or "").strip()
        tokens = len(re.findall(r"\w+", text, flags=re.UNICODE))
        giveaway = any(term and term in text.casefold() for term in region_terms)
        score = (0 if giveaway else 1000) + min(tokens, 12) * 100 + min(len(text), 100)
        candidates.append({
            "provider": "lingualibre",
            "language_id": target["id"],
            "language_iso": target["iso6393"],
            "audio_url": info.get("url"),
            "source_url": info.get("descriptionurl"),
            "transcript_original": text,
            "translation_english": "[Translation pending review]",
            "transcript_license": "Filename-derived candidate text; verify before approval",
            "translation_license": "Pending project translation",
            "license": license_name,
            "creator": creator,
            "mime": info.get("mime") or "audio/wav",
            "source": "Lingua Libre / Wikimedia Commons",
            "size_bytes_provider": info.get("size"),
            "duration_seconds_provider": common.get("Duration") or common.get("duration"),
            "contains_possible_giveaway": giveaway,
            "score": score,
        })
    return max(candidates, key=lambda item: item["score"], default=None)


def make_tatoeba_candidate(target, item):
    return {
        "provider": "tatoeba",
        "language_id": target["id"],
        "language_iso": target["iso6393"],
        "audio_url": item["audio_url"],
        "source_url": item["source_url"],
        "transcript_original": item["transcript_original"],
        "translation_english": item["translation_english"],
        "transcript_license": item.get("sentence_license"),
        "translation_license": item.get("translation_license"),
        "license": item["license"],
        "creator": item.get("creator") or "",
        "attribution_url": item.get("attribution_url"),
        "mime": "audio/mpeg",
        "source": "Tatoeba",
        "contains_possible_giveaway": False,
        "score": 10000,
    }


if SELECTIONS_PATH.exists():
    previous = json.loads(SELECTIONS_PATH.read_text(encoding="utf-8"))
    selections = {item["language_id"]: item for item in previous}
else:
    selections = {}

# Tatoeba is an independent provider. Seed all of its reusable sentence
# candidates up front so a Commons throttle cannot prevent their acquisition.
for target in targets:
    if target["id"] not in selections and target["id"] in tatoeba_by_language:
        selections[target["id"]] = make_tatoeba_candidate(target, tatoeba_by_language[target["id"]])

if PROGRESS_PATH.exists():
    processed_language_ids = set(json.loads(PROGRESS_PATH.read_text(encoding="utf-8")))
else:
    processed_language_ids = set(selections)

for index, target in enumerate(targets):
    if args.skip_metadata:
        break
    if requested_iso and target["iso6393"] not in requested_iso:
        continue
    if target["id"] in processed_language_ids:
        continue
    if target["id"] in tatoeba_by_language:
        candidate = make_tatoeba_candidate(target, tatoeba_by_language[target["id"]])
    else:
        try:
            candidate = select_commons_candidate(target)
        except ProviderThrottled:
            print(f"Commons metadata throttled at {target['iso6393']}; rerun later to resume")
            break
        if index + 1 < len(targets):
            time.sleep(args.request_delay)
    if candidate:
        selections[target["id"]] = candidate
        print(f"Selected {target['iso6393']} from {candidate['source']}")
    else:
        print(f"No reusable candidate for {target['iso6393']}")
    processed_language_ids.add(target["id"])
    checkpoint = [selections[item["id"]] for item in targets if item["id"] in selections]
    SELECTIONS_PATH.write_text(json.dumps(checkpoint, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    progress = [item["id"] for item in targets if item["id"] in processed_language_ids]
    PROGRESS_PATH.write_text(json.dumps(progress, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

selected_list = [selections[target["id"]] for target in targets if target["id"] in selections]
SELECTIONS_PATH.write_text(json.dumps(selected_list, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def extension_for(candidate):
    return ".mp3" if candidate["mime"] == "audio/mpeg" or candidate["provider"] == "tatoeba" else ".wav"


def probe_duration(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return round(float(result.stdout.strip()), 3)


downloaded_this_run = 0
downloaded_language_ids = set()
if not args.metadata_only:
    for candidate in selected_list:
        if requested_iso and candidate["language_iso"] not in requested_iso:
            continue
        if args.download_provider and candidate["provider"] != args.download_provider:
            continue
        destination = MEDIA_OUT / f"{candidate['language_iso']}{extension_for(candidate)}"
        if destination.exists() and destination.stat().st_size > 0:
            continue
        if args.max_downloads and downloaded_this_run >= args.max_downloads:
            break
        request = Request(candidate["audio_url"], headers={
            "User-Agent": "LingoDaily/0.1 (licensed major language audio acquisition)",
            "Referer": candidate.get("source_url") or "https://commons.wikimedia.org/",
        })
        try:
            with urlopen(request, timeout=90) as response:
                destination.write_bytes(response.read())
        except HTTPError as error:
            if error.code == 429:
                print(f"Provider throttled at {candidate['language_iso']}; rerun later to resume")
                break
            raise
        downloaded_this_run += 1
        downloaded_language_ids.add(candidate["language_id"])
        print(f"Downloaded {candidate['language_iso']}: {destination.name}")
        time.sleep(3)

existing_runtime = json.loads(RUNTIME_OUT.read_text(encoding="utf-8")) if RUNTIME_OUT.exists() else []
runtime_by_language = {record["languageId"]: record for record in existing_runtime}
for candidate in selected_list:
    destination = MEDIA_OUT / f"{candidate['language_iso']}{extension_for(candidate)}"
    if not destination.exists() or destination.stat().st_size == 0:
        continue
    if candidate["language_id"] in runtime_by_language:
        continue
    if candidate["language_id"] not in downloaded_language_ids:
        print(
            f"Skipped cataloging {candidate['language_iso']}: existing file has no matching runtime provenance"
        )
        continue
    contents = destination.read_bytes()
    runtime_by_language[candidate["language_id"]] = {
        "clipId": f"clip_{candidate['language_id'].removeprefix('lang_')}",
        "languageId": candidate["language_id"],
        "languageIso": candidate["language_iso"],
        "audioUrl": f"/audio/major/{destination.name}",
        "durationSeconds": probe_duration(destination),
        "sizeBytes": len(contents),
        "sha256": hashlib.sha256(contents).hexdigest(),
        "mimeType": candidate["mime"],
        "transcriptOriginal": candidate["transcript_original"],
        "translationEnglish": candidate["translation_english"],
        "transcriptLicense": candidate.get("transcript_license"),
        "translationLicense": candidate.get("translation_license"),
        "sourceName": candidate["source"],
        "sourceUrl": candidate["source_url"],
        "attributionUrl": candidate.get("attribution_url") or candidate["source_url"],
        "license": candidate["license"],
        "creator": candidate["creator"],
        "attribution": f"Human recording by {candidate['creator'] or 'source contributor'}",
        "qualityStatus": "PROVISIONAL",
        "moderationStatus": "PENDING",
        "containsDirectGiveaway": bool(candidate.get("contains_possible_giveaway")),
        "previewOnly": True,
        "enabled": True,
        "verification": {
            "languageVerified": False,
            "dialectVerified": False,
            "transcriptVerified": False,
            "translationVerified": False,
            "directGiveawayChecked": False,
            "approvedForGame": False,
            "reviewStatus": "PENDING",
            "notes": "Human-recorded licensed candidate; requires full review and speaker-geography evidence.",
        },
    }

runtime = list(runtime_by_language.values())
RUNTIME_OUT.write_text(json.dumps(runtime, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
selected_stored = sum(1 for candidate in selected_list if candidate["language_id"] in runtime_by_language)
lines = [
    "# Major-language audio acquisition",
    "",
    f"- Configured new language targets: **{len(targets)}**",
    f"- Targets with a reusable human-recorded candidate: **{len(selected_list)}**",
    f"- Major-language files currently stored across providers: **{len(runtime)}**",
    f"- Selected candidates currently stored: **{selected_stored}**",
    f"- Remaining selected downloads: **{len(selected_list) - selected_stored}**",
    "- All records in this expansion remain **pending review**.",
    "",
    "Speaker country is intentionally not inferred from language or provider metadata.",
]
REPORT_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(
    f"Stored {len(runtime)} major-language files across providers; "
    f"{selected_stored} of {len(selected_list)} selected candidates are stored"
)
