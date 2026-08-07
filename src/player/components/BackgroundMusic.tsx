import React, { useEffect, useRef } from "react";
import { DEFAULT_MUSIC_VOLUME } from "../../lib/musicDefaults.ts";
import { useGame } from "../GameContext.ts";

/**
 * A persistent, looping <audio> element mounted once at the top of the player
 * tree. Autoplay policies require a user gesture, so playback only starts once
 * `phase` leaves "title" -- which only happens from the Begin/Resume button's
 * click handler, a real gesture. The existing sound toggle mutes this too,
 * since a player expects one switch for "make noise" rather than two.
 */
export const BackgroundMusic: React.FC = () => {
  const { state, ctx, preview } = useGame();
  const audioRef = useRef<HTMLAudioElement>(null);
  const musicUrl = ctx.quiz.config.musicUrl;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = ctx.quiz.config.musicVolume ?? DEFAULT_MUSIC_VOLUME;
  }, [ctx.quiz.config.musicVolume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !musicUrl) return;

    const shouldPlay = state.phase !== "title" && state.soundEnabled;
    if (shouldPlay) {
      // A second call while already playing is a harmless no-op; a rejected
      // promise means the browser still wants a gesture, which is fine to ignore.
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [musicUrl, state.phase, state.soundEnabled]);

  // The studio's live-preview iframe re-syncs on every keystroke; looping music
  // there would be a constant nuisance rather than a feature.
  if (preview || !musicUrl) return null;

  return <audio ref={audioRef} src={musicUrl} loop preload="none" />;
};
