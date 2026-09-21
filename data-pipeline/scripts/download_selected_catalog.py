#!/usr/bin/env python3
"""Download one explicitly licensed, human-recorded candidate per app language."""

from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import hashlib
import json
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
CANDIDATES = ROOT / "data" / "audio_candidates"
MEDIA_OUT = REPO / "public" / "audio" / "catalog"
RUNTIME_OUT = REPO / "src" / "data" / "sourcedAudioCatalog.json"
REVIEW_OUT = CANDIDATES / "selected_catalog_review.json"
ATTRIBUTION_OUT = REPO / "docs" / "AUDIO_ATTRIBUTION.md"
MEDIA_OUT.mkdir(parents=True, exist_ok=True)

# Selections are intentionally explicit so reruns are reproducible and reviewable.
# Filename-derived Lingua Libre transcripts remain unverified until human review.
SELECTIONS = [
    {"clip_id": "clip_spanish", "language_id": "lang_spanish", "iso": "spa", "provider": "lingualibre", "text": "a enero sigue febrero, los dos son marrulleros", "translation": "January is followed by February; both are tricky."},
    {"clip_id": "clip_french", "language_id": "lang_french", "iso": "fra", "provider": "tatoeba", "candidate_id": "tatoeba-audio-472044"},
    {"clip_id": "clip_german", "language_id": "lang_german", "iso": "deu", "provider": "tatoeba", "candidate_id": "tatoeba-audio-746118"},
    {"clip_id": "clip_italian", "language_id": "lang_italian", "iso": "ita", "provider": "tatoeba", "candidate_id": "tatoeba-audio-1000194"},
    {"clip_id": "clip_portuguese", "language_id": "lang_portuguese", "iso": "por", "provider": "lingualibre", "text": "aborrecimento", "translation": "Boredom."},
    {"clip_id": "clip_welsh", "language_id": "lang_welsh", "iso": "cym", "provider": "lingualibre", "text": "Adwy Bwlch Du (Q132892412)", "translation": "Adwy Bwlch Du."},
    {"clip_id": "clip_polish", "language_id": "lang_polish", "iso": "pol", "provider": "tatoeba", "candidate_id": "tatoeba-audio-950109"},
    {"clip_id": "clip_russian", "language_id": "lang_russian", "iso": "rus", "provider": "tatoeba", "candidate_id": "tatoeba-audio-1275115"},
    {"clip_id": "clip_turkish", "language_id": "lang_turkish", "iso": "tur", "provider": "lingualibre", "text": "akşam yemeği", "translation": "Dinner."},
    {"clip_id": "clip_arabic", "language_id": "lang_arabic", "iso": "ara", "provider": "lingualibre", "text": "Get me a hot latte.", "translation": "Get me a hot latte."},
    {"clip_id": "clip_persian", "language_id": "lang_persian", "iso": "fas", "provider": "lingualibre", "text": "اتاق با تخت تاشو", "translation": "A room with a folding bed."},
    {"clip_id": "clip_hindi", "language_id": "lang_hindi", "iso": "hin", "provider": "lingualibre", "text": "अंजलाई अम्मल", "translation": "Anjalai Ammal."},
    {"clip_id": "clip_urdu", "language_id": "lang_urdu", "iso": "urd", "provider": "lingualibre", "text": "Tum kahaan rehte ho", "transcript": "تم کہاں رہتے ہو؟", "translation": "Where do you live?", "approved": True},
    {"clip_id": "clip_mandarin", "language_id": "lang_mandarin", "iso": "cmn", "provider": "lingualibre", "text": "2024年寶林茶室食品中毒事件", "translation": "The 2024 Polam Kopitiam food poisoning incident."},
    {"clip_id": "clip_japanese", "language_id": "lang_japanese", "iso": "jpn", "provider": "lingualibre", "text": "パン・オ・ショコラ", "translation": "Pain au chocolat."},
    {"clip_id": "clip_korean", "language_id": "lang_korean", "iso": "kor", "provider": "lingualibre", "text": "감사합니다", "translation": "Thank you."},
    {"clip_id": "clip_vietnamese", "language_id": "lang_vietnamese", "iso": "vie", "provider": "lingualibre", "text": "Ba mươi sáu kế", "translation": "The Thirty-Six Stratagems."},
    {"clip_id": "clip_swahili", "language_id": "lang_swahili", "iso": "swa", "provider": "lingualibre", "text": "Uwanja wa ndege", "translation": "Airport."},
    {"clip_id": "clip_amharic", "language_id": "lang_amharic", "iso": "amh", "provider": "lingualibre", "text": "ሲሶ", "translation": "One third."},
    {"clip_id": "clip_somali", "language_id": "lang_somali", "iso": "som", "provider": "lingualibre", "text": "Ardaygu waa qof dadaala si uu guul u gaaro.Ardaygu waa qofka la jaanqaadi kara casriga.Ardaygu waa qofka mustaqbalka maamuli doona.Ardaygu waa qof bartay si uu wax u saxo.", "translation": "A student works hard to succeed, adapts to the modern age, will lead the future, and learns in order to make things right."},
    {"clip_id": "clip_yoruba", "language_id": "lang_yoruba", "iso": "yor", "provider": "lingualibre", "text": "Adedoyin Ajibike Okupe", "translation": "Adedoyin Ajibike Okupe."},
    {"clip_id": "clip_quechua", "language_id": "lang_quechua", "iso": "que", "provider": "lingualibre", "text": "allquykita parqueman pusanayki kanchu kunan p'unchaw?", "translation": "Do you have to take your dog to the park today?"},
]


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


lingualibre = {
    iso: load_json(CANDIDATES / f"{iso}_candidates.json")
    for iso in {item["iso"] for item in SELECTIONS if item["provider"] == "lingualibre"}
}
tatoeba = []
for path in CANDIDATES.glob("tatoeba*_review.json"):
    tatoeba.extend(load_json(path))


def find_candidate(selection):
    if selection["provider"] == "lingualibre":
        matches = [
            item for item in lingualibre[selection["iso"]]
            if item.get("license_ok") and item.get("spoken_text_filename_guess") == selection["text"]
        ]
    else:
        matches = [item for item in tatoeba if item.get("id") == selection["candidate_id"]]
    if not matches:
        raise RuntimeError(f"Candidate not found: {selection}")
    return matches[0]


def download(url, destination):
    if destination.exists() and destination.stat().st_size > 0:
        return False
    for attempt in range(8):
        request = Request(url, headers={
            "User-Agent": "LingoDaily/0.1 (licensed audio catalog acquisition; contact repository owner)",
            "Referer": "https://commons.wikimedia.org/",
        })
        try:
            with urlopen(request, timeout=90) as response:
                destination.write_bytes(response.read())
            time.sleep(3)
            return True
        except (HTTPError, URLError) as error:
            if attempt == 7:
                raise
            retry_after = int(getattr(error, "headers", {}).get("Retry-After", "0") or 0)
            time.sleep(max(retry_after, min(60, 5 * (attempt + 1))))


def duration_seconds(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return round(float(result.stdout.strip()), 3)


manifest = []
for selection in SELECTIONS:
    candidate = find_candidate(selection)
    is_ll = selection["provider"] == "lingualibre"
    extension = ".wav" if is_ll else ".mp3"
    destination = MEDIA_OUT / f"{selection['iso']}{extension}"
    downloaded = download(candidate["audio_url"], destination)

    approved = bool(selection.get("approved"))
    transcript = selection.get("transcript") or (
        candidate.get("spoken_text_filename_guess") if is_ll else candidate["transcript_original"]
    )
    translation = selection.get("translation") or candidate.get("translation_english") or ""
    creator = (candidate.get("creator") or "").replace("Speaker: ", "").replace("\nRecorder: ", " / recorder: ")
    record = {
        "clipId": selection["clip_id"],
        "languageId": selection["language_id"],
        "languageIso": selection["iso"],
        "audioUrl": f"/audio/catalog/{destination.name}",
        "durationSeconds": duration_seconds(destination),
        "sizeBytes": destination.stat().st_size,
        "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
        "mimeType": "audio/wav" if is_ll else "audio/mpeg",
        "transcriptOriginal": transcript,
        "translationEnglish": translation,
        "transcriptLicense": "Filename-derived candidate text; verify before approval" if is_ll else candidate.get("sentence_license"),
        "translationLicense": "Project translation; verify before approval" if is_ll else candidate.get("translation_license"),
        "sourceName": "Lingua Libre / Wikimedia Commons" if is_ll else "Tatoeba",
        "sourceUrl": candidate.get("description_url") if is_ll else candidate.get("source_url"),
        "attributionUrl": candidate.get("description_url") if is_ll else candidate.get("attribution_url"),
        "license": candidate.get("license"),
        "creator": creator,
        "attribution": f"Human recording by {creator}",
        "qualityStatus": "VERIFIED" if approved else "PROVISIONAL",
        "moderationStatus": "APPROVED" if approved else "PENDING",
        "containsDirectGiveaway": False,
        "previewOnly": not approved,
        "enabled": True,
        "verification": {
            "languageVerified": approved,
            "dialectVerified": False,
            "transcriptVerified": approved,
            "translationVerified": approved,
            "directGiveawayChecked": approved,
            "approvedForGame": approved,
            "reviewStatus": "APPROVED" if approved else "PENDING",
            "notes": "Owner-approved production recording." if approved else "Human-recorded licensed candidate; requires language, transcript, translation, quality, and giveaway review.",
        },
    }
    manifest.append(record)
    action = "Downloaded" if downloaded else "Reused"
    print(f"{action} {selection['iso']}: {destination.name} ({record['durationSeconds']}s)")

payload = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
REVIEW_OUT.write_text(payload, encoding="utf-8")
RUNTIME_OUT.write_text(payload, encoding="utf-8")
attribution_lines = [
    "# Audio attribution",
    "",
    "Human-recorded audio stored by the Lingo review pipeline. A listed file is not production-approved unless its manifest verification state says so.",
    "",
    "| Language | Creator | Source | Licence | Local file |",
    "| --- | --- | --- | --- | --- |",
]
for record in manifest:
    creator = record["creator"].replace("|", "\\|") or "Unknown contributor"
    source = f"[{record['sourceName']}]({record['sourceUrl']})"
    attribution_lines.append(
        f"| {record['languageIso']} | {creator} | {source} | {record['license']} | `{record['audioUrl']}` |"
    )
ATTRIBUTION_OUT.write_text("\n".join(attribution_lines) + "\n", encoding="utf-8")
print(f"Wrote {len(manifest)} sourced recordings to {RUNTIME_OUT}")
