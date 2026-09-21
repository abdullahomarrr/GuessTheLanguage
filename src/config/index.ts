export const BRAND_CONFIG = {
  name: 'Lingo',
  tagline: 'Where is this speaker from?',
  description: 'A daily audio geography game. Listen to a mystery voice and identify the country it represents.',
  version: '0.1.0-mvp',
  creator: 'The Lingo Team',
};

export const GAME_RULES = {
  maxGuesses: 5,
  aiQuestionUnlockAfterGuess: 2, // Unlocks after 2 incorrect guesses
  maxQuestionsPerGame: 1,
  proximityHintStartsAtGuess: 3, // Guess 3 and 4 show HOT / WARM / COLD
  // Geographic distance thresholds in kilometers:
  proximityThresholds: {
    hotKm: 1200,   // Relatively nearby
    warmKm: 3500,  // Moderately nearby
    // Cold is anything greater than warmKm
  },
};

export const STORAGE_KEYS = {
  gameStatePrefix: 'lingo_game_state_v5_',
  playerStats: 'lingo_player_stats_v1',
  settings: 'lingo_player_settings_v1',
  audioReviewPrefix: 'lingo_audio_review_v1_',
  appFeedback: 'lingo_app_feedback_v1',
};
