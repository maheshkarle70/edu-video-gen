// Demo scene — media-first: screenshot, recording, or HTML mockup visible on frame 0
// Intentionally no media.caption / scene.body under the frame (those are production briefs)
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { Particles } from '../components/Particles';
import { DemoMedia } from '../components/DemoMedia';

export const DemoScene = ({ scene, accentColor, topic }) => {
  const { height: compH } = useVideoConfig();
  const media = scene.media || {};
  const src = media.file || media.url || media.htmlContent;

  const chapter = scene.chapter || null;
  const total = scene.chapterTotal || chapter;
  // Maximize media — ~82% of frame (no brief text under chrome)
  const mediaMaxH = Math.round(compH * 0.82);

  return (
    <AbsoluteFill style={{
      background: scene.bgColor || '#060810',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <Particles color={accentColor} count={8} seed={(scene.id || 1) * 23} />

      <AbsoluteFill style={{
        padding: '28px 28px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {src && (
          <div style={{
            width: '100%',
            maxWidth: 1760,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}>
            <div style={{
              width: '100%',
              flex: 1,
              minHeight: 0,
              borderRadius: 14,
              overflow: 'hidden',
              border: `2px solid ${accentColor}66`,
              boxShadow: `0 18px 60px rgba(0,0,0,0.5)`,
              background: '#0c0e14',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{
                flexShrink: 0,
                background: `${accentColor}28`,
                padding: '6px 14px',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff5f57' }} />
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#febc2e' }} />
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#28c840' }} />
                <span style={{
                  fontSize: 15,
                  color: 'rgba(255,255,255,0.75)',
                  fontFamily: 'monospace',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {topic || scene.title}
                </span>
                {chapter && (
                  <span style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: accentColor,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}>
                    Part {chapter}{total ? ` / ${total}` : ''}
                  </span>
                )}
                <span style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#fff',
                  opacity: 0.95,
                  flex: '1 1 100%',
                  letterSpacing: '-0.01em',
                }}>
                  {scene.emoji ? `${scene.emoji} ` : ''}{scene.title}
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                <DemoMedia media={media} maxHeight={mediaMaxH - 48} />
              </div>
            </div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
