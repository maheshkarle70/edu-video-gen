// src/remotion/components/Particles.jsx
import { useCurrentFrame } from 'remotion';
import { particlePositions } from '../utils/animations';

export const Particles = ({ color, count = 25, seed = 1 }) => {
  const frame = useCurrentFrame();
  const particles = particlePositions(count, seed);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p, i) => {
        const y = ((p.y - (frame * p.speed * 60) % 1920) + 1920) % 1920;
        const opacity = 0.15 + 0.25 * Math.sin((frame + p.delay) * 0.05);
        return (
          <div key={i} style={{
            position: 'absolute',
            left: p.x,
            top: y,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: color,
            opacity,
          }} />
        );
      })}
    </div>
  );
};
