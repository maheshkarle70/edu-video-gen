// Browser Remotion Player for pipeline preview (step 4)
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Player } from '@remotion/player';
import { EduVideo } from './EduVideo';
import { totalDurationFrames, capPreviewDurationSec } from './utils/timeline';

function calcDuration(scenes, fps = 30) {
  const capped = (scenes || []).map((s) => ({
    ...s,
    durationSec: capPreviewDurationSec(s),
  }));
  return totalDurationFrames(capped, fps);
}

export function mountPreviewPlayer(container, props, format = 'landscape') {
  const portrait = format === 'portrait';
  const width = portrait ? 1080 : 1920;
  const height = portrait ? 1920 : 1080;
  const root = createRoot(container);
  root.render(
    <Player
      component={EduVideo}
      inputProps={props}
      durationInFrames={calcDuration(props.scenes)}
      fps={30}
      compositionWidth={width}
      compositionHeight={height}
      controls
      autoPlay={false}
      style={{ width: '100%', maxHeight: '100%' }}
    />,
  );
  return root;
}

if (typeof window !== 'undefined') {
  window.mountPreviewPlayer = mountPreviewPlayer;
}
