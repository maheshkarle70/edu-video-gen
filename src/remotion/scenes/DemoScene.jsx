// Demo scene — media-first: screenshot, recording, or HTML mockup visible on frame 0
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { fadeIn } from '../utils/animations';
import { Particles } from '../components/Particles';
import { DemoMedia } from '../components/DemoMedia';

export const DemoScene = ({ scene, accentColor, topic }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const media = scene.media || {};
  const src = media.file || media.url;
  const captionOp = fadeIn(frame, fps * 0.5, fps * 1);

  const chapter = scene.chapter || null;
  const total = scene.chapterTotal || chapter;

  return (
    <AbsoluteFill style={{
      background: scene.bgColor || '#060810',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <Particles color={accentColor} count={10} seed={(scene.id || 1) * 23} />

      <AbsoluteFill style={{
        padding: '56px 48px 120px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {src && (
          <div style={{
            width: '100%',
            maxWidth: 1400,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            marginBottom: 12,
          }}>
            <div style={{
              width: '100%',
              borderRadius: 16,
              overflow: 'hidden',
              border: `3px solid ${accentColor}55`,
              boxShadow: `0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px ${accentColor}33`,
              background: '#111',
            }}>
              <div style={{
                background: `${accentColor}33`,
                padding: '8px 16px',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
                <span style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.65)',
                  fontFamily: 'monospace',
                }}>
                  {topic || scene.title}
                </span>
                {chapter && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    fontWeight: 800,
                    color: accentColor,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}>
                    Part {chapter}{total ? ` / ${total}` : ''}
                  </span>
                )}
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#fff',
                  opacity: 0.9,
                  flex: '1 1 100%',
                }}>
                  {scene.emoji ? `${scene.emoji} ` : ''}{scene.title}
                </span>
              </div>
              <DemoMedia media={media} />
            </div>
            {(media.caption || scene.body) && (
              <div style={{
                opacity: captionOp,
                marginTop: 12,
                fontSize: 22,
                color: 'rgba(255,255,255,0.75)',
                fontWeight: 600,
                maxWidth: 1200,
                lineHeight: 1.4,
                textAlign: 'center',
                alignSelf: 'center',
              }}>
                {media.caption || scene.body}
              </div>
            )}
          </div>
        )}

        {scene.keyword && (
          <div style={{
            background: `${accentColor}18`,
            border: `2px solid ${accentColor}80`,
            borderRadius: 12,
            padding: '8px 20px',
            fontSize: 20,
            fontWeight: 800,
            color: accentColor,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            {scene.keyword}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
