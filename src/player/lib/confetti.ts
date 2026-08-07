import confetti from "canvas-confetti";

/**
 * Checks if the user prefers reduced motion.
 */
function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Fires a grand victory confetti celebration with multi-stage bursts.
 */
export function fireVictoryConfetti(): void {
  if (prefersReducedMotion()) return;

  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });

  fire(0.2, {
    spread: 60,
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });

  // Secondary burst after a short delay for dramatic effect
  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      zIndex: 9999,
    });
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      zIndex: 9999,
    });
  }, 400);
}

/**
 * Fires a focused confetti burst when cracking a room code or final override.
 */
export function fireCodeSolvedConfetti(): void {
  if (prefersReducedMotion()) return;

  confetti({
    particleCount: 70,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6"],
    zIndex: 9999,
  });
}

/**
 * Fires a mini celebration burst for solving an individual puzzle.
 */
export function firePuzzleSolvedConfetti(): void {
  if (prefersReducedMotion()) return;

  confetti({
    particleCount: 35,
    spread: 50,
    startVelocity: 30,
    origin: { y: 0.7 },
    colors: ["#10b981", "#3b82f6", "#6366f1"],
    zIndex: 9999,
  });
}
