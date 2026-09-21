import { AudioClip, GeoAnchor, GeoHintType, Language } from '@/types';

export interface PipelineLanguageRecord {
  id: string;
  glottocode?: string | null;
  iso639_3?: string | null;
  iso_codes?: string[];
  name: string;
  native_name?: string | null;
  aliases?: string[];
  level?: 'language' | 'dialect';
  parent_id?: string | null;
  macroarea?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  geo_hint_type?: GeoHintType;
  geo_anchor?: { latitude: number; longitude: number; label?: string } | null;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | null;
  enabled?: boolean;
  source?: string;
  source_license?: string;
}

export interface PipelineAudioCandidate {
  id?: string;
  language_iso: string;
  commons_title: string;
  audio_url?: string | null;
  description_url?: string | null;
  source_url?: string | null;
  mime?: string | null;
  size_bytes?: number | null;
  duration_seconds?: number | string | null;
  spoken_text_filename_guess?: string | null;
  transcript_original?: string | null;
  translation_english?: string | null;
  sentence_license?: string | null;
  translation_license?: string | null;
  license?: string | null;
  creator?: string | null;
  attribution_url?: string | null;
  source?: string;
  review_status?: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  language_verified?: boolean;
  dialect_verified?: boolean;
  transcript_verified?: boolean;
  translation_verified?: boolean;
  direct_giveaway_checked?: boolean;
  approved_for_game?: boolean;
}

/** Maps normalized Glottolog/pipeline rows into the provider-neutral app model. */
export function languageFromPipeline(record: PipelineLanguageRecord): Language {
  const anchor: GeoAnchor = record.geo_anchor
    ? {
        latitude: record.geo_anchor.latitude,
        longitude: record.geo_anchor.longitude,
        continent: record.macroarea || 'Unknown',
        regionName: record.geo_anchor.label,
      }
    : {
        latitude: record.latitude || 0,
        longitude: record.longitude || 0,
        continent: record.macroarea || 'Unknown',
      };
  const hintType = record.geo_hint_type || (record.geo_anchor ? 'ORIGIN_POINT' : 'DISABLED');

  return {
    id: record.id,
    glottocode: record.glottocode || undefined,
    level: record.level,
    parentId: record.parent_id || undefined,
    name: record.name,
    nativeName: record.native_name || record.name,
    aliases: record.aliases || [],
    iso6393: record.iso639_3 || undefined,
    family: 'Unclassified',
    scripts: [],
    continents: record.macroarea ? [record.macroarea] : [],
    primaryRegions: record.geo_anchor?.label ? [record.geo_anchor.label] : [],
    countries: [],
    difficulty: record.difficulty || 'MEDIUM',
    geoHintType: hintType,
    geoAnchor: anchor,
    geography: {
      hintType,
      anchors: record.geo_anchor ? [anchor] : [],
    },
    clueProfile: {},
    sourceMetadata: {
      name: record.source || 'Glottolog',
      license: record.source_license || 'Unknown',
    },
    enabled: record.enabled ?? false,
  };
}

/**
 * Candidate rows are deliberately non-playable. Review/import code must attach
 * the real transcript and translation and explicitly approve every flag.
 */
export function audioCandidateFromPipeline(
  candidate: PipelineAudioCandidate,
  languageId: string
): AudioClip {
  return {
    id: candidate.id || `candidate:${candidate.commons_title}`,
    languageId,
    audioUrl: candidate.audio_url || '',
    durationSeconds: Number(candidate.duration_seconds) || 0,
    transcriptOriginal: candidate.transcript_original || candidate.spoken_text_filename_guess || '',
    translationEnglish: candidate.translation_english || '',
    transcriptLicense: candidate.sentence_license || undefined,
    translationLicense: candidate.translation_license || undefined,
    sourceName: candidate.source || 'Lingua Libre / Wikimedia Commons',
    sourceUrl: candidate.source_url || candidate.description_url || undefined,
    license: candidate.license || 'UNVERIFIED',
    creator: candidate.creator || undefined,
    attribution: candidate.creator || undefined,
    attributionUrl: candidate.attribution_url || undefined,
    mimeType: candidate.mime || undefined,
    sizeBytes: candidate.size_bytes || undefined,
    qualityStatus: 'PROVISIONAL',
    moderationStatus: 'PENDING',
    containsDirectGiveaway: false,
    verification: {
      languageVerified: candidate.language_verified ?? false,
      dialectVerified: candidate.dialect_verified ?? false,
      transcriptVerified: candidate.transcript_verified ?? false,
      translationVerified: candidate.translation_verified ?? false,
      directGiveawayChecked: candidate.direct_giveaway_checked ?? false,
      approvedForGame: candidate.approved_for_game ?? false,
      reviewStatus: candidate.review_status || 'PENDING',
    },
    enabled: false,
  };
}
