import { useCallback, useState } from 'react';
import { getRemotionEnvironment, Img, OffthreadVideo, Video, staticFile, useVideoConfig } from 'remotion';
import { ScrollingHtmlFrame } from './ScrollingHtmlFrame';

function mediaSrc(file, { isRendering = false } = {}) {
  if (!file) return null;
  if (/^(https?:|data:)/.test(file)) return file;
  if (file.startsWith('/Users/') || file.startsWith('/home/') || file.startsWith('/var/') || /^[A-Za-z]:\\/.test(file)) {
    return null;
  }
  if (typeof window !== 'undefined' && file.startsWith('/')) {
    if (
      file.startsWith('/uploads/')
      || file.startsWith('/output/')
      || file.startsWith('/mockups/')
      || file.startsWith('/_media-cache/')
    ) {
      if (isRendering) return null;
      return `${window.location.origin}${file}`;
    }
    return null;
  }
  return staticFile(file);
}

function VideoFallback({ message, height }) {
  return (
    <div style={{
      width: '100%',
      height: height || 520,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'rgba(255,255,255,0.7)',
      fontSize: 18,
      padding: 24,
      textAlign: 'center',
      lineHeight: 1.5,
      background: '#141820',
    }}>
      {message}
    </div>
  );
}

export function DemoMedia({ media, maxHeight }) {
  const { isPlayer, isRendering } = getRemotionEnvironment();
  const { height: compH } = useVideoConfig();
  const viewportH = Math.max(520, maxHeight || Math.round(compH * 0.72));
  const src = mediaSrc(media.file || media.url, { isRendering });
  const [videoError, setVideoError] = useState(false);
  const onError = useCallback(() => setVideoError(true), []);

  const mediaStyle = {
    width: '100%',
    height: viewportH,
    maxHeight: viewportH,
    objectFit: 'contain',
    display: 'block',
    background: '#141820',
  };

  if (media.type === 'html') {
    if (!media.htmlContent && !src) {
      return <VideoFallback message="HTML mockup missing — regenerate AI mockup" height={viewportH} />;
    }
    return (
      <ScrollingHtmlFrame
        src={src}
        htmlContent={media.htmlContent}
        htmlStyles={media.htmlStyles}
        maxHeight={viewportH}
      />
    );
  }

  if (!src) {
    return <VideoFallback message="No media file attached" height={viewportH} />;
  }

  if (media.type === 'video') {
    if (videoError) {
      return (
        <VideoFallback
          height={viewportH}
          message="Video could not play — re-upload as .mp4 or restart server (needs ffmpeg for .mov conversion)"
        />
      );
    }
    if (isPlayer) {
      return (
        <Video
          src={src}
          muted
          style={mediaStyle}
          onError={onError}
          crossOrigin="anonymous"
        />
      );
    }
    return <OffthreadVideo src={src} muted style={mediaStyle} />;
  }

  return <Img src={src} style={mediaStyle} onError={onError} />;
}
