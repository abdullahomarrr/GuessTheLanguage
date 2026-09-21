#!/usr/bin/env python3
"""Collect a small, licence-filtered Tatoeba sentence-audio review queue.

This stores metadata and official audio URLs; it does not download/re-host audio
and never approves a candidate automatically.
"""
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import argparse
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "audio_candidates"
OUT.mkdir(parents=True, exist_ok=True)
API = "https://api.tatoeba.org/v1/sentences"

LANGUAGE_IDS = {
    "spa": "lang_spanish",
    "fra": "lang_french",
    "deu": "lang_german",
    "jpn": "lang_japanese",
    "por": "lang_portuguese",
    "tur": "lang_turkish",
    "swa": "lang_swahili",
    "kor": "lang_korean",
    "rus": "lang_russian",
    "pol": "lang_polish",
    "urd": "lang_urdu",
}

PROVIDER_LANGUAGE_CODES = {
    "swa": "swh",
}

parser = argparse.ArgumentParser()
parser.add_argument("--languages", default=",".join(LANGUAGE_IDS))
parser.add_argument("--per-language", type=int, default=2)
parser.add_argument("--scan-limit", type=int, default=60)
parser.add_argument("--output", default="tatoeba_starter_review.json")
args = parser.parse_args()

allowed_licenses = {
    "CC0 1.0",
    "CC BY 2.0",
    "CC BY 2.0 FR",
    "CC BY 3.0",
    "CC BY 4.0",
    "CC BY-SA 2.0",
    "CC BY-SA 3.0",
    "CC BY-SA 4.0",
}


def fetch(language):
    provider_language = PROVIDER_LANGUAGE_CODES.get(language, language)
    params = {
        "lang": provider_language,
        "has_audio": "yes",
        "is_unapproved": "no",
        "is_orphan": "no",
        "word_count": "6-18",
        "trans:lang": "eng",
        "trans:is_direct": "yes",
        "trans:is_unapproved": "no",
        "showtrans:lang": "eng",
        "showtrans:is_direct": "yes",
        "showtrans:is_unapproved": "no",
        "include": "audios",
        "sort": "random",
        "limit": min(args.scan_limit, 100),
    }
    request = Request(
        API + "?" + urlencode(params),
        headers={"User-Agent": "LingoDaily/0.1 (language game candidate review)"},
    )
    with urlopen(request, timeout=60) as response:
        return json.load(response).get("data", [])


records = []
for language in [value.strip() for value in args.languages.split(",") if value.strip()]:
    if language not in LANGUAGE_IDS:
        raise SystemExit(f"No app language ID mapping configured for {language}")

    selected = 0
    try:
        sentences = fetch(language)
    except HTTPError as error:
        print(f"{language}: provider rejected query ({error.code}); skipped")
        continue

    for sentence in sentences:
        translations = [
            translation for translation in sentence.get("translations", [])
            if translation.get("lang") == "eng" and not translation.get("is_unapproved", False)
        ]
        if not translations:
            continue

        for audio in sentence.get("audios", []):
            license_name = audio.get("license") or audio.get("licence") or ""
            if not license_name:
                continue

            records.append({
                "id": f"tatoeba-audio-{audio['id']}",
                "language_id": LANGUAGE_IDS[language],
                "language_iso": language,
                "provider_language_code": PROVIDER_LANGUAGE_CODES.get(language, language),
                "sentence_id": sentence["id"],
                "audio_id": audio["id"],
                # Tatoeba's public download route follows the contributor's reuse
                # policy and redirects to the corresponding MP3 asset.
                "audio_url": f"https://tatoeba.org/audio/download/{audio['id']}",
                "source_url": f"https://tatoeba.org/en/sentences/show/{sentence['id']}",
                "transcript_original": sentence["text"],
                "translation_english": translations[0]["text"],
                "sentence_license": sentence.get("license"),
                "translation_license": translations[0].get("license"),
                "license": license_name,
                "license_policy_status": "PREFERRED" if license_name in allowed_licenses else "REVIEW_REQUIRED",
                "creator": audio.get("author"),
                "attribution_url": audio.get("attribution_url"),
                "source": "Tatoeba",
                "recording_created": audio.get("created"),
                "speaker_region": None,
                "review_status": "PENDING",
                "language_verified": False,
                "dialect_verified": False,
                "transcript_verified": False,
                "translation_verified": False,
                "direct_giveaway_checked": False,
                "approved_for_game": False,
            })
            selected += 1
            break

        if selected >= args.per_language:
            break

    print(f"{language}: selected {selected} candidate(s)")

output = OUT / args.output
output.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Wrote {len(records)} pending candidates to {output}")
