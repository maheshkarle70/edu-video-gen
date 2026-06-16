// src/remotion/utils/animations.js
// Reusable animation helpers for consistent motion across scenes

import { interpolate, spring, Easing, useCurrentFrame, useVideoConfig } from 'remotion';

// Fade in from opacity 0 → 1 between startFrame and endFrame
export const fadeIn = (frame, startFrame = 0, endFrame = 20) =>
  interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.ease),
  });

// Fade out from opacity 1 → 0
export const fadeOut = (frame, startFrame, endFrame) =>
  interpolate(frame, [startFrame, endFrame], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.ease),
  });

// Slide up from translateY(offset) → 0
export const slideUp = (frame, startFrame = 0, offset = 60, durationFrames = 25) =>
  interpolate(frame, [startFrame, startFrame + durationFrames], [offset, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

// Slide in from left
export const slideInLeft = (frame, startFrame = 0, offset = -80, durationFrames = 25) =>
  interpolate(frame, [startFrame, startFrame + durationFrames], [offset, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

// Spring scale from 0.85 → 1
export const springScale = (frame, fps, delay = 0) =>
  spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });

// Scale pulse — used for emphasis keywords
export const scalePulse = (frame, startFrame, fps) => {
  const s = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 10, stiffness: 200, mass: 0.6 },
  });
  return interpolate(s, [0, 1], [0.7, 1]);
};

// Character-by-character reveal (typewriter) — returns visible chars count
export const typewriterChars = (frame, startFrame, text, charsPerSecond = 30, fps = 30) => {
  const elapsed = Math.max(0, frame - startFrame);
  const charsPerFrame = charsPerSecond / fps;
  return Math.floor(elapsed * charsPerFrame);
};

// Particle positions (deterministic from seed)
export const particlePositions = (count, seed = 42) => {
  const positions = [];
  for (let i = 0; i < count; i++) {
    const t = (i * 2654435761 + seed) >>> 0;
    positions.push({
      x: ((t * 1234567) % 1080),
      y: ((t * 7654321) % 1920),
      size: 2 + (t % 4),
      speed: 0.2 + (t % 10) * 0.05,
      delay: (t % 60),
    });
  }
  return positions;
};
