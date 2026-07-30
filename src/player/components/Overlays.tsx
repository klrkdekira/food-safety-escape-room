import React from "react";

/**
 * The one decorative layer: a static radial wash that gives the page a light
 * source. Player-only, so it mounts with the game rather than sitting in the
 * page shell where the author studio would inherit it.
 *
 * This used to render CRT scanlines and a flicker animation on top of a pulsing
 * glow, a drifting particle canvas and a grid on `body`. Five simultaneous
 * effects competed with the content and dated the whole design; one is enough.
 */
export const Overlays: React.FC = () => <div className="ambient-glow" aria-hidden="true" />;
