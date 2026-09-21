#!/usr/bin/env python3
"""Download the Glottolog 5.3 tabular metadata used by the game."""
from pathlib import Path
from urllib.request import Request, urlopen
import shutil

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
RAW.mkdir(parents=True, exist_ok=True)

FILES = {
    "glottolog_languoid.csv.zip": "https://cdstar.eva.mpg.de/bitstreams/EAEA0-608B-9919-A962-0/glottolog_languoid.csv.zip",
    "languages_and_dialects_geo.csv": "https://cdstar.eva.mpg.de/bitstreams/EAEA0-608B-9919-A962-0/languages_and_dialects_geo.csv",
}

for name, url in FILES.items():
    destination = RAW / name
    print(f"Downloading {name} ...")
    request = Request(url, headers={"User-Agent": "LanguageGameDataPipeline/0.1"})
    with urlopen(request, timeout=120) as response, destination.open("wb") as output:
        shutil.copyfileobj(response, output)
    print(f"  -> {destination} ({destination.stat().st_size:,} bytes)")

print("Done.")
