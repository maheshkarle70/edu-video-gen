// Slow scroll through HTML mockups — inline HTML (iframes go blank under CSS transforms)
import { useEffect, useState } from 'react';
import {
  continueRender,
  delayRender,
  interpolate,
  Easing,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { parseHtmlDocument } from '../utils/parseHtml';

const VIEWPORT_H = 520;
const CONTENT_H = 1280;
const SCROLL_HOLD_SEC = 0.4;
const SCROLL_MOVE_SEC = 8;

const MOCKUP_OVERRIDES = `
.html-mockup-root, .html-mockup-root * {
  animation: none !important;
  animation-delay: 0s !important;
  transition: none !important;
  opacity: 1 !important;
}
`;

export function ScrollingHtmlFrame({ src, htmlContent, htmlStyles }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [loaded, setLoaded] = useState(
    htmlContent ? { htmlContent, htmlStyles: htmlStyles || '' } : null,
  );

  useEffect(() => {
    if (htmlContent || !src) return undefined;

    const handle = delayRender(`Loading HTML mockup: ${src}`);
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => setLoaded(parseHtmlDocument(text)))
      .catch((err) => console.error('[ScrollingHtmlFrame]', err))
      .finally(() => continueRender(handle));

    return () => continueRender(handle);
  }, [src, htmlContent]);

  const scrollStart = Math.round(fps * SCROLL_HOLD_SEC);
  const scrollEnd = scrollStart + Math.round(fps * SCROLL_MOVE_SEC);
  const maxScroll = CONTENT_H - VIEWPORT_H;

  const scrollY = interpolate(
    frame,
    [scrollStart, scrollEnd],
    [0, -maxScroll],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.quad),
    },
  );

  if (!loaded?.htmlContent) {
    return (
      <div style={{
        width: '100%',
        height: VIEWPORT_H,
        background: '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.6)',
        fontSize: 16,
      }}>
        Loading mockup…
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: VIEWPORT_H,
        overflow: 'hidden',
        background: '#fff',
        position: 'relative',
      }}
    >
      <div
        style={{
          transform: `translateY(${scrollY}px)`,
          width: '100%',
          minHeight: CONTENT_H,
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `${loaded.htmlStyles}\n${MOCKUP_OVERRIDES}\n.html-mockup-root * { box-sizing: border-box; }`,
          }}
        />
        <div
          className="html-mockup-root"
          dangerouslySetInnerHTML={{ __html: loaded.htmlContent }}
          style={{ width: '100%', minHeight: CONTENT_H }}
        />
      </div>
    </div>
  );
}
