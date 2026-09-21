import { AudioClip } from '@/types';
import { MOCK_AUDIO_CLIPS } from '@/data/mockAudioClips';
import { isAudioClipPlayable } from '@/services/catalogPolicy';

export interface IAudioRepository {
  getClip(id: string): Promise<AudioClip | null>;
  getClipForLanguage(languageId: string): Promise<AudioClip | null>;
  listClipsForLanguage(languageId: string): Promise<AudioClip[]>;
  listPlayableClipsForLanguage(languageId: string): Promise<AudioClip[]>;
}

export class MockAudioRepository implements IAudioRepository {
  private clips: Record<string, AudioClip>;

  constructor(initialData: Record<string, AudioClip> = MOCK_AUDIO_CLIPS) {
    this.clips = Object.fromEntries(
      Object.entries(initialData).map(([id, clip]) => [
        id,
        {
          ...clip,
          verification: clip.verification || {
            languageVerified: clip.qualityStatus === 'VERIFIED',
            dialectVerified: clip.qualityStatus === 'VERIFIED',
            transcriptVerified: clip.qualityStatus === 'VERIFIED',
            translationVerified: clip.qualityStatus === 'VERIFIED',
            directGiveawayChecked: clip.moderationStatus === 'APPROVED',
            approvedForGame: clip.moderationStatus === 'APPROVED',
            reviewStatus: clip.moderationStatus,
            notes: 'Compatibility review record for the curated development mock.',
          },
        },
      ])
    );
  }

  async getClip(id: string): Promise<AudioClip | null> {
    return this.clips[id] || null;
  }

  async getClipForLanguage(languageId: string): Promise<AudioClip | null> {
    const clip = Object.values(this.clips).find(
      (candidate) => candidate.languageId === languageId && isAudioClipPlayable(candidate)
    );
    return clip || null;
  }

  async listClipsForLanguage(languageId: string): Promise<AudioClip[]> {
    return Object.values(this.clips).filter((clip) => clip.languageId === languageId);
  }

  async listPlayableClipsForLanguage(languageId: string): Promise<AudioClip[]> {
    const clips = await this.listClipsForLanguage(languageId);
    return clips.filter(isAudioClipPlayable);
  }
}

export const audioRepository = new MockAudioRepository();
