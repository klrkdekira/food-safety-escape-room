/**
 * Two short synthesised blips via the Web Audio API -- a rising tone for a
 * correct answer, a lower one for a wrong answer. No audio files, so nothing to
 * fetch and nothing to add to the CSP.
 */

type WindowWithLegacyAudio = Window & { webkitAudioContext?: typeof AudioContext };

export function playSound(type: "correct" | "incorrect"): void {
  try {
    const w = window as WindowWithLegacyAudio;
    const AudioCtx = window.AudioContext ?? w.webkitAudioContext;
    if (!AudioCtx) return;

    const ac = new AudioCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    const durationSec = type === "correct" ? 0.2 : 0.3;
    osc.frequency.value = type === "correct" ? 880 : 220;
    gain.gain.setValueAtTime(0.1, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + durationSec);
    osc.start();
    osc.stop(ac.currentTime + durationSec);
  } catch {
    // Autoplay policy or no audio device; silence is an acceptable outcome.
  }
}
