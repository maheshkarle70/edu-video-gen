// Animated explainer diagrams with intro reveal + continuous loop motion
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { fadeIn } from '../utils/animations';

function stepDelay(i, fps) {
  return Math.round(fps * 0.55) + i * Math.round(fps * 0.45);
}

function introEndFrame(n, fps) {
  return stepDelay(Math.max(0, n - 1), fps) + Math.round(fps * 0.7);
}

function drawProgress(frame, start, duration) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

const Node = ({ x, y, label, frame, delay, fps, accentColor, w = 200, h = 72, active = false, inLoop = false }) => {
  const scale = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 180, mass: 0.6 } });
  const op = fadeIn(frame, delay, delay + 12);
  const pulse = inLoop && active ? 1 + 0.06 * Math.sin(frame * 0.2) : 1;
  const strokeW = active ? 3.5 : 2.5;
  const fill = active ? `${accentColor}30` : 'rgba(255,255,255,0.08)';

  return (
    <g opacity={op} transform={`translate(${x}, ${y}) scale(${scale * pulse})`}>
      {active && (
        <rect
          x={-w / 2 - 6} y={-h / 2 - 6} width={w + 12} height={h + 12} rx={18}
          fill="none" stroke={accentColor} strokeWidth={2} opacity={0.45}
        />
      )}
      <rect
        x={-w / 2} y={-h / 2} width={w} height={h} rx={14}
        fill={fill} stroke={accentColor} strokeWidth={strokeW}
      />
      <text
        x={0} y={0} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={22} fontWeight={700}
        fontFamily="system-ui, sans-serif"
      >
        {label.length > 22 ? `${label.slice(0, 21)}…` : label}
      </text>
    </g>
  );
};

const Arrow = ({ x1, y1, x2, y2, frame, delay, accentColor, marching = false, loopFrame = 0, markerId }) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const prog = drawProgress(frame, delay, 18);
  const dash = marching ? 0 : len * (1 - prog);
  const marchOffset = marching ? -(loopFrame * 1.8) % 24 : 0;

  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={accentColor} strokeWidth={marching ? 3.5 : 3} strokeLinecap="round"
      strokeDasharray={marching ? '10 8' : len}
      strokeDashoffset={marching ? marchOffset : dash}
      opacity={marching ? 1 : 0.85}
      markerEnd={markerId ? `url(#${markerId})` : undefined}
    />
  );
};

const FlowDot = ({ x1, y1, x2, y2, t }) => {
  const px = x1 + (x2 - x1) * t;
  const py = y1 + (y2 - y1) * t;
  return <circle cx={px} cy={py} r={8} fill="#fff" opacity={0.95} />;
};

const ProcessVisual = ({ steps, frame, fps, accentColor, markerId }) => {
  const n = Math.min(steps.length, 4);
  const cx = 480;
  const startX = cx - ((n - 1) * 220) / 2;
  const y = 120;
  const introEnd = introEndFrame(n, fps);
  const inLoop = frame >= introEnd;
  const loopFrame = inLoop ? frame - introEnd : 0;
  const cycleLen = fps * 2.8;
  const flowT = inLoop ? (loopFrame % cycleLen) / cycleLen : 0;
  const activeIdx = inLoop ? Math.min(n - 1, Math.floor(flowT * n)) : -1;
  const segT = inLoop ? (flowT * n) % 1 : 0;
  const segIdx = inLoop ? Math.min(n - 2, Math.floor(flowT * n)) : 0;

  return (
    <g>
      {steps.slice(0, n - 1).map((_, i) => (
        <Arrow
          key={`a${i}`}
          x1={startX + i * 220 + 100}
          y1={y}
          x2={startX + (i + 1) * 220 - 100}
          y2={y}
          frame={frame}
          delay={stepDelay(i, fps) + 14}
          accentColor={accentColor}
          marching={inLoop}
          loopFrame={loopFrame}
          markerId={markerId}
        />
      ))}
      {steps.slice(0, n).map((label, i) => (
        <Node
          key={i}
          x={startX + i * 220}
          y={y}
          label={label}
          frame={frame}
          delay={stepDelay(i, fps)}
          fps={fps}
          accentColor={accentColor}
          w={190}
          active={activeIdx === i}
          inLoop={inLoop}
        />
      ))}
      {inLoop && n > 1 && (
        <FlowDot
          x1={startX + segIdx * 220 + 100}
          y1={y}
          x2={startX + (segIdx + 1) * 220 - 100}
          y2={y}
          t={segT}
        />
      )}
    </g>
  );
};

const CycleVisual = ({ steps, frame, fps, accentColor, markerId }) => {
  const n = Math.min(steps.length, 4);
  const cx = 480;
  const cy = 155;
  const r = n >= 4 ? 108 : 118;
  const nodeW = n >= 4 ? 148 : 170;
  const nodeH = 60;
  const edgeOffset = nodeW / 2 + 14;
  const angles = Array.from({ length: n }, (_, i) => (i / n) * Math.PI * 2 - Math.PI / 2);
  const pts = angles.map((a) => ({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }));
  const introEnd = introEndFrame(n, fps);
  const inLoop = frame >= introEnd;
  const loopFrame = inLoop ? frame - introEnd : 0;
  const cycleLen = fps * 3;
  const flowT = inLoop ? (loopFrame % cycleLen) / cycleLen : 0;
  const activeIdx = inLoop ? Math.floor(flowT * n) % n : -1;
  const angle = flowT * Math.PI * 2 - Math.PI / 2;
  const dotX = cx + Math.cos(angle) * r;
  const dotY = cy + Math.sin(angle) * r;

  return (
    <g>
      {pts.map((p, i) => {
        const next = pts[(i + 1) % n];
        const a0 = angles[i];
        const a1 = angles[(i + 1) % n];
        return (
          <Arrow
            key={`ca${i}`}
            x1={p.x + Math.cos(a0) * edgeOffset}
            y1={p.y + Math.sin(a0) * edgeOffset}
            x2={next.x - Math.cos(a1) * edgeOffset}
            y2={next.y - Math.sin(a1) * edgeOffset}
            frame={frame}
            delay={stepDelay(i, fps) + 16}
            accentColor={accentColor}
            marching={inLoop}
            loopFrame={loopFrame}
            markerId={markerId}
          />
        );
      })}
      {pts.map((p, i) => (
        <Node
          key={i}
          x={p.x}
          y={p.y}
          label={steps[i]}
          frame={frame}
          delay={stepDelay(i, fps)}
          fps={fps}
          accentColor={accentColor}
          w={nodeW}
          h={nodeH}
          active={activeIdx === i}
          inLoop={inLoop}
        />
      ))}
      {inLoop && <circle cx={dotX} cy={dotY} r={9} fill="#fff" opacity={0.95} />}
    </g>
  );
};

const CompareVisual = ({ steps, frame, fps, accentColor, markerId }) => {
  const left = steps[0] || 'Before';
  const right = steps[1] || 'After';
  const d0 = stepDelay(0, fps);
  const d1 = stepDelay(1, fps);
  const vsScale = spring({ frame: frame - d1, fps, config: { damping: 10, stiffness: 200 } });
  const introEnd = d1 + Math.round(fps * 0.8);
  const inLoop = frame >= introEnd;
  const loopFrame = inLoop ? frame - introEnd : 0;
  const leftActive = inLoop && Math.floor(loopFrame / (fps * 1.2)) % 2 === 0;
  const boxW = 240;
  const boxH = 80;
  const y = 115;
  const leftX = 300;
  const rightX = 660;
  const arrowY = y + boxH / 2 + 28;

  return (
    <g>
      {inLoop && (
        <Arrow
          x1={leftX + boxW / 2 + 8}
          y1={arrowY}
          x2={rightX - boxW / 2 - 8}
          y2={arrowY}
          frame={frame}
          delay={0}
          accentColor={accentColor}
          marching
          loopFrame={loopFrame}
          markerId={markerId}
        />
      )}
      <Node x={leftX} y={y} label={left} frame={frame} delay={d0} fps={fps} accentColor={accentColor} w={boxW} h={boxH} active={leftActive} inLoop={inLoop} />
      <Node x={rightX} y={y} label={right} frame={frame} delay={d1} fps={fps} accentColor={accentColor} w={boxW} h={boxH} active={inLoop && !leftActive} inLoop={inLoop} />
      <g opacity={fadeIn(frame, d1, d1 + 15)} transform={`translate(480, ${y}) scale(${inLoop ? 1 + 0.08 * Math.sin(loopFrame * 0.15) : vsScale})`}>
        <circle r={36} fill={accentColor} />
        <text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={22} fontWeight={900} fontFamily="system-ui">VS</text>
      </g>
    </g>
  );
};

const TimelineVisual = ({ steps, frame, fps, accentColor }) => {
  const n = Math.min(steps.length, 4);
  const startX = 480 - ((n - 1) * 180) / 2;
  const y = 100;
  const lineOp = fadeIn(frame, 8, 24);
  const introEnd = introEndFrame(n, fps);
  const inLoop = frame >= introEnd;
  const loopFrame = inLoop ? frame - introEnd : 0;
  const cycleLen = fps * 2.5;
  const flowT = inLoop ? (loopFrame % cycleLen) / cycleLen : 0;
  const activeIdx = inLoop ? Math.min(n - 1, Math.floor(flowT * n)) : -1;
  const sweepX = startX + flowT * (n - 1) * 180;

  return (
    <g>
      <line x1={startX - 40} y1={y + 40} x2={startX + (n - 1) * 180 + 40} y2={y + 40}
        stroke="rgba(255,255,255,0.2)" strokeWidth={4} strokeLinecap="round" opacity={lineOp} />
      {inLoop && (
        <line x1={startX - 40} y1={y + 40} x2={sweepX} y2={y + 40}
          stroke={accentColor} strokeWidth={4} strokeLinecap="round" opacity={0.7} />
      )}
      {steps.slice(0, n).map((label, i) => {
        const x = startX + i * 180;
        const delay = stepDelay(i, fps);
        const dotScale = spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 200 } });
        const op = fadeIn(frame, delay, delay + 12);
        const active = activeIdx === i;
        return (
          <g key={i} opacity={op}>
            <circle cx={x} cy={y + 40} r={(active ? 18 : 14) * dotScale} fill={active ? accentColor : accentColor} opacity={active ? 1 : 0.7} />
            {active && <circle cx={x} cy={y + 40} r={26} fill="none" stroke={accentColor} strokeWidth={2} opacity={0.5} />}
            <text x={x} y={y + 100} textAnchor="middle" fill={active ? '#fff' : 'rgba(255,255,255,0.75)'}
              fontSize={20} fontWeight={active ? 700 : 600} fontFamily="system-ui">
              {label.length > 18 ? `${label.slice(0, 17)}…` : label}
            </text>
          </g>
        );
      })}
      {inLoop && <circle cx={sweepX} cy={y + 40} r={7} fill="#fff" />}
    </g>
  );
};

const LayersVisual = ({ steps, frame, fps, accentColor }) => {
  const n = Math.min(steps.length, 4);
  const cx = 480;
  const baseY = 60;
  const introEnd = introEndFrame(n, fps);
  const inLoop = frame >= introEnd;
  const loopFrame = inLoop ? frame - introEnd : 0;
  const activeIdx = inLoop ? Math.floor((loopFrame / (fps * 0.7)) % n) : -1;

  return (
    <g>
      {steps.slice(0, n).map((label, i) => {
        const delay = stepDelay(i, fps);
        const slideX = interpolate(frame, [delay, delay + 22], [-120, 0], {
          extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
        });
        const op = fadeIn(frame, delay, delay + 14);
        const w = 520 - i * 30;
        const y = baseY + i * 58;
        const active = activeIdx === i;
        const bob = active ? 4 * Math.sin(loopFrame * 0.18) : 0;
        return (
          <g key={i} opacity={op} transform={`translate(${slideX}, ${bob})`}>
            <rect x={cx - w / 2} y={y} width={w} height={48} rx={10}
              fill={`${accentColor}${active ? '88' : ['33', '44', '55', '66'][i] || '44'}`}
              stroke={accentColor} strokeWidth={active ? 3 : 2} />
            <text x={cx} y={y + 32} textAnchor="middle" fill="#fff" fontSize={21} fontWeight={700} fontFamily="system-ui">
              {label.length > 28 ? `${label.slice(0, 27)}…` : label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

export function normalizeVisual(scene) {
  if (scene?.visual?.steps?.length >= 2) {
    return {
      type: scene.visual.type || 'process',
      steps: scene.visual.steps.slice(0, 4),
      caption: scene.visual.caption || '',
    };
  }
  const steps = (scene?.body || '')
    .split(/\.\s+/)
    .map((s) => s.replace(/\.$/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
  if (steps.length >= 2) return { type: 'process', steps, caption: '' };
  return null;
}

export const ExplainerVisual = ({ visual, accentColor, startFrame = 12 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);

  if (!visual?.steps?.length) return null;

  const containerOp = fadeIn(f, 0, 15);
  const type = visual.type || 'process';
  const markerId = `arrowhead-${accentColor.replace('#', '')}`;
  const viewH = type === 'cycle' ? 290 : 220;

  const render = () => {
    switch (type) {
      case 'cycle': return <CycleVisual steps={visual.steps} frame={f} fps={fps} accentColor={accentColor} markerId={markerId} />;
      case 'compare': return <CompareVisual steps={visual.steps} frame={f} fps={fps} accentColor={accentColor} markerId={markerId} />;
      case 'timeline': return <TimelineVisual steps={visual.steps} frame={f} fps={fps} accentColor={accentColor} />;
      case 'layers': return <LayersVisual steps={visual.steps} frame={f} fps={fps} accentColor={accentColor} />;
      default: return <ProcessVisual steps={visual.steps} frame={f} fps={fps} accentColor={accentColor} markerId={markerId} />;
    }
  };

  return (
    <div style={{ width: '100%', opacity: containerOp, marginBottom: 20 }}>
      <svg viewBox={`0 0 960 ${viewH}`} width="100%" height="auto" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <marker id={markerId} markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
            <polygon points="0 0, 10 4, 0 8" fill={accentColor} />
          </marker>
        </defs>
        <g>
          {render()}
        </g>
      </svg>
      {visual.caption && (
        <div style={{
          textAlign: 'center',
          fontSize: 22,
          color: 'rgba(255,255,255,0.55)',
          fontWeight: 600,
          marginTop: 4,
          fontFamily: 'system-ui',
        }}>
          {visual.caption}
        </div>
      )}
    </div>
  );
};
