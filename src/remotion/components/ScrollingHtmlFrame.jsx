// Slow scroll through HTML mockups — inline HTML (iframes go blank under CSS transforms)
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  continueRender,
  delayRender,
  interpolate,
  Easing,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { parseHtmlDocument } from '../utils/parseHtml';

const SCROLL_HOLD_SEC = 0.2;
const SCROLL_FRACTION = 0.88;
const H_PAD = 28;

// Sized for phone viewing of 1080p YouTube — desktop looks large on purpose
const MOCKUP_OVERRIDES = `
.html-mockup-root, .html-mockup-root * {
  animation: none !important;
  animation-delay: 0s !important;
  transition: none !important;
  box-sizing: border-box !important;
  -webkit-font-smoothing: antialiased !important;
}
.html-mockup-root {
  opacity: 1 !important;
  /* Mobile-readable base: ~26–28px at 1080p */
  font-size: 26px !important;
  line-height: 1.4 !important;
  font-weight: 600 !important;
  letter-spacing: 0.01em !important;
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
  padding: 20px ${H_PAD}px 32px !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}
.html-mockup-root > * {
  margin-left: auto !important;
  margin-right: auto !important;
  max-width: min(1100px, 100%) !important;
  width: auto !important;
}
.html-mockup-root > section,
.html-mockup-root > main,
.html-mockup-root > .page,
.html-mockup-root > .container,
.html-mockup-root > .wrap,
.html-mockup-root > .wrapper,
.html-mockup-root > .content,
.html-mockup-root > .app,
.html-mockup-root > .layout {
  width: 100% !important;
  max-width: min(1100px, 100%) !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
}
/* Force readable hierarchy even when Claude used tiny px sizes */
.html-mockup-root h1 {
  font-size: 48px !important;
  line-height: 1.15 !important;
  font-weight: 800 !important;
  text-align: center !important;
  letter-spacing: -0.02em !important;
  margin: 0 0 16px !important;
}
.html-mockup-root h2 {
  font-size: 36px !important;
  line-height: 1.2 !important;
  font-weight: 800 !important;
  text-align: center !important;
  margin: 0 0 12px !important;
}
.html-mockup-root h3,
.html-mockup-root h4 {
  font-size: 28px !important;
  line-height: 1.25 !important;
  font-weight: 700 !important;
  margin: 0 0 10px !important;
}
.html-mockup-root p,
.html-mockup-root li,
.html-mockup-root td,
.html-mockup-root th,
.html-mockup-root label,
.html-mockup-root figcaption,
.html-mockup-root .desc,
.html-mockup-root .description,
.html-mockup-root .text,
.html-mockup-root .body,
.html-mockup-root .copy,
.html-mockup-root .caption,
.html-mockup-root .subtitle,
.html-mockup-root .muted,
.html-mockup-root .hint,
.html-mockup-root .meta,
.html-mockup-root .note {
  font-size: 24px !important;
  line-height: 1.4 !important;
  font-weight: 600 !important;
}
.html-mockup-root small,
.html-mockup-root .badge,
.html-mockup-root .pill,
.html-mockup-root .chip,
.html-mockup-root .tag,
.html-mockup-root .label {
  font-size: 18px !important;
  font-weight: 700 !important;
  line-height: 1.3 !important;
}
.html-mockup-root button,
.html-mockup-root .btn,
.html-mockup-root a.btn {
  font-size: 22px !important;
  font-weight: 700 !important;
}
/* Kill ultra-small absolute sizes Claude often emits */
.html-mockup-root [style*="font-size:1"],
.html-mockup-root [style*="font-size: 1"],
.html-mockup-root [style*="font-size:9"],
.html-mockup-root [style*="font-size: 9"],
.html-mockup-root [style*="font-size:10"],
.html-mockup-root [style*="font-size: 10"],
.html-mockup-root [style*="font-size:11"],
.html-mockup-root [style*="font-size: 11"],
.html-mockup-root [style*="font-size:12"],
.html-mockup-root [style*="font-size: 12"],
.html-mockup-root [style*="font-size:13"],
.html-mockup-root [style*="font-size: 13"],
.html-mockup-root [style*="font-size:14"],
.html-mockup-root [style*="font-size: 14"] {
  font-size: 22px !important;
}
.html-mockup-root img,
.html-mockup-root svg,
.html-mockup-root canvas,
.html-mockup-root video {
  max-width: 100% !important;
  height: auto !important;
  display: block !important;
  margin-left: auto !important;
  margin-right: auto !important;
}
.html-mockup-root table { width: 100% !important; max-width: 100% !important; }
.html-mockup-root .row,
.html-mockup-root .cols,
.html-mockup-root .columns,
.html-mockup-root .grid,
.html-mockup-root .flex,
.html-mockup-root .compare,
.html-mockup-root .vs-row {
  display: flex !important;
  flex-wrap: wrap !important;
  justify-content: center !important;
  align-items: stretch !important;
  gap: 20px !important;
  width: 100% !important;
  max-width: min(1100px, 100%) !important;
  margin-left: auto !important;
  margin-right: auto !important;
}
/* Soft contrast help for light-gray text on dark cards */
.html-mockup-root .muted,
.html-mockup-root .hint,
.html-mockup-root .meta,
.html-mockup-root .subtitle {
  opacity: 1 !important;
  color: #c5d0e0 !important;
}
`;

export function ScrollingHtmlFrame({ src, htmlContent, htmlStyles, maxHeight }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, height: compH } = useVideoConfig();
  const contentRef = useRef(null);
  const [contentH, setContentH] = useState(900);
  const [loaded, setLoaded] = useState(
    htmlContent ? { htmlContent, htmlStyles: htmlStyles || '' } : null,
  );

  const viewportH = Math.max(520, maxHeight || Math.round(compH * 0.72));

  useEffect(() => {
    if (htmlContent || !src) return undefined;

    const handle = delayRender(`Loading HTML mockup: ${src}`);
    let cancelled = false;
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setLoaded(parseHtmlDocument(text));
      })
      .catch((err) => console.error('[ScrollingHtmlFrame]', err))
      .finally(() => continueRender(handle));

    return () => {
      cancelled = true;
      continueRender(handle);
    };
  }, [src, htmlContent]);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const h = Math.max(el.scrollHeight || 0, el.offsetHeight || 0, 600);
    setContentH(h);
  }, [loaded?.htmlContent, frame]);

  const scrollStart = Math.round(fps * SCROLL_HOLD_SEC);
  const scrollEnd = Math.max(
    scrollStart + Math.round(fps * 4),
    Math.round(durationInFrames * SCROLL_FRACTION),
  );
  const maxScroll = Math.max(0, contentH - viewportH);

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
        height: viewportH,
        background: '#141820',
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
        height: viewportH,
        overflow: 'hidden',
        background: '#0f1419',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          transform: `translateY(${scrollY}px)`,
          width: '100%',
          maxWidth: 1200,
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `${loaded.htmlStyles}\n${MOCKUP_OVERRIDES}`,
          }}
        />
        <div
          ref={contentRef}
          className="html-mockup-root"
          dangerouslySetInnerHTML={{ __html: loaded.htmlContent }}
          style={{ width: '100%', minHeight: Math.min(700, viewportH) }}
        />
      </div>
    </div>
  );
}
