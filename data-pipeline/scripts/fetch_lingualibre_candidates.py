#!/usr/bin/env python3
"""Collect review-only Lingua Libre candidates from Wikimedia Commons."""
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import argparse
import csv
import json
import re
import time

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "audio_candidates"
OUT.mkdir(parents=True, exist_ok=True)
API = "https://commons.wikimedia.org/w/api.php"

parser = argparse.ArgumentParser()
parser.add_argument("--iso", required=True)
parser.add_argument("--limit", type=int, default=100)
parser.add_argument("--licenses", default="CC0,CC BY 4.0,CC BY 3.0")
args = parser.parse_args()
allowed = {value.strip().casefold() for value in args.licenses.split(",") if value.strip()}
category = f"Category:Lingua Libre pronunciation-{args.iso}"


def api(params):
    query = {"format": "json", "formatversion": "2", **params}
    for attempt in range(5):
        request = Request(
            API + "?" + urlencode(query),
            headers={"User-Agent": "LingoDaily/0.1 (contact: repository owner; educational language game)"},
        )
        try:
            with urlopen(request, timeout=60) as response:
                return json.load(response)
        except HTTPError as error:
            if error.code != 429 or attempt == 4:
                raise
            retry_after = int(error.headers.get("Retry-After", "0") or 0)
            time.sleep(max(retry_after, 2 ** (attempt + 1)))


titles = []
continuation = None
while len(titles) < args.limit:
    params = {"action": "query", "list": "categorymembers", "cmtitle": category, "cmtype": "file", "cmlimit": "max"}
    if continuation:
        params["cmcontinue"] = continuation
    data = api(params)
    titles += [item["title"] for item in data.get("query", {}).get("categorymembers", [])]
    continuation = data.get("continue", {}).get("cmcontinue")
    if not continuation:
        break

records = []
for offset in range(0, min(len(titles), args.limit), 50):
    batch = titles[offset:offset + 50]
    data = api({
        "action": "query",
        "prop": "imageinfo",
        "titles": "|".join(batch),
        "iiprop": "url|size|mime|extmetadata|commonmetadata",
    })
    for page in data.get("query", {}).get("pages", []):
        info = (page.get("imageinfo") or [{}])[0]
        extended = info.get("extmetadata") or {}
        common = info.get("commonmetadata") or {}

        def metadata(key):
            value = extended.get(key)
            return value.get("value") if isinstance(value, dict) else value

        license_name = (metadata("LicenseShortName") or metadata("UsageTerms") or "").strip()
        creator = re.sub("<[^>]+>", "", metadata("Artist") or "").strip()
        title = page.get("title", "")
        spoken_guess = title.rsplit("-", 1)[-1].rsplit(".", 1)[0] if "-" in title else None
        token_count = len(re.findall(r"\w+", spoken_guess or "", flags=re.UNICODE))
        records.append({
            "language_iso": args.iso,
            "commons_title": title,
            "audio_url": info.get("url"),
            "description_url": info.get("descriptionurl"),
            "mime": info.get("mime"),
            "size_bytes": info.get("size"),
            "duration_seconds": common.get("Duration") or common.get("duration"),
            "spoken_text_filename_guess": spoken_guess,
            "token_count_guess": token_count,
            "likely_phrase_or_sentence": token_count >= 3,
            "license": license_name,
            "license_ok": bool(license_name) and license_name.casefold() in allowed,
            "creator": creator,
            "source": "Lingua Libre / Wikimedia Commons",
            "review_status": "PENDING",
            "language_verified": False,
            "dialect_verified": False,
            "transcript_verified": False,
            "translation_verified": False,
            "direct_giveaway_checked": False,
            "approved_for_game": False,
        })

records.sort(key=lambda record: (not record["license_ok"], not record["likely_phrase_or_sentence"], -(record["token_count_guess"] or 0), record["commons_title"]))
json_path = OUT / f"{args.iso}_candidates.json"
csv_path = OUT / f"{args.iso}_candidates.csv"
json_path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
fields = list(records[0].keys()) if records else ["language_iso", "commons_title"]
with csv_path.open("w", encoding="utf-8", newline="") as output:
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    writer.writerows(records)

print(f"Wrote {len(records)} review candidates for {args.iso}")
