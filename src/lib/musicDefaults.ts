/**
 * The one track vendored into public/audio/ by tools/fetch-music.ts. Shared by
 * the player (fallback volume) and the editor (the "Use default track" button),
 * so both sides agree on the same file and credit line.
 */
export const DEFAULT_MUSIC_URL = "/audio/apprehension.mp3";
export const DEFAULT_MUSIC_VOLUME = 0.35;
export const DEFAULT_MUSIC_ATTRIBUTION =
  '"Apprehension" by Kevin MacLeod (incompetech.com), licensed under CC BY 3.0 (creativecommons.org/licenses/by/3.0)';
