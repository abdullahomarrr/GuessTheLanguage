import { AudioClip } from '@/types';
import sourcedCatalog from '@/data/sourcedAudioCatalog.json';
import majorSourcedCatalog from '@/data/majorSourcedAudioCatalog.json';

/**
 * Provider-neutral runtime adapter for the reviewed acquisition manifest.
 * The JSON remains the auditable boundary between the offline pipeline and UI.
 */
export const SOURCED_AUDIO_CLIPS = Object.fromEntries(
  [...sourcedCatalog, ...majorSourcedCatalog].map((record) => [
    record.clipId,
    {
      id: record.clipId,
      languageId: record.languageId,
      audioUrl: record.audioUrl,
      durationSeconds: record.durationSeconds,
      transcriptOriginal: record.transcriptOriginal,
      translationEnglish: record.translationEnglish,
      transcriptLicense: record.transcriptLicense,
      translationLicense: record.translationLicense,
      speakerLabel: record.creator ? `Human contributor: ${record.creator}` : 'Human contributor',
      speakerRegion: 'Not supplied by source',
      sourceName: record.sourceName,
      sourceUrl: record.sourceUrl,
      license: record.license,
      creator: record.creator,
      attribution: record.attribution,
      attributionUrl: record.attributionUrl,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      qualityStatus: record.qualityStatus,
      moderationStatus: record.moderationStatus,
      containsDirectGiveaway: record.containsDirectGiveaway,
      verification: record.verification,
      previewOnly: record.previewOnly,
      enabled: record.enabled,
    },
  ])
) as Record<string, AudioClip>;
