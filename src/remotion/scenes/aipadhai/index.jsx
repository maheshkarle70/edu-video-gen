// src/remotion/scenes/aipadhai/index.jsx — AI Padhai scene pack
// Six branded scene types matching the CCA-F episode deck design system.
// Each receives the standard scene contract: { scene, sceneDuration } with
// frame 0 = start of its <Sequence>.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AIP, badgeStyle } from '../../theme/aipadhai.js';

// ---------- shared helpers ----------
const useEnter = (delayFrames = 0, durFrames = 14) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [delayFrames, delayFrames + durFrames], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  return { opacity: t, transform: `translateY(${(1 - t) * 26}px)` };
};

const Badge = () => <div style={badgeStyle}>AI Padhai</div>;

const Eyebrow = ({ children, delay = 0 }) => {
  const s = useEnter(delay);
  return (
    <div style={{ ...s, color: AIP.orange, fontWeight: 700, fontSize: 30,
      letterSpacing: 8, fontFamily: AIP.font }}>
      {children}
    </div>
  );
};

// ---------- 1. TitleScene (dark) ----------
// scene: { eyebrow, title, subtitle, chips: [{big, small}] }
export const TitleScene = ({ scene }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const h = useEnter(Math.round(fps * 0.3));
  const sub = useEnter(Math.round(fps * 0.9));
  return (
    <AbsoluteFill style={{ background: AIP.bgDark, fontFamily: AIP.font, padding: '90px 110px' }}>
      <Badge />
      <Eyebrow delay={Math.round(fps * 0.1)}>{scene.eyebrow}</Eyebrow>
      <div style={{ ...h, color: '#fff', fontWeight: 800, fontSize: 108, marginTop: 60, lineHeight: 1.05 }}>
        {scene.title}
      </div>
      <div style={{ ...sub, color: AIP.subtle, fontSize: 46, marginTop: 34 }}>
        {scene.subtitle}
      </div>
      <div style={{ display: 'flex', gap: 40, position: 'absolute', bottom: 110, left: 110, right: 110 }}>
        {(scene.chips || []).map((c, i) => {
          const d = Math.round(fps * (1.5 + i * 0.35));
          const pop = spring({ frame: frame - d, fps, config: { damping: 14 } });
          return (
            <div key={i} style={{
              flex: 1, background: AIP.chipBg, border: `2px solid ${AIP.chipBorder}`,
              borderRadius: 22, padding: '30px 36px',
              opacity: frame < d ? 0 : 1,
              transform: `scale(${0.9 + pop * 0.1})`,
            }}>
              <div style={{ color: AIP.orange, fontWeight: 800, fontSize: 48 }}>{c.big}</div>
              <div style={{ color: '#AEB6C4', fontSize: 26, marginTop: 10 }}>{c.small}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- 2. IconRowScene (light) ----------
// scene: { title, rows: [{emoji, heading, sub, color}] }
export const IconRowScene = ({ scene }) => {
  const { fps } = useVideoConfig();
  const h = useEnter(4);
  const rows = scene.rows || [];
  return (
    <AbsoluteFill style={{ background: AIP.bgLight, fontFamily: AIP.font, padding: '80px 110px' }}>
      <div style={{ ...h, color: AIP.ink, fontWeight: 800, fontSize: 74 }}>{scene.title}</div>
      <div style={{ marginTop: 60, display: 'flex', flexDirection: 'column', gap: 44 }}>
        {rows.map((r, i) => {
          const s = useEnter(Math.round(fps * (0.7 + i * 0.55)));
          return (
            <div key={i} style={{ ...s, display: 'flex', alignItems: 'center', gap: 40 }}>
              <div style={{
                width: 96, height: 96, borderRadius: '50%', background: r.color || AIP.orange,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 46, flexShrink: 0,
              }}>{r.emoji}</div>
              <div>
                <div style={{ color: AIP.ink, fontWeight: 700, fontSize: 40 }}>{r.heading}</div>
                <div style={{ color: AIP.muted, fontSize: 30, marginTop: 6 }}>{r.sub}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- 3. BarChartScene (light) ----------
// scene: { title, bars: [{label, value, color}], callout: {big, text} }
export const BarChartScene = ({ scene }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const h = useEnter(4);
  const bars = scene.bars || [];
  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const co = useEnter(Math.round(fps * (1 + bars.length * 0.5)));
  return (
    <AbsoluteFill style={{ background: AIP.bgLight, fontFamily: AIP.font, padding: '80px 110px' }}>
      <div style={{ ...h, color: AIP.ink, fontWeight: 800, fontSize: 74 }}>{scene.title}</div>
      <div style={{ display: 'flex', marginTop: 70, gap: 60 }}>
        <div style={{ flex: 1.9, display: 'flex', flexDirection: 'column', gap: 40 }}>
          {bars.map((b, i) => {
            const d = Math.round(fps * (0.8 + i * 0.45));
            const grow = spring({ frame: frame - d, fps, config: { damping: 16 }, durationInFrames: Math.round(fps * 0.9) });
            const shown = Math.round(b.value * Math.min(grow, 1));
            return (
              <div key={i} style={{ opacity: frame < d ? 0 : 1 }}>
                <div style={{ color: '#334155', fontSize: 27, marginBottom: 10 }}>{b.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{
                    height: 44, borderRadius: 10, background: b.color || AIP.orange,
                    width: `${(b.value / maxVal) * 78 * grow}%`,
                  }} />
                  <div style={{ color: AIP.ink, fontWeight: 800, fontSize: 32 }}>{shown}%</div>
                </div>
              </div>
            );
          })}
        </div>
        {scene.callout && (
          <div style={{ ...co, flex: 0.8, background: AIP.orangeTint, borderRadius: 24, padding: 44, alignSelf: 'flex-start' }}>
            <div style={{ color: AIP.orange, fontWeight: 800, fontSize: 86 }}>{scene.callout.big}</div>
            <div style={{ color: AIP.ink, fontWeight: 700, fontSize: 32, marginTop: 18, lineHeight: 1.35 }}>
              {scene.callout.text}
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ---------- 4. ComparisonScene (light) ----------
// scene: { title, left: {heading, color, tint, items[]}, right: {...}, footer }
const Panel = ({ side, baseDelay }) => {
  const { fps } = useVideoConfig();
  const s = useEnter(baseDelay);
  return (
    <div style={{ ...s, flex: 1, background: side.tint, borderRadius: 26, padding: '44px 48px' }}>
      <div style={{ color: side.color, fontWeight: 800, fontSize: 42 }}>{side.heading}</div>
      <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {(side.items || []).map((it, i) => {
          const b = useEnter(baseDelay + Math.round(fps * (0.5 + i * 0.6)));
          return (
            <div key={i} style={{ ...b, color: AIP.ink, fontSize: 29, lineHeight: 1.4 }}>
              •  {it}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ComparisonScene = ({ scene }) => {
  const { fps } = useVideoConfig();
  const h = useEnter(4);
  const f = useEnter(Math.round(fps * 4));
  return (
    <AbsoluteFill style={{ background: AIP.bgLight, fontFamily: AIP.font, padding: '80px 110px' }}>
      <div style={{ ...h, color: AIP.ink, fontWeight: 800, fontSize: 74 }}>{scene.title}</div>
      <div style={{ display: 'flex', gap: 50, marginTop: 60 }}>
        <Panel side={{ tint: AIP.greenTint, color: AIP.green, ...scene.left }} baseDelay={Math.round(fps * 0.6)} />
        <Panel side={{ tint: AIP.redTint, color: AIP.red, ...scene.right }} baseDelay={Math.round(fps * 0.9)} />
      </div>
      {scene.footer && (
        <div style={{ ...f, position: 'absolute', bottom: 70, left: 110, right: 110,
          textAlign: 'center', color: AIP.orange, fontWeight: 700, fontSize: 30, fontStyle: 'italic' }}>
          {scene.footer}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------- 5. CodeScene (light w/ dark card, typewriter) ----------
// scene: { title, lines: [{text, color?}], notes: [{label, sub, color}], footer }
export const CodeScene = ({ scene, sceneDuration }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const h = useEnter(4);
  const lines = scene.lines || [];
  const totalChars = lines.reduce((a, l) => a + l.text.length + 1, 0);
  // Type out over ~55% of the scene, capped at a readable pace
  const typeFrames = Math.min(Math.round((sceneDuration || fps * 10) * 0.55), totalChars * 2);
  const charsShown = Math.floor(interpolate(frame, [Math.round(fps * 0.5), Math.round(fps * 0.5) + typeFrames],
    [0, totalChars], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

  let budget = charsShown;
  const rendered = lines.map((l) => {
    const take = Math.max(0, Math.min(l.text.length, budget));
    budget -= take + 1;
    return { ...l, shown: l.text.slice(0, take) };
  });

  return (
    <AbsoluteFill style={{ background: AIP.bgLight, fontFamily: AIP.font, padding: '80px 110px' }}>
      <div style={{ ...h, color: AIP.ink, fontWeight: 800, fontSize: 74 }}>{scene.title}</div>
      <div style={{ display: 'flex', gap: 60, marginTop: 55 }}>
        <div style={{
          flex: 1.35, background: AIP.codeBg, borderRadius: 24, padding: '44px 48px',
          fontFamily: AIP.mono, fontSize: 30, lineHeight: 1.75, minHeight: 620,
        }}>
          {rendered.map((l, i) => (
            <div key={i} style={{ color: l.color || AIP.codeText, whiteSpace: 'pre' }}>
              {l.shown}
              {l.shown.length < l.text.length && l.shown.length > 0 && (
                <span style={{ opacity: frame % fps < fps / 2 ? 1 : 0 }}>▌</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ flex: 0.85, display: 'flex', flexDirection: 'column', gap: 40, paddingTop: 10 }}>
          {(scene.notes || []).map((n, i) => {
            const s = useEnter(Math.round(fps * (1.4 + i * 0.8)));
            return (
              <div key={i} style={s}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: n.color || AIP.orange }} />
                  <div style={{ fontFamily: AIP.mono, fontWeight: 700, fontSize: 32, color: AIP.ink }}>{n.label}</div>
                </div>
                <div style={{ color: AIP.muted, fontSize: 26, marginTop: 8, marginLeft: 36 }}>{n.sub}</div>
              </div>
            );
          })}
        </div>
      </div>
      {scene.footer && (
        <div style={{ position: 'absolute', bottom: 60, left: 110, color: AIP.muted, fontSize: 26, fontStyle: 'italic' }}>
          {scene.footer}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------- 6. OutroScene (dark) ----------
// scene: { teaserLabel, teaser, cta, footer }
export const OutroScene = ({ scene }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const l = useEnter(Math.round(fps * 0.2));
  const t = useEnter(Math.round(fps * 0.7));
  const c = Math.round(fps * 1.6);
  const pulse = 1 + 0.03 * Math.sin((frame / fps) * 4);
  return (
    <AbsoluteFill style={{ background: AIP.bgDark, fontFamily: AIP.font, padding: '110px 110px' }}>
      <div style={{ ...l, color: AIP.orange, fontWeight: 700, fontSize: 40 }}>{scene.teaserLabel || 'अगले episode में'}</div>
      <div style={{ ...t, color: '#fff', fontWeight: 800, fontSize: 66, marginTop: 36, lineHeight: 1.25, maxWidth: 1500 }}>
        {scene.teaser}
      </div>
      <div style={{
        position: 'absolute', bottom: 210, left: 110,
        background: AIP.orange, borderRadius: 22, padding: '26px 54px',
        color: '#fff', fontWeight: 800, fontSize: 34,
        opacity: frame < c ? 0 : 1,
        transform: `scale(${frame < c ? 0.9 : pulse})`,
      }}>
        ▶  {scene.cta || 'Subscribe करें — AI Padhai'}
      </div>
      <div style={{ position: 'absolute', bottom: 110, left: 110, color: AIP.faint, fontSize: 26 }}>
        {scene.footer || 'नया video हर हफ़्ते  •  Hindi + English mix  •  100% practical'}
      </div>
    </AbsoluteFill>
  );
};
