import { useCallback, useState } from 'react';
import { getRemotionEnvironment, Img, OffthreadVideo, Video, staticFile } from 'remotion';
import { ScrollingHtmlFrame } from './ScrollingHtmlFrame';

function mediaSrc(file) {
  if (!file) return null;
  if (/^(https?:|data:)/.test(file)) return file;
  if (typeof window !== 'undefined' && file.startsWith('/')) {
    if (file.startsWith('/uploads/') || file.startsWith('/output/') || file.startsWith('/mockups/') || file.startsWith('/_media-cache/')) {
      return `${window.location.origin}${file}`;
    }
    return null;
  }
  return staticFile(file);
}

const mediaStyle = {
  width: '100%',
  minHeight: 400,
  maxHeight: 520,
  objectFit: 'contain',
  display: 'block',
  background: '#1a1a1a',
};

function VideoFallback({ message }) {
  return (
    <div style={{
      ...mediaStyle,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'rgba(255,255,255,0.7)',
      fontSize: 18,
      padding: 24,
      textAlign: 'center',
      lineHeight: 1.5,
    }}>
      {message}
    </div>
  );
}

export function DemoMedia({ media }) {
  const src = mediaSrc(media.file || media.url);
  const [videoError, setVideoError] = useState(false);
  const onError = useCallback(() => setVideoError(true), []);

  if (!src) {
    return <VideoFallback message="No media file attached" />;
  }

  const { isPlayer } = getRemotionEnvironment();

  if (media.type === 'html') {
    return (
      <ScrollingHtmlFrame
        src={src}
        htmlContent={media.htmlContent}
        htmlStyles={media.htmlStyles}
      />
    );
  }

  if (media.type === 'video') {
    if (videoError) {
      return (
        <VideoFallback
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
