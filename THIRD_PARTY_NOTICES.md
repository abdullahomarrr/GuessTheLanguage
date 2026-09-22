# Third-party notices

The MIT License in [`LICENSE`](LICENSE) applies to original project code and
documentation only. It does not replace the licenses attached to third-party
audio, geographic data, language data, fonts, icons, or software dependencies.

## Audio recordings

Audio files under `public/audio/` remain under their individual licenses. The
corresponding catalog records identify each recording's creator, source page,
attribution URL, local file, and license:

- [`src/data/sourcedAudioCatalog.json`](src/data/sourcedAudioCatalog.json)
- [`src/data/majorSourcedAudioCatalog.json`](src/data/majorSourcedAudioCatalog.json)
- [`docs/AUDIO_ATTRIBUTION.md`](docs/AUDIO_ATTRIBUTION.md)

Redistributors must retain those records and comply with the applicable terms:

- [Creative Commons Zero 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)
- [Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

Modifications to a recording should be identified. ShareAlike recordings and
adaptations remain subject to their CC BY-SA terms. Do not assume that the MIT
License applies to any recording.

Candidate metadata in `data-pipeline/data/audio_candidates/` may describe
files that are not shipped. Its recorded license information must be retained
if a candidate is later distributed.

## Data sources

- Glottolog data is provided under CC BY 4.0. See
  [`data-pipeline/SOURCES.md`](data-pipeline/SOURCES.md).
- Natural Earth country geometry is in the public domain.
- `world-atlas` and `world-countries` are installed dependencies and retain
  their own licenses and source notices.

## Software dependencies

Packages installed through npm retain their own licenses. Their names and
resolved versions are recorded in `package-lock.json` and
`admin/package-lock.json`. Those packages are not relicensed under this
project's MIT License.
