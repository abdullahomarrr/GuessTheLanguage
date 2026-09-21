import { AudioClip, Language } from '@/types';

/**
 * Central publication gate. Candidate ingestion must never imply playability.
 * Legacy development mocks are translated into the same decision so the game
 * remains usable while the detailed review flags are populated.
 */
export function isLanguagePlayable(language: Language): boolean {
  return language.enabled;
}

export function isAudioClipPlayable(clip: AudioClip): boolean {
  if (
    !clip.enabled ||
    clip.containsDirectGiveaway ||
    !clip.sourceName.trim() ||
    !clip.license.trim()
  ) return false;

  if (clip.previewOnly) {
    return process.env.NODE_ENV !== 'production';
  }

  if (clip.verification) {
    const verification = clip.verification;
    return (
      verification.reviewStatus === 'APPROVED' &&
      verification.approvedForGame &&
      verification.languageVerified &&
      verification.transcriptVerified &&
      verification.translationVerified &&
      verification.directGiveawayChecked
    );
  }

  // Compatibility path for the existing hand-curated mock catalog only.
  return clip.qualityStatus === 'VERIFIED' && clip.moderationStatus === 'APPROVED';
}
